import { useEffect, useRef } from 'react';

export default function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const stars = Array.from({ length: 200 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.2 + 0.2,
      o: Math.random() * 0.5 + 0.1,
      s: Math.random() * 0.002 + 0.0005,
      direction: Math.random() > 0.5 ? 1 : -1,
    }));

    const resize = () => {
      if (document.hidden) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    // OPTIMIZATION: Pre-allocate opacity buckets and color strings to eliminate
    // 200 per-frame string allocations and batch canvas draw calls from 200 down to <= 10.
    const NUM_BUCKETS = 10;
    const BUCKET_COLORS = Array.from({ length: NUM_BUCKETS }, (_, i) => {
      const opacity = (0.05 + (i / (NUM_BUCKETS - 1)) * 0.65).toFixed(2);
      return `rgba(200, 200, 255, ${opacity})`;
    });

    // Reusable bucket array to prevent per-frame garbage collection
    const buckets: typeof stars[] = Array.from({ length: NUM_BUCKETS }, () => []);

    const animate = () => {
      if (document.hidden) {
        requestAnimationFrame(animate);
        return;
      }

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Clear previous frame buckets without re-allocating arrays
      for (let i = 0; i < NUM_BUCKETS; i++) {
        buckets[i].length = 0;
      }

      // Update positions and assign stars to pre-calculated opacity buckets
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.o += s.s * s.direction;
        if (s.o <= 0.05 || s.o >= 0.7) {
          s.direction *= -1;
        }
        const bucketIdx = Math.min(
          NUM_BUCKETS - 1,
          Math.max(0, Math.floor(((s.o - 0.05) / 0.65) * NUM_BUCKETS))
        );
        buckets[bucketIdx].push(s);
      }

      // Batch render stars per bucket: 1 beginPath + fill call per bucket instead of per star
      for (let b = 0; b < NUM_BUCKETS; b++) {
        const group = buckets[b];
        if (group.length === 0) continue;

        ctx.fillStyle = BUCKET_COLORS[b];
        ctx.beginPath();
        for (let i = 0; i < group.length; i++) {
          const s = group[i];
          const cx = s.x * width;
          const cy = s.y * height;
          // Move to the edge of the circle to prevent implicit connecting lines between arcs in a single path
          ctx.moveTo(cx + s.r, cy);
          ctx.arc(cx, cy, s.r, 0, Math.PI * 2);
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
