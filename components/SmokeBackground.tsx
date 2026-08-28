import { useMemo } from 'react';

interface SmokeParticle {
  id: number;
  left: number;
  drift: number;
  duration: number;
  size: number;
  delay: number;
}

const PARTICLE_COUNT = 10;

/**
 * Performance Optimization:
 * Instead of dynamically creating particles with setInterval/setTimeout state updates every 2s
 * (which causes continuous main-thread JS execution, timer leaks, and React re-renders),
 * we generate a static memoized set of particles with staggered negative animation delays.
 * Pure CSS keyframe animation (`animate-smoke`) handles the infinite looping off the main JS thread.
 */
export default function SmokeBackground() {
  const particles = useMemo<SmokeParticle[]>(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const duration = 10 + (i * 1.5) % 12; // Durations between 10s and 22s
      return {
        id: i,
        left: (i * 10 + 5) % 100, // Uniform distribution across screen width
        drift: (i % 2 === 0 ? 1 : -1) * (30 + (i * 15) % 60),
        duration,
        size: 100 + (i * 20) % 200,
        delay: -(i * (duration / PARTICLE_COUNT)), // Staggered negative delays for seamless initial state
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
            // @ts-ignore
            '--drift': `${p.drift}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
