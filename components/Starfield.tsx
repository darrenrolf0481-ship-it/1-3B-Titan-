import { useEffect, useRef } from 'react';

// Optimization: Batch rendering by opacity buckets to reduce canvas draw calls and GC overhead.
// Instead of 200 fillStyle updates, beginPath calls, and fill calls per frame, stars are grouped
// into precomputed opacity buckets and drawn in ~12 batched fill calls.
const OPACITY_BUCKETS = 12;
const MIN_OPACITY = 0.05;
const MAX_OPACITY = 0.7;
const OPACITY_RANGE = MAX_OPACITY - MIN_OPACITY;

const PRECOMPUTED_FILL_STYLES = Array.from({ length: OPACITY_BUCKETS }, (_, i) => {
  const alpha = (MIN_OPACITY + ((i + 0.5) / OPACITY_BUCKETS) * OPACITY_RANGE).toFixed(3);
  return `rgba(200, 200, 255, ${alpha})`;
});

interface Star {
  x: number;
  y: number;
  r: number;
  o: number;
  s: number;
  direction: number;
}

export default function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const stars: Star[] = Array.from({ length: 200 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.2 + 0.2,
      o: Math.random() * 0.5 + 0.1,
      s: Math.random() * 0.002 + 0.0005,
      direction: Math.random() > 0.5 ? 1 : -1,
    }));

    // Pre-allocated bucket arrays to avoid per-frame GC allocations
    const buckets: Star[][] = Array.from({ length: OPACITY_BUCKETS }, () => []);

    const resize = () => {
      if (document.hidden) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      if (document.hidden) {
        requestAnimationFrame(animate);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Reset buckets without reallocating arrays
      for (let i = 0; i < OPACITY_BUCKETS; i++) {
        buckets[i].length = 0;
      }

      // Update positions and group stars by opacity bucket
      const cw = canvas.width;
      const ch = canvas.height;

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.o += s.s * s.direction;
        if (s.o <= MIN_OPACITY || s.o >= MAX_OPACITY) {
          s.direction *= -1;
        }

        const bIndex = Math.min(
          OPACITY_BUCKETS - 1,
          Math.max(0, Math.floor(((s.o - MIN_OPACITY) / OPACITY_RANGE) * OPACITY_BUCKETS))
        );
        buckets[bIndex].push(s);
      }

      // Batch draw operations per bucket (reduces fill calls from 200 to ~12 per frame)
      for (let i = 0; i < OPACITY_BUCKETS; i++) {
        const bucketStars = buckets[i];
        if (bucketStars.length === 0) continue;

        ctx.fillStyle = PRECOMPUTED_FILL_STYLES[i];
        ctx.beginPath();
        for (let j = 0; j < bucketStars.length; j++) {
          const s = bucketStars[j];
          const px = s.x * cw;
          const py = s.y * ch;
          ctx.moveTo(px + s.r, py);
          ctx.arc(px, py, s.r, 0, Math.PI * 2);
        }
        ctx.fill();
      }

      requestAnimationFrame(animate);
    };

    const animationId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="starfield"
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
}
