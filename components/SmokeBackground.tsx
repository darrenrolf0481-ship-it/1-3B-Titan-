interface SmokeParticle {
  id: number;
  left: number;
  drift: number;
  duration: number;
  size: number;
  delay: number;
}

// ⚡ OPTIMIZATION: Static particle pool with CSS infinite loop animation.
// Replaces dynamic setInterval/setTimeout state churn (which previously caused
// continuous React re-renders every 1-2s and memory leaks on unmount) with hardware-accelerated
// CSS keyframe loops on the compositor thread (0 React re-renders, 0 JS timers).
const STATIC_SMOKE_PARTICLES: SmokeParticle[] = [
  { id: 1, left: 12, drift: 45, duration: 18, size: 220, delay: -2 },
  { id: 2, left: 28, drift: -30, duration: 14, size: 180, delay: -8 },
  { id: 3, left: 42, drift: 55, duration: 20, size: 260, delay: -12 },
  { id: 4, left: 58, drift: -40, duration: 16, size: 150, delay: -5 },
  { id: 5, left: 71, drift: 35, duration: 22, size: 240, delay: -15 },
  { id: 6, left: 85, drift: -50, duration: 15, size: 190, delay: -3 },
  { id: 7, left: 20, drift: -25, duration: 19, size: 210, delay: -10 },
  { id: 8, left: 78, drift: 40, duration: 17, size: 230, delay: -17 },
];

export default function SmokeBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-1 overflow-hidden">
      {STATIC_SMOKE_PARTICLES.map((p) => (
        <div
          key={p.id}
          className="absolute bottom-[-100px] rounded-full blur-[20px] animate-smoke"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: 'radial-gradient(ellipse, rgba(80, 60, 140, 0.12) 0%, transparent 70%)',
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            // @ts-ignore
            '--drift': `${p.drift}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
