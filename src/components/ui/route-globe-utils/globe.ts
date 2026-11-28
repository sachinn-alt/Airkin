import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import landAtlas from 'world-atlas/land-110m.json';

export type Vec3 = [number, number, number];

export interface GlobeView {
  cx: number;
  cy: number;
  r: number;
  yaw: number;
  tilt: number;
}

interface BBoxRing {
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
  points: number[][];
}

interface LandPolygon {
  outer: BBoxRing;
  holes: BBoxRing[];
}

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

let cachedLandPolygons: LandPolygon[] | null = null;
const dotCache = new Map<number, Vec3[]>();

function makeBBoxRing(ring: number[][]): BBoxRing {
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (let i = 0; i < ring.length; i++) {
    const [lon, lat] = ring[i];
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return { minLon, maxLon, minLat, maxLat, points: ring };
}

function getLandPolygons(): LandPolygon[] {
  if (cachedLandPolygons) return cachedLandPolygons;

  const topology = landAtlas as unknown as Topology<{ land: GeometryCollection }>;
  const geo = feature(topology, topology.objects.land) as unknown as {
    type: string;
    features?: Array<{ geometry: { type: string; coordinates: unknown } }>;
    geometry?: { type: string; coordinates: unknown };
  };

  const geometries: Array<{ type: string; coordinates: unknown }> = [];
  if (geo.type === 'FeatureCollection' && geo.features) {
    for (const f of geo.features) geometries.push(f.geometry);
  } else if (geo.geometry) {
    geometries.push(geo.geometry);
  }

  const polys: LandPolygon[] = [];
  for (const geom of geometries) {
    const rawPolys =
      geom.type === 'Polygon'
        ? [geom.coordinates as number[][][]]
        : geom.type === 'MultiPolygon'
          ? (geom.coordinates as number[][][][])
          : [];
    for (const rings of rawPolys) {
      if (!rings.length || rings[0].length < 3) continue;
      polys.push({
        outer: makeBBoxRing(rings[0]),
        holes: rings.slice(1).filter((h) => h.length >= 3).map(makeBBoxRing),
      });
    }
  }

  cachedLandPolygons = polys;
  return polys;
}

function pointInRing(lon: number, lat: number, ring: BBoxRing): boolean {
  if (
    lon < ring.minLon ||
    lon > ring.maxLon ||
    lat < ring.minLat ||
    lat > ring.maxLat
  ) {
    return false;
  }
  const pts = ring.points;
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0];
    const yi = pts[i][1];
    const xj = pts[j][0];
    const yj = pts[j][1];
    const intersects =
      yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function isLand(lon: number, lat: number, polys: LandPolygon[]): boolean {
  for (let i = 0; i < polys.length; i++) {
    const poly = polys[i];
    if (!pointInRing(lon, lat, poly.outer)) continue;
    let inHole = false;
    for (let h = 0; h < poly.holes.length; h++) {
      if (pointInRing(lon, lat, poly.holes[h])) {
        inHole = true;
        break;
      }
    }
    if (!inHole) return true;
  }
  return false;
}

export function toVec(lon: number, lat: number): Vec3 {
  const phi = lon * RAD;
  const theta = lat * RAD;
  const cosT = Math.cos(theta);
  return [cosT * Math.sin(phi), Math.sin(theta), cosT * Math.cos(phi)];
}

export function rotate(v: Vec3, yaw: number, tilt: number): Vec3 {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const x1 = v[0] * cy - v[2] * sy;
  const z1 = v[0] * sy + v[2] * cy;

  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  const y2 = v[1] * ct - z1 * st;
  const z2 = v[1] * st + z1 * ct;
  return [x1, y2, z2];
}

export function slerp(a: Vec3, b: Vec3, t: number): Vec3 {
  const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  if (dot > 0.9995) {
    const x = a[0] + (b[0] - a[0]) * t;
    const y = a[1] + (b[1] - a[1]) * t;
    const z = a[2] + (b[2] - a[2]) * t;
    const len = Math.hypot(x, y, z) || 1;
    return [x / len, y / len, z / len];
  }
  const omega = Math.acos(dot);
  const sinOmega = Math.sin(omega);
  const k0 = Math.sin((1 - t) * omega) / sinOmega;
  const k1 = Math.sin(t * omega) / sinOmega;
  return [a[0] * k0 + b[0] * k1, a[1] * k0 + b[1] * k1, a[2] * k0 + b[2] * k1];
}

export function landDots(count: number): Vec3[] {
  const cached = dotCache.get(count);
  if (cached) return cached;

  const polys = getLandPolygons();
  const dots: Vec3[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i++) {
    const y = 1 - ((2 * i + 1) / count);
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
    const angle = goldenAngle * i;
    const x = Math.cos(angle) * radiusAtY;
    const z = Math.sin(angle) * radiusAtY;

    const lat = Math.asin(y) * DEG;
    const lon = Math.atan2(x, z) * DEG;

    if (isLand(lon, lat, polys)) {
      dots.push([x, y, z]);
    }
  }

  dotCache.set(count, dots);
  return dots;
}

export function drawGlobe(
  ctx: CanvasRenderingContext2D,
  dots: Vec3[],
  view: GlobeView,
  color: string,
  dotRadius: number,
  glow: string
): void {
  const { cx, cy, r, yaw, tilt } = view;
  if (r <= 0) return;

  // Soft outer radial atmosphere glow
  const halo = ctx.createRadialGradient(cx, cy, r * 0.55, cx, cy, r * 1.24);
  halo.addColorStop(0, glow);
  halo.addColorStop(1, 'transparent');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.24, 0, Math.PI * 2);
  ctx.fill();

  // Subtle sphere limb outline
  ctx.save();
  ctx.strokeStyle = glow;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Front-hemisphere land dots
  ctx.fillStyle = color;
  const cyYaw = Math.cos(yaw);
  const syYaw = Math.sin(yaw);
  const ctTilt = Math.cos(tilt);
  const stTilt = Math.sin(tilt);

  for (let i = 0; i < dots.length; i++) {
    const v = dots[i];
    const x1 = v[0] * cyYaw - v[2] * syYaw;
    const z1 = v[0] * syYaw + v[2] * cyYaw;
    const y2 = v[1] * ctTilt - z1 * stTilt;
    const z2 = v[1] * stTilt + z1 * ctTilt;

    if (z2 <= 0) continue;

    ctx.globalAlpha = 0.22 + 0.78 * z2;
    ctx.beginPath();
    ctx.arc(cx + x1 * r, cy - y2 * r, dotRadius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
