import { useEffect, useRef, useState, type ReactNode } from 'react';
import { animate, motion, useMotionValue } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

/**
 * Aceternity-inspired light SpotlightCard with subtle pointer-tracked tint (no neon).
 */
export function SpotlightCard({ children, className, contentClassName }: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0, active: false });

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      onPointerMove={(e) => {
        const rect = cardRef.current?.getBoundingClientRect();
        if (!rect) return;
        setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top, active: true });
      }}
      onPointerLeave={() => setPos((p) => ({ ...p, active: false }))}
      className={cn(
        'relative flex flex-col overflow-hidden rounded-2xl border border-white/80 bg-white/92 backdrop-blur-md shadow-md transition-shadow hover:shadow-lg',
        className
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-px rounded-2xl transition-opacity duration-300"
        style={{
          opacity: pos.active ? 1 : 0,
          background: `radial-gradient(280px circle at ${pos.x}px ${pos.y}px, rgba(15, 118, 110, 0.07), transparent 70%)`,
        }}
      />
      <div className={cn('relative z-10 flex-1 flex flex-col', contentClassName)}>
        {children}
      </div>
    </motion.div>
  );
}

interface AnimatedCounterProps {
  value: number;
  decimals?: number;
  suffix?: string;
  className?: string;
}

export function AnimatedCounter({
  value,
  decimals = 0,
  suffix = '',
  className,
}: AnimatedCounterProps) {
  const motionVal = useMotionValue(value);
  const [display, setDisplay] = useState(() =>
    decimals > 0 ? value.toFixed(decimals) : Math.round(value).toLocaleString()
  );

  useEffect(() => {
    const controls = animate(motionVal, value, {
      duration: 0.45,
      ease: 'easeOut',
      onUpdate: (latest) => {
        setDisplay(
          decimals > 0 ? latest.toFixed(decimals) : Math.round(latest).toLocaleString()
        );
      },
    });
    return () => controls.stop();
  }, [value, decimals, motionVal]);

  return (
    <span className={className}>
      {display}
      {suffix}
    </span>
  );
}

interface AqiGaugeRingProps {
  aqi: number;
  label: string;
  colorToken: 'emerald' | 'amber' | 'orange' | 'red' | 'purple' | 'rose';
}

const RING_STROKES: Record<AqiGaugeRingProps['colorToken'], string> = {
  emerald: '#047857',
  amber: '#b45309',
  orange: '#c2410c',
  red: '#b91c1c',
  purple: '#6d28d9',
  rose: '#be123c',
};

export function AqiGaugeRing({ aqi, label, colorToken }: AqiGaugeRingProps) {
  const size = 92;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const progress = Math.min(1, Math.max(0.05, aqi / 350));
  const dashOffset = circ * (1 - progress);

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={RING_STROKES[colorToken]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-extrabold tracking-tight text-slate-900 leading-none">
          <AnimatedCounter value={aqi} />
        </span>
        <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
          {label.split(' ')[0]}
        </span>
      </div>
    </div>
  );
}
