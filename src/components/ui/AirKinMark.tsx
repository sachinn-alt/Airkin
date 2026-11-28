import { useId } from 'react';

interface AirKinMarkProps {
  className?: string;
}

/**
 * Minimal botanical leaf-and-breeze brand mark matching public/favicon.svg.
 */
export function AirKinMark({ className = 'h-8 w-8 rounded-xl shadow-xs' }: AirKinMarkProps) {
  const uid = useId().replace(/:/g, '');
  const bgId = `ak-bg-${uid}`;
  const leafId = `ak-leaf-${uid}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id={bgId} x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0f766e" />
          <stop offset="55%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
        <linearGradient id={leafId} x1="20" y1="16" x2="46" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#d1fae5" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${bgId})`} />
      <circle cx="48" cy="17" r="4.5" fill="#fde68a" opacity="0.92" />
      <path
        d="M44 20C32.5 20 23 27.2 21.5 38.5C29 37 36.2 32.5 40.5 26C38 33.8 30.8 40 21 42.5C29.5 46.8 42.5 42.5 45.2 29.8C46 26.2 45.6 22.8 44 20Z"
        fill={`url(#${leafId})`}
      />
      <path
        d="M15 47.5C22.5 47.5 28.5 45.5 35.5 43"
        stroke="#ffffff"
        strokeWidth="3.2"
        strokeLinecap="round"
        opacity="0.92"
      />
    </svg>
  );
}
