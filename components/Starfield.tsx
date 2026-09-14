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
      if (document.hidden) {
        animationId = requestAnimationFrame(animate);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Set static fill color once per frame outside the loop to avoid string allocations
      ctx.fillStyle = 'rgb(200, 200, 255)';

      stars.forEach((s) => {
        s.o += s.s * s.direction;
        if (s.o <= 0.05 || s.o >= 0.7) {
          s.direction *= -1;
        }
        // Use globalAlpha to avoid ~12,000 string allocations/sec from rgba() template strings
        ctx.globalAlpha = s.o;
        ctx.beginPath();
        ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Update active animation ID so cancelAnimationFrame cleans up properly on unmount
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

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
