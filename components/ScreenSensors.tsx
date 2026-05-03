import { useState, useEffect, useRef, memo } from 'react';
import { cn } from '@/lib/utils';

const SENSOR_DEFS = [
  { id: 'emf', name: 'EMF FIELD', unit: 'mG', icon: '⚡', color: 'var(--color-neon-violet)', max: 50 },
  { id: 'temp', name: 'COLD SPOT', unit: '°C', icon: '❄️', color: 'var(--color-neon-blue)', max: 20 },
  { id: 'ion', name: 'IONIC P.', unit: 'ppt', icon: '☢️', color: 'var(--color-neon-cyan)', max: 5000 },
  { id: 'geo', name: 'GEO VIBE', unit: 'Hz', icon: '🌍', color: 'var(--color-neon-orange)', max: 100 },
  { id: 'uv', name: 'UV FLUX', unit: 'μW/cm²', icon: '☀️', color: 'var(--color-neon-pink)', max: 200 },
  { id: 'sls', name: 'MESH MAPPED', unit: 'pts', icon: '👤', color: 'var(--color-neon-green)', max: 1000 },
  { id: 'air', name: 'O2 SAT', unit: '%', icon: '💨', color: 'var(--color-neon-gold)', max: 100 },
  { id: 'aud', name: 'ULF/VLF', unit: 'dB', icon: '🔊', color: 'var(--color-neon-red)', max: 120 },
];

function drawGraph(canvas: HTMLCanvasElement, data: Float32Array, color: string, height: number, labels = false, points = 60) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set internal size to match CSS size
    if (canvas.width !== canvas.offsetWidth) canvas.width = canvas.offsetWidth;
    if (canvas.height !== canvas.offsetHeight) canvas.height = canvas.offsetHeight;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const max = Math.max(...Array.from(data), 1);
    
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = labels ? 2 : 1;
    ctx.lineJoin = 'round';

    const step = w / (points - 1);
    data.forEach((val, i) => {
        const x = i * step;
        const y = h - (val / max) * (h * 0.8) - (h * 0.1);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Area fill
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    const c = color.startsWith('var') ? (typeof document !== 'undefined' ? getComputedStyle(document.documentElement).getPropertyValue(color.slice(4, -1)) : '#ffffff') : color;
    grad.addColorStop(0, (c || '#ffffff') + '44');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fill();
}

function StatItem({ label, value, color }: { label: string, value: string, color: string }) {
    return (
        <div className="border border-border-subtle/30 p-2 rounded bg-void/50">
            <div className="text-[9px] text-text-ghost font-mono mb-1">{label}</div>
            <div className="font-orbitron font-bold" style={{ color }}>{value}</div>
        </div>
    );
}

const SensorCard = memo(function SensorCard({ def, valueRef, historyRef, isExpanded, onToggle }: { 
  def: any, 
  valueRef: React.RefObject<Record<string, number>>,
  historyRef: React.RefObject<Record<string, Float32Array>>,
  isExpanded: boolean, 
  onToggle: () => void 
}) {
  const miniCanvasRef = useRef<HTMLCanvasElement>(null);
  const bigCanvasRef = useRef<HTMLCanvasElement>(null);
  const displayValRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const color = def.color;
    const id = def.id;
    const draw = () => {
      if (typeof document !== 'undefined' && document.hidden) {
        requestAnimationFrame(draw);
        return;
      }

      const value = valueRef.current?.[id] ?? 0;
      const history = historyRef.current?.[id];

      if (displayValRef.current) {
        displayValRef.current.textContent = value.toFixed(1);
      }

      if (miniCanvasRef.current && history) {
        drawGraph(miniCanvasRef.current, history, color, 40, false, 20);
      }

      if (isExpanded && bigCanvasRef.current && history) {
        drawGraph(bigCanvasRef.current, history, color, 120, true, 60);
      }

      requestAnimationFrame(draw);
    };

    const handle = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(handle);
  }, [def.id, def.color, isExpanded, historyRef, valueRef]);

  return (
    <div className={cn(
      "nexus-panel p-3 cursor-pointer transition-all duration-300",
      isExpanded ? "col-span-2 md:col-span-4 row-span-1 ring-1 ring-neon-violet/50" : "hover:bg-panel2"
    )} onClick={onToggle}>
      <div className="nexus-panel-glow" />
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-mono text-text-dim uppercase tracking-wider">{def.name}</span>
        <span className="text-xs">{def.icon}</span>
      </div>
      
      <div className="flex items-end gap-2 mb-2">
        <div ref={displayValRef} className="font-orbitron font-black text-2xl text-text-bright leading-none">
          0.0
        </div>
        <div className="text-[10px] font-mono text-text-ghost mb-[2px]">{def.unit}</div>
      </div>

      <div className="h-10 w-full bg-black/30 rounded-sm overflow-hidden border border-border-subtle/30">
        <canvas ref={miniCanvasRef} className="w-full h-full" />
      </div>

      {isExpanded && (
        <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="h-32 w-full bg-black/40 rounded border border-border-subtle/50 mb-4 p-2">
             <canvas ref={bigCanvasRef} className="w-full h-full" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatItem label="PEAK" value={(def.max * 0.8).toFixed(1)} color={def.color} />
            <StatItem label="AVG" value={(def.max * 0.3).toFixed(1)} color="var(--color-text-dim)" />
            <StatItem label="SIGNAL" value="STABLE" color="var(--color-neon-cyan)" />
            <StatItem label="ID" value={def.id.toUpperCase()} color="var(--color-text-ghost)" />
          </div>
        </div>
      )}
    </div>
  );
});

