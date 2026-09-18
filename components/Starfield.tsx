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

    let lastFrameTime = 0;
    const targetFps = 30;
    const frameInterval = 1000 / targetFps;

    const animate = (timestamp: number) => {
      animationId = requestAnimationFrame(animate);

      if (document.hidden) return;

      // Throttle render loop to ~30 FPS to reduce GPU/CPU usage for subtle background ambient animation
      const elapsed = timestamp - lastFrameTime;
      if (elapsed < frameInterval) return;
      lastFrameTime = timestamp - (elapsed % frameInterval);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Group stars into discrete alpha buckets (quantized to 0.05 step)
      // Batch rendering reduces draw calls from 200/frame to ~13/frame and eliminates 200 string allocations/frame
      const buckets: Map<number, typeof stars> = new Map();

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.o += s.s * s.direction;
        if (s.o <= 0.05 || s.o >= 0.7) {
          s.direction *= -1;
        }

        // Quantize opacity to 2 decimal places (step 0.05)
        const quantizedAlpha = Math.round(s.o * 20) / 20;
        let bucket = buckets.get(quantizedAlpha);
        if (!bucket) {
          bucket = [];
          buckets.set(quantizedAlpha, bucket);
        }
        bucket.push(s);
      }

      const width = canvas.width;
      const height = canvas.height;

      buckets.forEach((bucketStars, alpha) => {
        ctx.fillStyle = `rgba(200, 200, 255, ${alpha})`;
        ctx.beginPath();
        for (let i = 0; i < bucketStars.length; i++) {
          const s = bucketStars[i];
          const x = s.x * width;
          const y = s.y * height;
          ctx.moveTo(x + s.r, y);
          ctx.arc(x, y, s.r, 0, Math.PI * 2);
        }
        ctx.fill();
      });
    };

    let animationId = requestAnimationFrame(animate);

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
