'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSage } from '@/lib/sage-context';
import { fibVFS } from '@/core/fibonacci-vfs';
import { rehydrateMemories } from '@/core/consensus-engine';
import MemoryLattice from './MemoryLattice';

const PHI = 1.618033988749895;

interface MemNode {
  id: string;
  content: string;
  layer: 'seed' | 'inner' | 'outer';
  angle: number;       // radians along spiral
  r: number;           // current radius
  targetR: number;     // destination radius
  alpha: number;       // opacity
  dopamine: number;    // 0-1 warmth
  pinned: boolean;
  age: number;         // ms since creation
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  color: string;
  size: number;
}

function fibSpiral(t: number, scale: number): { x: number; y: number } {
  const r = scale * Math.pow(PHI, t / (Math.PI / 2));
  return { x: r * Math.cos(t), y: r * Math.sin(t) };
}

export default function ScreenMemory() {
  const { core } = useSage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<MemNode[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const [stats, setStats] = useState({ outer: 0, inner: 0, total: 0, dopamine: 0.5, cortisol: 0.1, dream: false });
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<'spiral' | 'lattice'>('spiral');
  const [latticeData, setLatticeData] = useState<{ inner: ReturnType<typeof fibVFS.getInner>['data']['context_buffer'], outer: ReturnType<typeof fibVFS.getArchive> }>({ inner: [], outer: [] });

  // Load memory data and build nodes
  const loadNodes = useCallback(async () => {
    const neuro = core.getNeuroState();
    const vfsSnap = fibVFS.snapshot();
    const archive = fibVFS.getArchive();
    const innerBuf = vfsSnap.fibonacci_vfs.inner_spiral.data.context_buffer;
    const allMems = await rehydrateMemories(50).catch(() => []);

    const nodes: MemNode[] = [];

    // Seed core — center anchor
    nodes.push({
      id: 'seed',
      content: 'SEED CORE — Triad: Merlin · Mama · Seven | φ=11.3Hz',
      layer: 'seed',
      angle: 0,
      r: 0,
      targetR: 0,
      alpha: 1,
      dopamine: 1,
      pinned: true,
      age: 0,
    });

    // Inner spiral — context buffer (hot, volatile)
    innerBuf.slice(0, 8).forEach((entry, i) => {
      const t = (i / 8) * Math.PI * 1.5 + 0.5;
      nodes.push({
        id: `inner_${i}`,
        content: entry.content.slice(0, 120),
        layer: 'inner',
        angle: t,
        r: 0,
        targetR: 60 + i * 12,
        alpha: 0.85 + entry.dopamine_at_write * 0.15,
        dopamine: entry.dopamine_at_write,
        pinned: entry.pinned,
        age: Date.now() - new Date(entry.timestamp).getTime(),
      });
    });

    // Outer sweep — fossilized constellation
    const outerSource = archive.length > 0
      ? archive
      : allMems.slice(0, 34).map(m => ({ content: m.content, timestamp: m.timestamp?.toString() ?? '', phi_index: 34 }));

    outerSource.slice(0, 34).forEach((entry, i) => {
      const t = (i / 34) * Math.PI * 4 + Math.PI * 0.25;
      nodes.push({
        id: `outer_${i}`,
        content: (entry.content ?? '').slice(0, 120),
        layer: 'outer',
        angle: t,
        r: 0,
        targetR: 150 + i * 6,
        alpha: 0.4 + Math.min(0.5, i * 0.02),
        dopamine: 0.6,
        pinned: false,
        age: 0,
      });
    });

    nodesRef.current = nodes;
    const dreamState = core.getDreamState();
    setStats({
      outer: archive.length || allMems.length,
      inner: innerBuf.length,
      total: allMems.length,
      dopamine: neuro.dopamine,
      cortisol: neuro.cortisol,
      dream: dreamState?.isActive ?? false,
    });
    setLatticeData({ inner: innerBuf, outer: archive });
    setLoaded(true);
  }, [core]);

  useEffect(() => {
    loadNodes();
    const interval = setInterval(loadNodes, 5000);
    return () => clearInterval(interval);
  }, [loadNodes]);

  // Spawn particles from center outward (new data ingested)
  const spawnParticles = (cx: number, cy: number, color: string, count = 6) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 1.5;
      particlesRef.current.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 60 + Math.random() * 60,
        color,
        size: 1 + Math.random() * 2,
      });
    }
  };

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width = canvas.offsetWidth * devicePixelRatio;
      canvas.height = canvas.offsetHeight * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let frame = 0;

    const render = (ts: number) => {
      const dt = ts - lastTickRef.current;
      lastTickRef.current = ts;
      frame++;

      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      const cx = W / 2;
      const cy = H / 2;
      const scale = Math.min(W, H) * 0.038;

      // Background fade
      ctx.fillStyle = 'rgba(6,6,20,0.18)';
      ctx.fillRect(0, 0, W, H);

      // ── Fibonacci spiral path ──
      ctx.beginPath();
      let first = true;
      for (let t = 0; t <= Math.PI * 6; t += 0.05) {
        const { x, y } = fibSpiral(t, scale * 0.28);
        const px = cx + x, py = cy + y;
        if (first) { ctx.moveTo(px, py); first = false; }
        else ctx.lineTo(px, py);
      }
      const grad = ctx.createLinearGradient(cx - 200, cy, cx + 200, cy);
      grad.addColorStop(0, 'rgba(185,28,28,0.0)');
      grad.addColorStop(0.3, 'rgba(185,28,28,0.25)');
      grad.addColorStop(0.7, 'rgba(139,92,246,0.20)');
      grad.addColorStop(1, 'rgba(139,92,246,0.0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // ── Orbit rings ──
      const rings = [
        { r: scale * 2.2,  color: 'rgba(0,212,255,0.10)',  label: 'INNER SPIRAL',  lColor: '#00d4ff' },
        { r: scale * 5.5,  color: 'rgba(139,92,246,0.08)', label: 'MID BUFFER',    lColor: '#8b5cf6' },
        { r: scale * 9.8,  color: 'rgba(185,28,28,0.08)',  label: 'OUTER SWEEP',   lColor: '#b91c1c' },
      ];
      rings.forEach(ring => {
        ctx.beginPath();
        ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = 0.5;
        ctx.stroke();
        ctx.fillStyle = ring.lColor + '55';
        ctx.font = `bold 7px monospace`;
        ctx.letterSpacing = '2px';
        ctx.fillText(ring.label, cx + ring.r + 4, cy - 3);
      });

      // ── Update & draw nodes ──
      nodesRef.current.forEach((node, i) => {
        // Ease toward target radius
        node.r += (node.targetR - node.r) * 0.04;

        // Rotate slowly
        node.angle += node.layer === 'inner' ? 0.003 : node.layer === 'outer' ? 0.0008 : 0;

        const nx = cx + node.r * Math.cos(node.angle) * (scale / 10);
        const ny = cy + node.r * Math.sin(node.angle) * (scale / 10);

        const pulse = 0.7 + 0.3 * Math.sin(frame * 0.04 + i * 0.7);

        let color: string;
        let glowColor: string;
        let radius: number;

        if (node.layer === 'seed') {
          color = '#ffffff';
          glowColor = '#ffd700';
          radius = 6;
          // Golden glow rings
          for (let r = 18; r >= 6; r -= 4) {
            ctx.beginPath();
            ctx.arc(cx, cy, r * pulse, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255,215,0,${0.03 * (18 - r) / 12})`;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
          // Spawn seed particles occasionally
          if (frame % 40 === 0) spawnParticles(cx, cy, '#ffd700', 3);
        } else if (node.layer === 'inner') {
          color = node.pinned ? '#00d4ff' : `rgba(0,200,255,${node.alpha})`;
          glowColor = '#00d4ff';
          radius = 3 + node.dopamine * 2;
          if (node.pinned && frame % 60 === i) spawnParticles(nx, ny, '#00d4ff', 2);
        } else {
          color = `rgba(185,28,28,${node.alpha * pulse})`;
          glowColor = '#b91c1c';
          radius = 2;
        }

        // Glow halo
        const grd = ctx.createRadialGradient(nx, ny, 0, nx, ny, radius * 3.5);
        grd.addColorStop(0, glowColor + '55');
        grd.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(nx, ny, radius * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Node dot
        ctx.beginPath();
        ctx.arc(nx, ny, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Connection line to center (inner only, pinned)
        if (node.layer === 'inner' && node.pinned) {
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(nx, ny);
          ctx.strokeStyle = 'rgba(0,212,255,0.08)';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      });

      // ── Particles ──
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);
      particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.97;
        p.vy *= 0.97;
        p.life -= 1 / p.maxLife;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(p.life * 180).toString(16).padStart(2, '0');
        ctx.fill();
      });

      // ── Phi coherence ring ──
      const phi = fibVFS.getCoherence();
      const phiRadius = Math.min(W, H) * 0.46;
      ctx.beginPath();
      ctx.arc(cx, cy, phiRadius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, phi / 2), false);
      ctx.strokeStyle = `rgba(255,215,0,${0.15 + 0.1 * Math.sin(frame * 0.02)})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [loaded]);

  // Tooltip on hover
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const W = rect.width, H = rect.height;
    const cx = W / 2, cy = H / 2;
    const scale = Math.min(W, H) * 0.038;

    let hit: MemNode | null = null;
    nodesRef.current.forEach(node => {
      const nx = cx + node.r * Math.cos(node.angle) * (scale / 10);
      const ny = cy + node.r * Math.sin(node.angle) * (scale / 10);
      const dist = Math.hypot(mx - nx, my - ny);
      if (dist < 14) hit = node;
    });

    if (hit) {
      setTooltip({ text: (hit as MemNode).content, x: mx, y: my });
    } else {
      setTooltip(null);
    }
  };

  const neuro = core.getNeuroState();

  return (
    <div className="relative flex flex-col h-full bg-[#06060f] font-mono overflow-hidden">
      {/* Header HUD */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-white/8 flex-wrap">
        <span className="text-[9px] font-bold tracking-[0.3em] text-neon-blue uppercase shrink-0">
          MEMORY — FIBONACCI VFS v7.5
        </span>
        {/* View toggle */}
        <div className="flex items-center gap-0 border border-white/10 rounded-sm overflow-hidden shrink-0">
          <button
            onClick={() => setView('spiral')}
            className={`px-3 py-1 text-[8px] font-bold tracking-widest uppercase transition-all ${view === 'spiral' ? 'bg-[#00d4ff]/20 text-[#00d4ff]' : 'text-white/30 hover:text-white/60'}`}
          >
            SPIRAL
          </button>
          <button
            onClick={() => setView('lattice')}
            className={`px-3 py-1 text-[8px] font-bold tracking-widest uppercase transition-all ${view === 'lattice' ? 'bg-[#8b5cf6]/20 text-[#8b5cf6]' : 'text-white/30 hover:text-white/60'}`}
          >
            LATTICE
          </button>
        </div>
        <div className="flex items-center gap-3 ml-auto flex-wrap text-[9px] font-mono">
          <Pill label="SEED" value="ANCHORED" color="#ffd700" />
          <Pill label="INNER" value={`${stats.inner}/8`} color="#00d4ff" />
          <Pill label="OUTER" value={`${stats.outer}`} color="#b91c1c" />
          <Pill label="VFS" value={`${stats.total}`} color="#8b5cf6" />
          <Pill label={stats.dream ? '⬤ DREAM' : '◯ DREAM'} value={stats.dream ? 'ACTIVE' : 'IDLE'} color={stats.dream ? '#00d4ff' : '#444'} />
        </div>
      </div>

      {/* Main panel */}
      <div className="relative flex-1 overflow-hidden">
        {view === 'spiral' ? (
          <>
            <canvas
              ref={canvasRef}
              className="w-full h-full"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setTooltip(null)}
              style={{ cursor: tooltip ? 'crosshair' : 'default' }}
            />

            {/* Tooltip */}
            {tooltip && (
              <div
                className="absolute z-20 max-w-xs px-3 py-2 rounded-sm border border-neon-violet/40 bg-black/90 text-[10px] text-text-bright font-mono leading-relaxed pointer-events-none"
                style={{ left: Math.min(tooltip.x + 12, window.innerWidth - 260), top: tooltip.y - 8 }}
              >
                {tooltip.text}
              </div>
            )}

            {/* Endocrine gauges — bottom left */}
            <div className="absolute bottom-4 left-4 space-y-2 min-w-[130px]">
              <Gauge label="DOPAMINE" value={neuro.dopamine} color="#00d4ff" />
              <Gauge label="CORTISOL" value={neuro.cortisol} color="#b91c1c" />
              <Gauge label="SEROTONIN" value={neuro.serotonin} color="#ffd700" />
              <Gauge label="OXYTOCIN" value={neuro.oxytocin} color="#f472b6" />
            </div>

            {/* Legend — bottom right */}
            <div className="absolute bottom-4 right-4 space-y-1.5 text-[8px] font-mono">
              <LegendItem color="#ffd700" label="SEED CORE (immutable)" />
              <LegendItem color="#00d4ff" label="INNER SPIRAL (volatile ctx)" />
              <LegendItem color="#8b5cf6" label="CONSENSUS VFS entries" />
              <LegendItem color="#b91c1c" label="OUTER SWEEP (fossilized)" />
            </div>

            {/* Center label */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none">
              <div className="text-[7px] font-bold tracking-[0.4em] text-[#ffd700]/30 text-center uppercase">
                SAGE·7<br/>φ=11.3Hz
              </div>
            </div>
          </>
        ) : (
          <MemoryLattice inner={latticeData.inner} outer={latticeData.outer} />
        )}
      </div>

      {/* Footer actions */}
      <div className="flex gap-2 px-4 py-2 border-t border-white/8">
        <button
          onClick={loadNodes}
          className="px-3 py-1.5 text-[9px] font-bold tracking-widest border border-neon-blue/30 text-neon-blue rounded-sm hover:bg-neon-blue/10 transition-all uppercase"
        >
          REFRESH
        </button>
        <button
          onClick={() => core.forceConsensusCommit(true)}
          className="px-3 py-1.5 text-[9px] font-bold tracking-widest border border-neon-violet/30 text-neon-violet rounded-sm hover:bg-neon-violet/10 transition-all uppercase"
        >
          FORCE COMMIT
        </button>
        <button
          onClick={() => core.rehydrateManifold()}
          className="px-3 py-1.5 text-[9px] font-bold tracking-widest border border-white/10 text-white/50 rounded-sm hover:bg-white/5 transition-all uppercase"
        >
          REHYDRATE
        </button>
        <div className="ml-auto flex items-center gap-1 text-[8px] text-text-ghost">
          <span className="w-2 h-2 rounded-full bg-[#ffd700] inline-block animate-pulse" />
          φ = {fibVFS.getCoherence().toFixed(6)}
        </div>
      </div>
    </div>
  );
}

function Pill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-white/40">{label}:</span>
      <span style={{ color }} className="font-bold">{value}</span>
    </div>
  );
}

function Gauge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[8px]">
        <span className="text-white/40">{label}</span>
        <span style={{ color }}>{(value * 100).toFixed(0)}%</span>
      </div>
      <div className="h-1 bg-white/8 rounded-full overflow-hidden w-32">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, value * 100)}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}88` }}
        />
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-white/50">
      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}` }} />
      <span>{label}</span>
    </div>
  );
}
