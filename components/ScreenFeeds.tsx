import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ScanEye, Wifi, WifiOff } from 'lucide-react';

const VISION_SERVER = 'http://localhost:8765';
const AUTO_SCAN_COOLDOWN_MS = 30_000; // min gap between motion-triggered scans
const MOTION_CHECK_EVERY_N_FRAMES = 10;
const MOTION_PIXEL_STRIDE = 8; // sample every Nth pixel when diffing frames
const MOTION_PIXEL_DELTA = 25; // luminance change (0-255) for a pixel to count as "moved"
const MOTION_AREA_FRACTION = 0.02; // fraction of moved pixels that counts as motion

// ---- Vision server status hook ----
function useVisionServer() {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [models, setModels] = useState<string[]>([]);

  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch(`${VISION_SERVER}/health`, { signal: AbortSignal.timeout(3000) });
        const data = await r.json();
        setStatus(data.ollama === 'connected' ? 'online' : 'offline');
        setModels(data.models ?? []);
      } catch {
        setStatus('offline');
      }
    };
    check();
    const id = setInterval(check, 15000);
    return () => clearInterval(id);
  }, []);

  return { status, models };
}

export default function ScreenFeeds() {
  const { status, models } = useVisionServer();
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  const autoModel = models.find(m =>
    m.includes('llava') || m.includes('gemma3') || m.includes('vision') || m.includes('moondream')
  ) ?? models[0] ?? 'llava';
  const visionModel = selectedModel && models.includes(selectedModel) ? selectedModel : autoModel;

  return (
    <div className="flex flex-col gap-3">
      {/* Vision server status bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-panel border border-border-subtle rounded-sm font-mono text-[10px]">
        {status === 'online'
          ? <Wifi size={12} className="text-neon-green" />
          : <WifiOff size={12} className="text-text-ghost" />}
        <span className={status === 'online' ? 'text-neon-green' : 'text-text-ghost'}>
          VISION SERVER
        </span>
        <span className="text-text-ghost">—</span>
        {status === 'checking' && <span className="text-neon-gold animate-pulse">CONNECTING...</span>}
        {status === 'online' && (
          <span className="text-text-dim flex items-center gap-1.5">
            ONLINE · MODEL:
            {models.length > 0 ? (
              <select
                value={visionModel}
                onChange={e => setSelectedModel(e.target.value)}
                className="bg-black/60 border border-border-subtle text-neon-violet font-mono text-[10px] px-1 py-0.5 rounded-sm outline-none focus:border-neon-violet cursor-pointer"
              >
                {models.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            ) : (
              <span className="text-neon-violet">{visionModel}</span>
            )}
          </span>
        )}
        {status === 'offline' && (
          <span className="text-neon-red">
            OFFLINE · run: <span className="font-mono text-text-dim">python3 vision_server.py</span>
          </span>
        )}
        <span className="ml-auto text-text-ghost">{VISION_SERVER}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FeedPanel
          id="main"
          title="CAM-1 // PRIMARY"
          isMain
          visionReady={status === 'online'}
          visionModel={visionModel}
        />
        <FeedPanel id="cam2" title="CAM-2" initialFilter="ir" visionReady={status === 'online'} visionModel={visionModel} />
        <FeedPanel id="cam3" title="CAM-3 OFFLINE" offline visionReady={false} visionModel={visionModel} />
      </div>
    </div>
  );
}

// ---- Threat level parser ----
function parseThreat(text: string): 'NOMINAL' | 'ELEVATED' | 'CRITICAL' | null {
  if (/CRITICAL/i.test(text)) return 'CRITICAL';
  if (/ELEVATED/i.test(text)) return 'ELEVATED';
  if (/NOMINAL/i.test(text)) return 'NOMINAL';
  return null;
}

// ---- Live frame filters (applied to real webcam pixels) ----
function applyLiveFilter(ctx: CanvasRenderingContext2D, w: number, h: number, filter: 'night' | 'thermal' | 'ir') {
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
    if (filter === 'night') {
      const n = Math.random() * 24 - 12;
      d[i] = Math.max(0, lum * 0.1);
      d[i + 1] = Math.min(255, Math.max(0, lum * 1.1 + n));
      d[i + 2] = Math.max(0, lum * 0.15);
    } else if (filter === 'ir') {
      // white-hot mono
      const v = Math.min(255, lum * 1.2);
      d[i] = v; d[i + 1] = v; d[i + 2] = v;
    } else {
      // thermal heat palette from luminance
      const v = lum / 255;
      if (v < 0.25) {
        d[i] = v * 4 * 100; d[i + 1] = 0; d[i + 2] = v * 4 * 200;
      } else if (v < 0.5) {
        d[i] = 100 + (v - 0.25) * 4 * 155; d[i + 1] = 0; d[i + 2] = 200 - (v - 0.25) * 4 * 200;
      } else if (v < 0.75) {
        d[i] = 255; d[i + 1] = (v - 0.5) * 4 * 200; d[i + 2] = 0;
      } else {
        d[i] = 255; d[i + 1] = 200 + (v - 0.75) * 4 * 55; d[i + 2] = (v - 0.75) * 4 * 255;
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);
  if (filter === 'night') {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    for (let y = 0; y < h; y += 2) ctx.fillRect(0, y, w, 1);
  }
}

// Downsampled luminance snapshot used for frame differencing
function sampleLuma(ctx: CanvasRenderingContext2D, w: number, h: number): Float32Array {
  const d = ctx.getImageData(0, 0, w, h).data;
  const out = new Float32Array(Math.ceil(d.length / 4 / MOTION_PIXEL_STRIDE));
  let j = 0;
  for (let i = 0; i < d.length; i += 4 * MOTION_PIXEL_STRIDE) {
    out[j++] = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
  }
  return out;
}

// ---- Feed panel ----
function FeedPanel({
  id, title, isMain, initialFilter = 'night', offline, visionReady, visionModel,
}: {
  id: string;
  title: string;
  isMain?: boolean;
  initialFilter?: 'night' | 'thermal' | 'ir';
  offline?: boolean;
  visionReady: boolean;
  visionModel: string;
}) {
  const [filter, setFilter] = useState(initialFilter);
  const [scanning, setScanning] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [threat, setThreat] = useState<'NOMINAL' | 'ELEVATED' | 'CRITICAL' | null>(null);
  const [live, setLive] = useState(false);
  const [motionEnabled, setMotionEnabled] = useState(!!isMain);
  const [motionAlert, setMotionAlert] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>(null);
  const analysisRef = useRef<HTMLDivElement>(null);
  const prevLumaRef = useRef<Float32Array | null>(null);
  const lastAutoScanRef = useRef(0);
  const motionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll analysis box as text streams in
  useEffect(() => {
    if (analysisRef.current) analysisRef.current.scrollTop = analysisRef.current.scrollHeight;
  }, [analysis]);

  const runScan = useCallback(async (trigger: 'manual' | 'motion' = 'manual') => {
    if (!canvasRef.current || scanning) return;
    setScanning(true);
    setAnalysis('');
    setThreat(null);

    const b64 = canvasRef.current.toDataURL('image/jpeg', 0.9).split(',')[1];
    const prompt = trigger === 'motion'
      ? `MOTION EVENT on ${title}. Analyze this ${filter.toUpperCase()} VISION frame captured at the moment of movement. Identify what moved and whether it is anomalous.`
      : `Analyze ${title} feed for paranormal anomalies. Current filter: ${filter.toUpperCase()} VISION.`;

    try {
      const res = await fetch(`${VISION_SERVER}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: b64, prompt, model: visionModel }),
      });

      if (!res.ok || !res.body) throw new Error(`Server error ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setAnalysis(accumulated);
        const detected = parseThreat(accumulated);
        if (detected) setThreat(detected);
      }
    } catch (e: unknown) {
      setAnalysis(`[NEXUS ERROR] Vision server unreachable.\nStart with: python3 vision_server.py\n\n${(e as Error).message}`);
    } finally {
      setScanning(false);
    }
  }, [scanning, filter, title, visionModel]);

  // Refs so the rAF loop always sees current values without re-mounting
  const runScanRef = useRef(runScan);
  const visionReadyRef = useRef(visionReady);
  const motionEnabledRef = useRef(motionEnabled);
  useEffect(() => {
    runScanRef.current = runScan;
    visionReadyRef.current = visionReady;
    motionEnabledRef.current = motionEnabled;
  });

  const triggerMotion = useCallback((real: boolean) => {
    setMotionAlert(true);
    if (motionTimeoutRef.current) clearTimeout(motionTimeoutRef.current);
    motionTimeoutRef.current = setTimeout(() => setMotionAlert(false), 2000);
    // Only real (webcam) motion may auto-dispatch a vision scan
    const now = Date.now();
    if (real && visionReadyRef.current && now - lastAutoScanRef.current > AUTO_SCAN_COOLDOWN_MS) {
      lastAutoScanRef.current = now;
      runScanRef.current('motion');
    }
  }, []);

  // Simulated motion blips, only while the feed itself is simulated
  useEffect(() => {
    if (!isMain || live || !motionEnabled) return;
    const interval = setInterval(() => {
      if (Math.random() < 0.05) triggerMotion(false);
    }, 3000);
    return () => clearInterval(interval);
  }, [isMain, live, motionEnabled, triggerMotion]);

  const goLive = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      prevLumaRef.current = null;
      setLive(true);
    } catch (e: unknown) {
      setAnalysis(`[NEXUS] Camera access denied or unavailable — feed remains simulated.\n${(e as Error).message}`);
    }
  };

  const stopLive = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    prevLumaRef.current = null;
    setLive(false);
  }, []);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (motionTimeoutRef.current) clearTimeout(motionTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (offline || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    let frame = 0;
    prevLumaRef.current = null; // filter switch invalidates the diff baseline

    const draw = () => {
      if (document.hidden) { animationRef.current = requestAnimationFrame(draw); return; }

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);

      const video = videoRef.current;
      const videoReady = live && video && video.readyState >= 2;

      if (videoReady) {
        ctx.drawImage(video, 0, 0, w, h);

        // Frame differencing on the raw frame, before the filter restyles it
        if (motionEnabledRef.current && frame % MOTION_CHECK_EVERY_N_FRAMES === 0) {
          const luma = sampleLuma(ctx, w, h);
          const prev = prevLumaRef.current;
          if (prev && prev.length === luma.length) {
            let moved = 0;
            for (let i = 0; i < luma.length; i++) {
              if (Math.abs(luma[i] - prev[i]) > MOTION_PIXEL_DELTA) moved++;
            }
            if (moved / luma.length > MOTION_AREA_FRACTION) triggerMotion(true);
          }
          prevLumaRef.current = luma;
        }

        applyLiveFilter(ctx, w, h, filter);
      } else if (filter === 'night') {
        const grad = ctx.createRadialGradient(w * 0.4, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.6);
        grad.addColorStop(0, 'rgba(0, 40, 10, 0.3)');
        grad.addColorStop(1, 'rgba(0, 10, 0, 0.5)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        const imgData = ctx.getImageData(0, 0, w, h);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          const n = (Math.random() * 30 - 5) * 2.5;
          d[i] = Math.max(0, d[i] + n * 0.2);
          d[i + 1] = Math.max(0, d[i + 1] + n);
          d[i + 2] = Math.max(0, d[i + 2] + n * 0.1);
        }
        ctx.putImageData(imgData, 0, 0);
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        for (let y = 0; y < h; y += 2) ctx.fillRect(0, y, w, 1);
      } else if (filter === 'ir' || filter === 'thermal') {
        const imgData = ctx.createImageData(w, h);
        const d = imgData.data;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const cx = w * 0.5 + Math.sin(frame * 0.01) * 60;
            const cy = h * 0.4 + Math.cos(frame * 0.015) * 40;
            const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
            const heat = Math.max(0, 1 - dist / (w * 0.4)) + Math.random() * 0.1;
            const v = Math.min(1, heat + Math.random() * 0.05);
            if (v < 0.25) {
              d[idx] = v * 4 * 100; d[idx + 1] = 0; d[idx + 2] = v * 4 * 200;
            } else if (v < 0.5) {
              d[idx] = 100 + (v - 0.25) * 4 * 155; d[idx + 1] = 0; d[idx + 2] = 200 - (v - 0.25) * 4 * 200;
            } else if (v < 0.75) {
              d[idx] = 255; d[idx + 1] = (v - 0.5) * 4 * 200; d[idx + 2] = 0;
            } else {
              d[idx] = 255; d[idx + 1] = 200 + (v - 0.75) * 4 * 55; d[idx + 2] = (v - 0.75) * 4 * 255;
            }
            d[idx + 3] = 255;
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }

      ctx.font = '9px "Share Tech Mono"';
      ctx.fillStyle = filter === 'night' ? 'rgba(0, 220, 80, 0.6)' : 'rgba(255, 150, 0, 0.7)';
      const t = new Date().toISOString().replace('T', ' ').slice(0, 19);
      ctx.fillText(t, 6, h - 6);
      ctx.fillText(videoReady ? 'SRC: LIVE_CAPTURE' : 'LOC: N48.2°  E16.3°', 6, h - 18);

      frame++;
      animationRef.current = requestAnimationFrame(draw);
    };

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = isMain ? 220 : 160;
    };

    resize();
    window.addEventListener('resize', resize);
    animationRef.current = requestAnimationFrame(draw);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [filter, isMain, offline, live, triggerMotion]);

  return (
    <div className={cn("bg-panel border border-border-subtle rounded-[4px] overflow-hidden", isMain && "md:col-span-2")}>
      {/* Header */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border-subtle bg-black/30">
        <div className={cn("font-mono text-[10px] flex items-center gap-1.5", offline ? "text-text-ghost" : "text-neon-orange")}>
          <div className={cn("w-1.5 h-1.5 rounded-full", offline ? "bg-text-ghost" : "bg-neon-red animate-blink")} />
          {title}
        </div>
        {!offline && (
          <div className="flex gap-1.5 items-center">
            <FilterBtn active={filter === 'night'} onClick={() => setFilter('night')}>NIGHT</FilterBtn>
            <FilterBtn active={filter === 'thermal'} onClick={() => setFilter('thermal')}>THERMAL</FilterBtn>
            <FilterBtn active={filter === 'ir'} onClick={() => setFilter('ir')}>IR</FilterBtn>
            {isMain && <FilterBtn active={motionEnabled} onClick={() => setMotionEnabled(!motionEnabled)}>MOTION</FilterBtn>}
            {isMain && (
              <button
                onClick={live ? stopLive : goLive}
                className={cn(
                  "px-2 py-0.5 border rounded-[2px] font-orbitron text-[9px] tracking-[1px] transition-all cursor-pointer",
                  live
                    ? "border-neon-red text-neon-red bg-neon-red/10 hover:bg-neon-red/20"
                    : "border-border-subtle text-text-dim hover:border-neon-red hover:text-neon-red"
                )}
                title={live ? "Stop webcam capture" : "Capture live webcam feed"}
              >
                {live ? '⏺ LIVE' : 'GO LIVE'}
              </button>
            )}
            <button
              onClick={() => runScan('manual')}
              disabled={!visionReady || scanning}
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 border rounded-[2px] font-orbitron text-[9px] tracking-[1px] transition-all",
                scanning
                  ? "border-neon-blue text-neon-blue bg-neon-blue/10 animate-pulse cursor-wait"
                  : visionReady
                  ? "border-neon-green text-neon-green hover:bg-neon-green/10 cursor-pointer"
                  : "border-border-subtle text-text-ghost cursor-not-allowed opacity-40"
              )}
              title={visionReady ? "Run AI vision analysis" : "Vision server offline"}
            >
              <ScanEye size={10} />
              {scanning ? 'SCANNING...' : 'ANALYZE'}
            </button>
          </div>
        )}
        {offline && (
          <button className="bg-transparent border border-border-subtle py-0.5 px-2 rounded-[2px] text-text-dim text-[9px] font-orbitron cursor-pointer hover:border-neon-blue hover:text-neon-blue">
            RECONNECT
          </button>
        )}
      </div>

      {/* Canvas feed */}
      <div className="relative group">
        <canvas ref={canvasRef} className="w-full block bg-black" />
        <video ref={videoRef} className="hidden" muted playsInline />
        {!offline && (
          <>
            <div className="absolute top-1.5 left-1.5 font-mono text-[9px] text-neon-green opacity-70 pointer-events-none uppercase">
              {live ? 'LIVE' : 'SIM'} // {filter} VISION ACTIVE {isMain && motionEnabled && "// MOTION DETECTION: ON"}
            </div>
            <div className="absolute inset-0 pointer-events-none border-border-accent/40 border">
              <div className="absolute top-1 left-1 w-3 h-3 border-t border-l border-neon-orange opacity-60" />
              <div className="absolute bottom-1 right-1 w-3 h-3 border-b border-r border-neon-orange opacity-60" />
            </div>
            {motionAlert && (
              <div className="absolute top-1.5 right-1.5 bg-neon-red/80 px-1.5 py-0.5 rounded-[2px] font-mono text-[9px] text-white animate-blink">
                MOTION!
              </div>
            )}
            {scanning && (
              <div className="absolute inset-0 pointer-events-none border-2 border-neon-blue/40 animate-pulse" />
            )}
          </>
        )}
        {offline && (
          <div className="absolute inset-0 flex items-center justify-center font-orbitron text-[11px] tracking-[3px] text-text-ghost">
            SIGNAL LOST
          </div>
        )}
      </div>

      {/* Analysis result */}
      {analysis && (
        <div className="border-t border-border-subtle">
          <div className="flex items-center justify-between px-2.5 py-1 bg-black/40">
            <span className="font-orbitron text-[9px] tracking-widest text-neon-violet">NEXUS VISION ANALYSIS</span>
            {threat && (
              <span className={cn(
                "font-orbitron text-[9px] tracking-widest px-2 py-0.5 rounded-sm border",
                threat === 'CRITICAL' && "text-neon-red border-neon-red/50 bg-neon-red/10",
                threat === 'ELEVATED' && "text-neon-orange border-neon-orange/50 bg-neon-orange/10",
                threat === 'NOMINAL' && "text-neon-green border-neon-green/50 bg-neon-green/10",
              )}>
                {threat}
              </span>
            )}
            <button
              onClick={() => { setAnalysis(''); setThreat(null); }}
              className="font-mono text-[10px] text-text-ghost hover:text-neon-red transition-colors"
            >
              ✕
            </button>
          </div>
          <div
            ref={analysisRef}
            className="px-3 py-2 max-h-32 overflow-y-auto font-mono text-[11px] text-text-dim leading-relaxed whitespace-pre-wrap"
            style={{ background: '#020210' }}
          >
            {analysis}
            {scanning && <span className="inline-block w-1.5 h-3 bg-neon-blue ml-0.5 animate-pulse" />}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterBtn({ active, onClick, children }: { active: boolean; onClick: any; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-2 py-0.5 bg-transparent border border-border-subtle rounded-[2px] text-text-dim text-[9px] font-orbitron cursor-pointer tracking-[1px] transition-all hover:border-neon-blue hover:text-neon-blue",
        active && "border-neon-violet text-neon-violet bg-neon-violet/10"
      )}
    >
      {children}
    </button>
  );
}