export default function ScreenSensors({ externalHistoryRef }: { externalHistoryRef?: React.RefObject<Record<string, Float32Array>> }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [spectralRange, setSpectralRange] = useState<[number, number]>([0, 22000]);
  const [spectralResolution, setSpectralResolution] = useState(128);
  const [colorMapping, setColorMapping] = useState<'cyan' | 'magma' | 'plasma' | 'viridis'>('cyan');

  // Use typed arrays for history to save memory and avoid React overhead
  const localHistoryRef = useRef<Record<string, Float32Array>>(
    Object.fromEntries(SENSOR_DEFS.map(s => [s.id, new Float32Array(60)]))
  );
  
  const historyRef = externalHistoryRef || localHistoryRef;
  const valueRef = useRef<Record<string, number>>(
    Object.fromEntries(SENSOR_DEFS.map(s => [s.id, 0]))
  );

  useEffect(() => {
    let lastTime = 0;
    const update = (time: number) => {
      if (typeof document !== 'undefined' && document.hidden) {
        requestAnimationFrame(update);
        return;
      }

      const delta = time - lastTime;
      if (delta > 200) { // Update values 5 times a second
        lastTime = time;
        SENSOR_DEFS.forEach(s => {
          const change = (Math.random() - 0.5) * (s.max * 0.1);
          const newVal = Math.max(0, Math.min(s.max, valueRef.current[s.id] + change));
          valueRef.current[s.id] = newVal;
          
          const arr = historyRef.current?.[s.id];
          if (arr) {
            arr.set(arr.subarray(1));
            arr[arr.length - 1] = newVal;
          }
        });
      }
      requestAnimationFrame(update);
    };

    const handle = requestAnimationFrame(update);
    return () => cancelAnimationFrame(handle);
  }, [historyRef]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 space-y-3">
          <div className="font-orbitron text-[10px] tracking-[4px] text-neon-violet flex items-center gap-2 mb-2">
            SENSOR ARRAY
            <span className="text-[9px] text-text-ghost tracking-[2px]"> {"// REAL-TIME TELEMETRY"}</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-3">
            {SENSOR_DEFS.map((s) => (
              <SensorCard 
                key={s.id} 
                def={s} 
                valueRef={valueRef} 
                historyRef={historyRef}
                isExpanded={expandedId === s.id} 
                onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)} 
              />
            ))}
          </div>
        </div>

        {/* Spectral Analysis Panel */}
        <div className="w-full lg:w-[320px] space-y-4">
            <div className="nexus-panel p-4 flex flex-col h-full">
                <div className="nexus-panel-glow" />
                <div className="font-orbitron text-[10px] font-bold text-neon-blue tracking-[3px] uppercase mb-4 flex justify-between items-center">
                    SPECTRAL ANALYSIS
                    <div className="w-2 h-2 rounded-full bg-neon-blue animate-pulse shadow-[0_0_8px_#00F3FF]" />
                </div>

                <div className="flex-1 min-h-[300px] mb-4 relative bg-black/40 border border-border-subtle rounded-sm overflow-hidden">
                    <SpectralWaterfall 
                        resolution={spectralResolution} 
                        colorMap={colorMapping} 
                        freqRange={spectralRange}
                    />
                </div>

                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label className="text-[9px] font-mono text-text-ghost tracking-widest uppercase">Freq Range</label>
                            <span className="text-[9px] font-mono text-neon-blue">{spectralRange[0]}hz - {spectralRange[1]}hz</span>
                        </div>
                        <input 
                            type="range" 
                            min="0" 
                            max="44100" 
                            step="100"
                            value={spectralRange[1]}
                            onChange={(e) => setSpectralRange([0, parseInt(e.target.value)])}
                            className="w-full accent-neon-blue cursor-pointer"
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label className="text-[9px] font-mono text-text-ghost tracking-widest uppercase">Resolution</label>
                            <span className="text-[9px] font-mono text-neon-blue">{spectralResolution} samples</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {[64, 128, 256].map(res => (
                                <button
                                    key={res}
                                    onClick={() => setSpectralResolution(res)}
                                    className={cn(
                                        "py-1 border rounded-sm font-mono text-[9px] transition-all",
                                        spectralResolution === res ? "border-neon-blue text-neon-blue bg-neon-blue/10" : "border-border-subtle text-text-ghost"
                                    )}
                                >
                                    {res}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-[9px] font-mono text-text-ghost tracking-widest uppercase block mb-1.5">Color Mapping</label>
                        <div className="grid grid-cols-2 gap-2">
                            {['cyan', 'magma', 'plasma', 'viridis'].map(map => (
                                <button
                                    key={map}
                                    onClick={() => setColorMapping(map as any)}
                                    className={cn(
                                        "py-1 border rounded-sm font-mono text-[9px] transition-all uppercase tracking-widest",
                                        colorMapping === map ? "border-neon-violet text-neon-violet bg-neon-violet/10" : "border-border-subtle text-text-ghost"
                                    )}
                                >
                                    {map}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

function SpectralWaterfall({ resolution, colorMap, freqRange }: { resolution: number, colorMap: string, freqRange: [number, number] }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const dataRef = useRef<Float32Array[]>([]);

    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d')!;
        
        const draw = () => {
            if (typeof document !== 'undefined' && document.hidden) {
                requestAnimationFrame(draw);
                return;
            }

            const w = canvas.width = canvas.offsetWidth;
            const h = canvas.height = canvas.offsetHeight;
            
            // Generate new spectrum line
            const newLine = new Float32Array(resolution);
            for (let i = 0; i < resolution; i++) {
                // Mock peak identification
                const base = Math.random() * 0.2;
                const peak1 = Math.exp(-Math.pow(i - resolution * 0.2, 2) / 20) * (0.4 + Math.random() * 0.3);
                const peak2 = Math.exp(-Math.pow(i - resolution * 0.7, 2) / 50) * (0.2 + Math.random() * 0.2);
                newLine[i] = Math.min(1, base + peak1 + peak2);
            }
            
            dataRef.current.unshift(newLine);
            if (dataRef.current.length > h) {
                dataRef.current.pop();
            }

            ctx.clearRect(0, 0, w, h);
            
            const bw = w / resolution;
            dataRef.current.forEach((line, y) => {
                line.forEach((val, x) => {
                    ctx.fillStyle = getSpectralColor(val, colorMap as any);
                    ctx.fillRect(x * bw, y, bw + 1, 1);
                });
            });

            requestAnimationFrame(draw);
        };

        const handle = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(handle);
    }, [resolution, colorMap]);

    return <canvas ref={canvasRef} className="w-full h-full block" />;
}

function getSpectralColor(val: number, map: 'cyan' | 'magma' | 'plasma' | 'viridis') {
    if (map === 'cyan') {
        const intensity = Math.floor(val * 255);
        return `rgba(0, ${intensity}, ${intensity}, ${val + 0.1})`;
    }
    if (map === 'magma') {
        const r = Math.floor(val * 255);
        const g = Math.floor(val * 100);
        const b = Math.floor(val * 50);
        return `rgb(${r}, ${g}, ${b})`;
    }
    if (map === 'plasma') {
        const r = Math.floor(val * 255);
        const g = Math.floor((1 - val) * 255);
        const b = 255;
        return `rgb(${r}, ${g}, ${b})`;
    }
    // Viridis approx
    const r = Math.floor((1-val) * 60 + val * 253);
    const g = Math.floor((1-val) * 1 + val * 231);
    const b = Math.floor((1-val) * 78 + val * 37);
    return `rgb(${r}, ${g}, ${b})`;
}
