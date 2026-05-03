import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export default function ScreenEVP() {
    const [isRecording, setIsRecording] = useState(false);
    const [recordTime, setRecordTime] = useState(0);
    const [sensitivity, setSensitivity] = useState(72);
    const waveformRef = useRef<HTMLCanvasElement>(null);
    const spectrumRef = useRef<HTMLCanvasElement>(null);
    const freqRef = useRef<HTMLCanvasElement>(null);
    const dataRef = useRef<number[]>([]);

    useEffect(() => {
        dataRef.current = Array.from({ length: 200 }, () => (Math.random() - 0.5) * 0.1);
    }, []);

    useEffect(() => {
        let timer: any;
        if (isRecording) {
            timer = setInterval(() => setRecordTime(prev => prev + 1), 1000);
        }
        return () => clearInterval(timer);
    }, [isRecording]);

    useEffect(() => {
        if (!waveformRef.current) return;
        const canvas = waveformRef.current;
        const ctx = canvas.getContext('2d')!;
        
        const animate = () => {
            if (document.hidden) {
                requestAnimationFrame(animate);
                return;
            }
            const w = canvas.width = canvas.offsetWidth;
            const h = canvas.height = canvas.offsetHeight;
            ctx.fillStyle = 'rgba(0, 0, 8, 0.3)';
            ctx.fillRect(0, 0, w, h);

            dataRef.current.shift();
            const next = isRecording 
                ? (Math.random() - 0.5) * (0.4 + Math.random() * 0.6)
                : (Math.random() - 0.5) * 0.08;
            dataRef.current.push(next);

            ctx.strokeStyle = 'rgba(0, 212, 255, 0.05)';
            ctx.lineWidth = 0.5;
            for (let y = 0; y < h; y += 20) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
            }
            ctx.beginPath(); ctx.moveTo(0, h/2); ctx.lineTo(w, h/2);
            ctx.strokeStyle = 'rgba(0, 212, 255, 0.1)'; ctx.stroke();

            ctx.beginPath();
            dataRef.current.forEach((v, i) => {
                const x = (i / dataRef.current.length) * w;
                const y = h/2 + v * h/2 * 0.9;
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            });
            const color = isRecording ? '#ff2244' : '#00fff0';
            ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();

            requestAnimationFrame(animate);
        };
        const id = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(id);
    }, [isRecording]);

    useEffect(() => {
        if (!spectrumRef.current) return;
        const canvas = spectrumRef.current;
        const ctx = canvas.getContext('2d')!;
        const bars = 64;
        let freqs = Array.from({ length: bars }, () => Math.random() * 0.3);

        const animate = () => {
            if (document.hidden) {
                requestAnimationFrame(animate);
                return;
            }
            const w = canvas.width = canvas.offsetWidth;
            const h = canvas.height = canvas.offsetHeight;
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, w, h);
            const bw = w / bars - 1;

            freqs = freqs.map((f, i) => {
                const target = isRecording ? Math.random() : Math.random() * 0.15 + (i === 8 || i === 16 ? 0.6 : 0);
                return f + (target - f) * 0.15;
            });

            freqs.forEach((f, i) => {
                const bh = f * h;
                const x = i * (bw + 1);
                const hue = 180 + i * 2;
                ctx.fillStyle = `hsl(${hue}, 100%, 60%)`;
                ctx.fillRect(x, h - bh, bw, bh);
            });
            requestAnimationFrame(animate);
        };
        const id = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(id);
    }, [isRecording]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-3">
            <div className="space-y-3">
                <Panel 
                    title="WAVEFORM MONITOR" 
                    headerAction={<span className="font-mono text-[10px] text-neon-green">{(Math.floor(recordTime/60)).toString().padStart(2,'0')}:{(recordTime%60).toString().padStart(2,'0')}</span>}
                >
                    <div className="bg-black border border-border-subtle rounded-[4px] overflow-hidden">
                        <canvas ref={waveformRef} className="w-full h-[140px] block" />
                        <div className="flex gap-2 p-2.5 border-t border-border-subtle items-center justify-center">
                             <button 
                                onClick={() => {
                                    if (isRecording) {
                                        setIsRecording(false);
                                        setRecordTime(0);
                                    } else {
                                        setIsRecording(true);
                                    }
                                }}
                                className={cn(
                                    "px-4 py-1.5 bg-transparent border border-border-subtle rounded-[3px] font-orbitron text-[10px] tracking-[1px] text-text-dim transition-all hover:border-neon-blue hover:text-neon-blue cursor-pointer",
                                    isRecording && "border-neon-red text-neon-red animate-blink"
                                )}
                            >
                                {isRecording ? '⏹ STOP REC' : '⏺ RECORD'}
                            </button>
                            <button className="px-4 py-1.5 bg-transparent border border-border-subtle rounded-[3px] font-orbitron text-[10px] tracking-[1px] text-text-dim hover:border-neon-blue hover:text-neon-blue transition-all cursor-pointer">▶ PLAY</button>
                            <button onClick={() => { setIsRecording(false); setRecordTime(0); }} className="px-4 py-1.5 bg-transparent border border-border-subtle rounded-[3px] font-orbitron text-[10px] tracking-[1px] text-text-dim hover:border-neon-blue hover:text-neon-blue transition-all cursor-pointer">◼ STOP</button>
                            <button className="px-4 py-1.5 bg-transparent border border-neon-violet rounded-[3px] font-orbitron text-[10px] tracking-[1px] text-neon-violet hover:bg-neon-violet/10 transition-all cursor-pointer ml-3">⬇ EXPORT</button>
                        </div>
                    </div>
                </Panel>

                <Panel title="AUDIO SPECTRUM" headerAction={<span className="font-mono text-[10px] text-text-dim">0 – 22kHz</span>}>
                    <div className="bg-black border border-border-subtle rounded-[4px] overflow-hidden">
                         <canvas ref={spectrumRef} className="w-full h-[100px] block" />
                    </div>
                </Panel>
            </div>

            <div className="bg-black border border-border-subtle rounded-[4px] overflow-hidden flex flex-col">
                <div className="px-3 py-2 border-b border-border-subtle bg-neon-violet/4 font-orbitron text-[10px] font-bold text-neon-violet tracking-[3px] uppercase">
                    ANOMALY FREQ DETECT
                </div>
                <div className="bg-[#000] p-4 flex-1">
                     <FrequencyRadar />
                </div>
                <div className="p-3 border-t border-border-subtle">
                     <div className="text-[9px] text-text-ghost font-mono tracking-[2px] mb-1.5 uppercase">DETECTED ANOMALIES</div>
                     <div className="space-y-1">
                        <AnomalyItem label="Infrasound burst" freq="18 Hz" />
                        <AnomalyItem label="Phase reversal" freq="440 Hz" />
                        <AnomalyItem label="Sub-harmonic" freq="33 Hz" />
                     </div>
                </div>
                <div className="p-3 border-t border-border-subtle">
                    <div className="text-[9px] text-text-ghost font-mono tracking-[2px] mb-1.5 uppercase">SENSITIVITY</div>
                    <input 
                        type="range" 
                        min="0" max="100" 
                        value={sensitivity} 
                        onChange={(e) => setSensitivity(parseInt(e.target.value))}
                        className="w-full accent-neon-violet cursor-pointer" 
                    />
                    <div className="flex justify-between mt-1 font-mono text-[10px] text-text-ghost">
                        <span>LOW</span>
                        <span className="text-neon-violet">{sensitivity}%</span>
                        <span>HIGH</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Panel({ title, children, headerAction }: { title: string, children: React.ReactNode, headerAction?: React.ReactNode }) {
    return (
        <div className="bg-panel border border-border-subtle rounded-[4px] relative overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle bg-neon-violet/4">
                <span className="font-orbitron text-[10px] font-bold text-neon-violet tracking-[3px] uppercase">{title}</span>
                {headerAction}
            </div>
            <div className="p-3">{children}</div>
        </div>
    );
}

