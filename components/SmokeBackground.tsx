import { useMemo } from 'react';

interface SmokeParticle {
  id: number;
  left: number;
  drift: number;
  duration: number;
  size: number;
  delay: number;
}

// Optimization: Replace timer-based React state updates with a fixed set of CSS infinite-loop animated particles.
// Previous implementation ran setInterval every 2s, creating/destroying DOM elements and triggering React re-renders.
// This static pool of particles eliminates state updates, GC pressure, and component re-renders completely while keeping the same animation.
export default function SmokeBackground() {
  const particles = useMemo<SmokeParticle[]>(() => {
    const count = 10;
    return Array.from({ length: count }, (_, i) => {
      const duration = 12 + (i * 1.5) % 10; // staggered durations between 12s and 22s
      return {
        id: i,
        left: (i * 10 + Math.sin(i) * 5) % 100,
        drift: ((i % 2 === 0 ? 1 : -1) * (30 + (i * 17) % 60)),
        duration,
        size: 150 + (i * 25) % 150,
        delay: -(i * (duration / count)), // evenly staggered negative delay for instant seamless animation loop
      };
    });
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-1 overflow-hidden">
      {particles.map((p) => (
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
            animationIterationCount: 'infinite',
            // @ts-ignore
            '--drift': `${p.drift}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
