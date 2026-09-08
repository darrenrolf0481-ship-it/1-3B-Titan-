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

    let animationId: number;

    const animate = () => {
      if (document.hidden) return;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Performance Optimization: Set fillStyle ONCE outside the star loop and use
      // globalAlpha instead of string interpolation `rgba(200, 200, 255, ${s.o})`.
      // This eliminates ~12,000 string allocations per second at 60 FPS and reduces GC pressure.
      ctx.fillStyle = 'rgb(200, 200, 255)';

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.o += s.s * s.direction;
        if (s.o <= 0.05 || s.o >= 0.7) {
          s.direction *= -1;
        }
        ctx.globalAlpha = s.o;
        ctx.beginPath();
        ctx.arc(s.x * width, s.y * height, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      animationId = requestAnimationFrame(animate);
    };

    // Performance Optimization: Completely stop requestAnimationFrame when tab is hidden,
    // rather than endlessly queuing requestAnimationFrame callbacks on background tabs.
    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationId);
      } else {
        resize();
        animationId = requestAnimationFrame(animate);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    animationId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