function AnomalyItem({ label, freq }: { label: string, freq: string }) {
    return (
        <div className="flex justify-between items-center py-1 border-b border-border-subtle last:border-0 font-mono text-[11px] text-text-dim">
            <span>{label}</span>
            <span className="text-neon-orange text-xs">{freq}</span>
        </div>
    );
}

function FrequencyRadar() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d')!;
        
        const animate = () => {
            if (document.hidden) {
                setTimeout(() => requestAnimationFrame(animate), 500);
                return;
            }

            const w = canvas.width = canvas.offsetWidth;
            const h = canvas.height = canvas.offsetHeight || 180;
            ctx.fillStyle = 'rgba(0, 0, 8, 0.2)';
            ctx.fillRect(0, 0, w, h);

            ctx.strokeStyle = 'rgba(155, 48, 255, 0.15)'; ctx.lineWidth = 0.5;
            [0.3, 0.5, 0.7, 0.9].forEach(r => {
                ctx.beginPath();
                ctx.arc(w/2, h/2, r * Math.min(w, h) * 0.48, 0, Math.PI * 2);
                ctx.stroke();
            });

            const now = Date.now() * 0.001;
            for (let a = 0; a < 32; a++) {
                const angle = (a / 32) * Math.PI * 2 + now * 0.2;
                const len = (0.2 + Math.random() * 0.3) * Math.min(w, h) * 0.4;
                const x1 = w/2 + Math.cos(angle) * 20;
                const y1 = h/2 + Math.sin(angle) * 20;
                const x2 = w/2 + Math.cos(angle) * len;
                const y2 = h/2 + Math.sin(angle) * len;
                ctx.beginPath();
                ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
                ctx.strokeStyle = `hsla(${280 + a * 3}, 100%, 60%, 0.6)`;
                ctx.lineWidth = 1.5; ctx.stroke();
            }

            ctx.beginPath();
            ctx.arc(w/2, h/2, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#9b30ff';
            ctx.fill();

            return setTimeout(() => requestAnimationFrame(animate), 50);
        };
        const id = animate();
        return () => clearTimeout(id!);
    }, []);

    return <canvas ref={canvasRef} className="w-full h-full block bg-black" />;
}
