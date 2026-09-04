import { useEffect, useState } from 'react';

interface SmokeParticle {
  id: number;
  left: number;
  drift: number;
  duration: number;
  size: number;
  delay: number;
}

interface SmokeParticleWithTimestamp extends SmokeParticle {
  createdAt: number;
}

export default function SmokeBackground() {
  const [particles, setParticles] = useState<SmokeParticleWithTimestamp[]>([]);

  useEffect(() => {
    // Helper to generate particle data
    const createParticleData = (isInitial = false): SmokeParticleWithTimestamp => {
      const duration = Math.random() * 12 + 10;
      return {
        id: Math.random(),
        left: Math.random() * 100,
        drift: (Math.random() - 0.5) * 120,
        duration,
        size: Math.random() * 200 + 100,
        delay: isInitial ? Math.random() * -duration : 0,
        createdAt: Date.now(),
      };
    };

    // Performance Optimization: Batch initial particles into a single state update on mount
    // to prevent 8 separate synchronous re-renders and eliminate multiple concurrent setTimeout timers.
    const initialParticles = Array.from({ length: 8 }, () => createParticleData(true));
    setParticles(initialParticles);

    // Periodically spawn new particles and prune expired ones in a single interval callback
    const interval = setInterval(() => {
      if (document.hidden) return;

      const now = Date.now();
      const newParticle = createParticleData(false);

      setParticles((prev) => {
        // Filter out expired particles based on their duration and initial negative delay offset
        const active = prev.filter(
          (p) => now - p.createdAt < (p.duration + p.delay) * 1000
        );
        return [...active, newParticle];
      });
    }, 2000);

    return () => clearInterval(interval);
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
