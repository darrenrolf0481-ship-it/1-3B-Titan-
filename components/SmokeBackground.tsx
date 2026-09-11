import { useEffect, useRef } from 'react';

/**
 * Performance Optimization (⚡ Bolt):
 * Replaced React state particle management (which triggered component re-renders every 2s
 * and scheduled individual setTimeout removals causing DOM thrashing) with HTML5 Canvas 2D.
 * Canvas rendering offloads particle animation to a single requestAnimationFrame loop, eliminating
 * React component re-renders, state management overhead, and DOM node creation/destruction entirely.
 */

interface SmokeParticle {
  x: number;
  y: number;
  radius: number;
  driftX: number;
  speedY: number;
  maxAlpha: number;
  life: number;
  maxLife: number;
}

export default function SmokeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const resize = () => {
      if (document.hidden) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    const particles: SmokeParticle[] = Array.from({ length: 12 }, () => ({
      x: Math.random() * (canvas.width || window.innerWidth),
      y: (canvas.height || window.innerHeight) * (0.2 + Math.random() * 0.9),
      radius: Math.random() * 100 + 100,
      driftX: (Math.random() - 0.5) * 0.5,
      speedY: Math.random() * 0.4 + 0.3,
      maxAlpha: Math.random() * 0.12 + 0.05,
      life: Math.random() * 600,
      maxLife: Math.random() * 400 + 600,
    }));

    const resetParticle = (p: SmokeParticle) => {
      p.x = Math.random() * canvas.width;
      p.y = canvas.height + p.radius;
      p.radius = Math.random() * 100 + 100;
      p.driftX = (Math.random() - 0.5) * 0.5;
      p.speedY = Math.random() * 0.4 + 0.3;
      p.maxAlpha = Math.random() * 0.12 + 0.05;
      p.life = 0;
      p.maxLife = Math.random() * 400 + 600;
    };

    const animate = () => {
      if (document.hidden) {
        animationFrameId = requestAnimationFrame(animate);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.life++;
        p.y -= p.speedY;
        p.x += p.driftX;

        // Calculate smooth opacity fade in and fade out
        const progress = p.life / p.maxLife;
        let alpha = 0;
        if (progress < 0.2) {
          alpha = p.maxAlpha * (progress / 0.2);
        } else if (progress > 0.7) {
          alpha = p.maxAlpha * (1 - (progress - 0.7) / 0.3);
        } else {
          alpha = p.maxAlpha;
        }

        if (progress >= 1 || p.y < -p.radius * 2) {
          resetParticle(p);
          continue;
        }

        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        gradient.addColorStop(0, `rgba(80, 60, 140, ${Math.max(0, alpha)})`);
        gradient.addColorStop(1, 'rgba(80, 60, 140, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-1 overflow-hidden"
    />
  );
}
