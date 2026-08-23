import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Save, Trash2, Shield, Settings, Activity, Send, Radio, Zap } from 'lucide-react';
import { SensorData } from '@/hooks/use-nexus-state';

interface ScreenConfigProps {
    sensorPrompt: boolean;
    onSensorPromptChange: (val: boolean) => void;
    meters: SensorData;
    anomalyLevel: number;
    serverConnected: boolean;
}

const NEXUS_API = 'http://localhost:8765';

export default function ScreenConfig({ sensorPrompt, onSensorPromptChange, meters, anomalyLevel, serverConnected }: ScreenConfigProps) {
    const [toggles, setToggles] = useState({
        autoReconnect: true,
        audioAlerts: false,
        autoSave: true
    });

    // ── Sensor simulation state ────────────────────────────────────
    const [simEMF, setSimEMF] = useState(meters.emf);
    const [simTemp, setSimTemp] = useState(meters.temp);
    const [simIon, setSimIon] = useState(meters.ion);
    const [simGeo, setSimGeo] = useState(meters.geo);
    const [simAnomaly, setSimAnomaly] = useState(anomalyLevel);
    const [simStatus, setSimStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

    const syncFromLive = () => {
        setSimEMF(meters.emf);
        setSimTemp(meters.temp);
        setSimIon(meters.ion);
        setSimGeo(meters.geo);
        setSimAnomaly(anomalyLevel);
    };

    const injectSensorData = async () => {
        setSimStatus('sending');
        try {
            const res = await fetch(`${NEXUS_API}/api/sensors/report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    emf: simEMF,
                    temp: simTemp,
                    ion: simIon,
                    geo: simGeo,
                    anomaly: simAnomaly,
                    source: 'config_panel',
                }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            setSimStatus('sent');
            setTimeout(() => setSimStatus('idle'), 2000);
        } catch {
            setSimStatus('error');
            setTimeout(() => setSimStatus('idle'), 2500);
        }
    };

    const toggle = (key: keyof typeof toggles) => {
        setToggles(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-8">
            <Panel icon={<Shield size={14} />} title="API CONFIGURATION">
                <div className="space-y-4">
                    <div className="text-[10px] font-orbitron text-neon-violet tracking-widest border-b border-border-subtle pb-2 mb-2">EXTERNAL PROVIDERS</div>
                    <Field label="OPENROUTER API KEY" placeholder="sk-or-..." type="password" />
                    <Field label="GROK API KEY (X.AI)" placeholder="xai-..." type="password" />
                    <Field label="OPENAI API KEY (GPT)" placeholder="sk-..." type="password" />
                    <div className="p-2.5 bg-neon-violet/5 border border-border-subtle rounded-sm text-[11px] text-text-ghost font-mono">
                        ⚡ NEXUS runs on local Ollama by default. API keys extend to cloud providers but are entirely optional.
                    </div>
                </div>
            </Panel>

            <Panel icon={<Settings size={14} />} title="LLM CORE SETTINGS">
                 <div className="space-y-4">
                    <Field label="OLLAMA ENDPOINT" placeholder="http://localhost:11434" defaultValue="http://localhost:11434" />
                    <Field label="DEFAULT MODEL" placeholder="llama3" />
                    <div className="space-y-2 pt-2">
                        <Toggle label="Auto-reconnect on startup" active={toggles.autoReconnect} onClick={() => toggle('autoReconnect')} />
                        <Toggle label="Include sensor data in prompts" active={sensorPrompt} onClick={() => onSensorPromptChange(!sensorPrompt)} />
                    </div>
                 </div>
            </Panel>

            <Panel icon={<Activity size={14} />} title="SENSOR THRESHOLDS">
                 <div className="space-y-4">
                    <Field label="EMF ALERT THRESHOLD (mG)" type="number" defaultValue="10" />
                    <Field label="TEMP DELTA ALERT (°C)" type="number" defaultValue="5" />
                    <Toggle label="Audio alerts on anomaly" active={toggles.audioAlerts} onClick={() => toggle('audioAlerts')} />
                 </div>
            </Panel>

            {/* ── Sensor Simulation Panel ──────────────────────────────── */}
            <Panel icon={<Zap size={14} />} title="SENSOR SIMULATION">
                <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-border-subtle pb-2 mb-1">
                        <span className="text-[10px] font-mono text-text-ghost uppercase tracking-widest">LIVE TELEMETRY</span>
                        <span className={cn(
                            'font-mono text-[9px] px-1.5 py-0.5 rounded border flex items-center gap-1',
                            serverConnected
                                ? 'text-neon-green border-neon-green/30 bg-neon-green/10'
                                : 'text-neon-gold border-neon-gold/30 bg-neon-gold/10'
                        )}>
                            <Radio size={9} className={serverConnected ? 'animate-pulse' : ''} />
                            {serverConnected ? 'CONNECTED' : 'LOCAL'}
                        </span>
                    </div>

                    {/* Live readout row */}
                    <div className="grid grid-cols-4 gap-2 font-mono text-[10px]">
                        {[
                            { label: 'EMF', value: meters.emf, unit: 'mG', color: 'text-neon-cyan' },
                            { label: 'TEMP', value: meters.temp, unit: '°C', color: 'text-neon-blue' },
                            { label: 'ION', value: meters.ion, unit: '/s', color: 'text-neon-violet' },
                            { label: 'GEO', value: meters.geo, unit: 'µT', color: 'text-neon-green' },
                        ].map(s => (
                            <div key={s.label} className="bg-void/60 border border-border-subtle rounded p-1.5 text-center">
                                <div className="text-text-ghost text-[8px]">{s.label}</div>
                                <div className={cn('font-bold text-xs', s.color)}>{s.value.toFixed(1)}</div>
                                <div className="text-text-ghost text-[7px]">{s.unit}</div>
                            </div>
                        ))}
                    </div>

                    {/* Anomaly bar */}
                    <div>
                        <div className="flex justify-between text-[9px] font-mono mb-1">
                            <span className="text-text-ghost">ANOMALY</span>
                            <span className={cn(
                                anomalyLevel > 60 ? 'text-neon-red' : 'text-neon-orange'
                            )}>{anomalyLevel}%</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className={cn(
                                    'h-full rounded-full transition-all duration-700',
                                    anomalyLevel > 60 ? 'bg-neon-red' : 'bg-neon-orange'
                                )}
                                style={{ width: `${anomalyLevel}%` }}
                            />
                        </div>
                    </div>

                    <div className="border-t border-border-subtle pt-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-mono text-text-ghost uppercase tracking-widest">INJECT VALUES</span>
                            <button
                                onClick={syncFromLive}
                                className="font-mono text-[8px] text-neon-cyan border border-neon-cyan/30 px-1.5 py-0.5 rounded hover:bg-neon-cyan/10 transition-colors"
                            >
                                SYNC LIVE
                            </button>
                        </div>

                        <SensorSlider label="EMF (mG)" value={simEMF} onChange={setSimEMF} min={0} max={200} step={0.1} color="cyan" />
                        <SensorSlider label="TEMP (°C)" value={simTemp} onChange={setSimTemp} min={-50} max={50} step={0.1} color="blue" />
                        <SensorSlider label="IONS (/s)" value={simIon} onChange={setSimIon} min={0} max={20000} step={1} color="violet" />
                        <SensorSlider label="GEO (µT)" value={simGeo} onChange={setSimGeo} min={0} max={100} step={0.1} color="green" />
                        <SensorSlider label="ANOMALY (%)" value={simAnomaly} onChange={setSimAnomaly} min={0} max={100} step={1} color="red" />

                        <button
                            onClick={injectSensorData}
                            disabled={simStatus === 'sending'}
                            className={cn(
                                'w-full mt-3 py-2 font-orbitron text-[10px] tracking-widest rounded-sm flex items-center justify-center gap-2 transition-all border',
                                simStatus === 'sending' && 'bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan cursor-wait',
                                simStatus === 'sent' && 'bg-neon-green/10 border-neon-green text-neon-green',
                                simStatus === 'error' && 'bg-neon-red/10 border-neon-red text-neon-red',
                                simStatus === 'idle' && 'bg-neon-violet/10 border-neon-violet text-neon-violet hover:bg-neon-violet/20',
                            )}
                        >
                            {simStatus === 'sending' ? (
                                <><span className="animate-spin">⟳</span> INJECTING...</>
                            ) : simStatus === 'sent' ? (
                                <>✓ INJECTED</>
                            ) : simStatus === 'error' ? (
                                <>✕ FAILED</>
                            ) : (
                                <><Send size={12} /> INJECT SENSOR DATA</>
                            )}
                        </button>
                        {!serverConnected && (
                            <p className="text-[9px] text-neon-gold/70 font-mono mt-2 text-center">
                                Server unreachable — values will inject when connection resumes
                            </p>
                        )}
                    </div>
                </div>
            </Panel>

            <Panel icon={<Settings size={14} />} title="APPLICATION SETTINGS">
                <div className="space-y-4">
                    <Field label="INVESTIGATOR NAME" placeholder="Agent designation" />
                    <Field label="LOCATION / SITE NAME" placeholder="Investigation site" />
                    <Toggle label="Auto-save log entries" active={toggles.autoSave} onClick={() => toggle('autoSave')} />
                    
                    <div className="space-y-2 mt-4">
                        <button className="w-full py-2.5 bg-neon-violet/10 border border-neon-violet text-neon-violet font-orbitron text-[10px] tracking-widest rounded-sm flex items-center justify-center gap-2 hover:bg-neon-violet/20 transition-all">
                            <Save size={14} /> SAVE CONFIGURATION
                        </button>
                        <button className="w-full py-2.5 bg-neon-red/10 border border-neon-red text-neon-red font-orbitron text-[10px] tracking-widest rounded-sm flex items-center justify-center gap-2 hover:bg-neon-red/20 transition-all">
                            <Trash2 size={14} /> RESET ALL DATA
                        </button>
                    </div>
                </div>
            </Panel>
        </div>
    );
}

// ── Sensor slider ──────────────────────────────────────────────────
function SensorSlider({
    label, value, onChange, min, max, step, color,
}: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    min: number;
    max: number;
    step: number;
    color: string;
}) {
    const colorMap: Record<string, string> = {
        cyan: 'accent-neon-cyan',
        blue: 'accent-neon-blue',
        violet: 'accent-neon-violet',
        green: 'accent-neon-green',
        red: 'accent-neon-red',
    };

    return (
        <div className="mb-2">
            <div className="flex justify-between text-[9px] font-mono mb-0.5">
                <span className="text-text-ghost">{label}</span>
                <span className="text-text-bright font-bold">{step >= 1 ? value : value.toFixed(1)}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={e => onChange(parseFloat(e.target.value))}
                className={cn('w-full h-1 bg-white/10 rounded appearance-none cursor-pointer', colorMap[color] || 'accent-neon-cyan')}
            />
        </div>
    );
}

// ── Panel, Field, Toggle (unchanged) ──────────────────────────────
function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="bg-panel border border-border-subtle rounded-sm overflow-hidden flex flex-col">
            <div className="px-3 py-2 border-b border-border-subtle bg-neon-violet/5 flex items-center gap-2">
                <span className="text-neon-violet">{icon}</span>
                <span className="font-orbitron text-[10px] font-bold text-neon-violet tracking-widest uppercase">{title}</span>
            </div>
            <div className="p-4 flex-1">{children}</div>
        </div>
    );
}

function Field({ label, ...props }: any) {
    return (
        <div className="space-y-1">
            <label className="text-[10px] text-text-ghost font-mono tracking-widest uppercase">{label}</label>
            <input 
                {...props} 
                className="w-full bg-black/40 border border-border-subtle px-3 py-2 text-text-bright font-mono text-xs outline-none focus:border-neon-blue rounded-sm transition-colors" 
            />
        </div>
    );
}

function Toggle({ label, active, onClick }: { label: string; active: boolean; onClick: any }) {
    return (
        <div className="flex items-center justify-between py-1.5 border-b border-border-subtle text-[13px] text-text-dim">
            <span>{label}</span>
            <div 
                onClick={onClick}
                className={cn(
                    "w-9 h-[18px] rounded-full relative cursor-pointer transition-all",
                    active ? "bg-neon-violet/40" : "bg-border-subtle"
                )}
            >
                <div className={cn(
                    "absolute top-[2px] w-3.5 h-3.5 rounded-full transition-all shadow-sm",
                    active ? "right-[2px] bg-neon-violet shadow-[0_0_4px_var(--color-neon-violet)]" : "left-[2px] bg-text-ghost"
                )} />
            </div>
        </div>
    );
}