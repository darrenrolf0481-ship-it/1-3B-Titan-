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

    // Pre-allocated buckets for 14 opacity levels (0.05..0.70) to avoid GC allocations in render loop
    const buckets: (typeof stars)[] = Array.from({ length: 14 }, () => []);

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

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // PERFORMANCE OPTIMIZATION: Group stars into pre-allocated opacity buckets.
      // Instead of 200 individual beginPath/fillStyle/fill calls per frame or allocating Maps/arrays per frame,
      // using fixed bucket slots eliminates GC pressure and reduces canvas draw calls from 200 to ~14.
      // Reset bucket counts without reallocating memory.
      for (let i = 0; i < buckets.length; i++) {
        buckets[i].length = 0;
      }

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.o += s.s * s.direction;
        if (s.o <= 0.05 || s.o >= 0.7) {
          s.direction *= -1;
        }

        // Quantize opacity to 0.05 step index (0 to 13 corresponding to 0.05..0.70)
        const bucketIdx = Math.min(13, Math.max(0, Math.round((s.o - 0.05) / 0.05)));
        buckets[bucketIdx].push(s);
      }

      for (let b = 0; b < buckets.length; b++) {
        const group = buckets[b];
        if (group.length === 0) continue;

        const opacity = (0.05 + b * 0.05).toFixed(2);
        ctx.beginPath();
        for (let i = 0; i < group.length; i++) {
          const s = group[i];
          const cx = s.x * w;
          const cy = s.y * h;
          ctx.moveTo(cx + s.r, cy);
          ctx.arc(cx, cy, s.r, 0, Math.PI * 2);
        }
        ctx.fillStyle = `rgba(200, 200, 255, ${opacity})`;
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
