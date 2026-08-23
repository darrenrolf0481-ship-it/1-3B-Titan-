import { cn } from '@/lib/utils';
import { Shield, Lock, Wifi } from 'lucide-react';
import { motion } from 'motion/react';

// ── Panel / Guard helpers ──────────────────────────────────────────────────

function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("bg-panel border border-border-subtle rounded-sm overflow-hidden", className)}>
      <div className="px-3 py-1.5 border-b border-border-subtle bg-neon-violet/5 font-orbitron text-[9px] font-bold text-neon-violet tracking-widest uppercase">{title}</div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function Guard({ label, active }: { label: string; active: boolean }) {
  return (
    <div className={cn("px-3 py-2 border border-border-subtle rounded-sm flex items-center gap-3 font-mono text-[10px] tracking-widest transition-all",
      active ? "text-neon-blue border-neon-blue/30 bg-neon-blue/5" : "text-text-ghost opacity-40 grayscale"
    )}>
      {label === 'MÖBIUS GUARD' ? <Shield size={12} /> : label === 'CAUSAL_LOCK' ? <Lock size={12} /> : <Wifi size={12} />}
      {label}
      {active && <div className="ml-auto w-1 h-1 rounded-full bg-neon-green shadow-[0_0_4px_#00FF00]" />}
    </div>
  );
}

// ── Public props ───────────────────────────────────────────────────────────

export interface NeuroPanelProps {
  phi: number;
  neuro: { dopamine: number; serotonin: number; cortisol: number };
  isTyping: boolean;
  engine: 'openrouter' | 'ollama';
  onEngineChange: (engine: 'openrouter' | 'ollama') => void;
  openrouterKey: string;
  onOpenrouterKeyChange: (key: string) => void;
  openrouterModel: string;
  onOpenrouterModelChange: (model: string) => void;
  ollamaEndpoint: string;
  onOllamaEndpointChange: (url: string) => void;
  ollamaModels: string[];
  ollamaModel: string | null;
  onOllamaModelChange: (model: string) => void;
  ollamaStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  onConnectOllama: () => void;
  useTTS: boolean;
  onUseTTSChange: (on: boolean) => void;
  messageCount: number;
}

export default function NeuroPanel({
  phi, neuro, isTyping,
  engine, onEngineChange,
  openrouterKey, onOpenrouterKeyChange,
  openrouterModel, onOpenrouterModelChange,
  ollamaEndpoint, onOllamaEndpointChange,
  ollamaModels, ollamaModel, onOllamaModelChange,
  ollamaStatus, onConnectOllama,
  useTTS, onUseTTSChange,
  messageCount,
}: NeuroPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Engine + Connection */}
      <Panel title="NEURAL LINK STATUS">
        <div className="space-y-3">
          <div>
            <div className="text-[10px] text-text-ghost font-mono tracking-widest mb-1.5 uppercase">SYNTHESIS ENGINE</div>
            <div className="flex gap-1">
              <button
                onClick={() => onEngineChange('openrouter')}
                className={cn(
                  "flex-1 py-1.5 border rounded-sm font-orbitron text-[9px] tracking-widest transition-all",
                  engine === 'openrouter' ? "border-neon-violet text-neon-violet bg-neon-violet/10" : "border-border-subtle text-text-ghost hover:border-text-dim"
                )}
              >OPENROUTER</button>
              <button
                onClick={() => onEngineChange('ollama')}
                className={cn(
                  "flex-1 py-1.5 border rounded-sm font-orbitron text-[9px] tracking-widest transition-all",
                  engine === 'ollama' ? "border-neon-blue text-neon-blue bg-neon-blue/10" : "border-border-subtle text-text-ghost hover:border-text-dim"
                )}
              >OLLAMA</button>
            </div>
          </div>

          {engine === 'openrouter' && (
            <div className="space-y-2">
              <div className="text-[10px] text-text-ghost font-mono tracking-widest uppercase">API KEY</div>
              <input
                type="password"
                value={openrouterKey}
                onChange={e => onOpenrouterKeyChange(e.target.value)}
                placeholder="sk-or-..."
                className="w-full bg-black/50 border border-border-subtle px-2 py-1 font-mono text-[11px] text-text-bright outline-none focus:border-neon-violet rounded-sm transition-colors"
              />
              <div className="text-[10px] text-text-ghost font-mono tracking-widest uppercase">MODEL</div>
              <input
                value={openrouterModel}
                onChange={e => onOpenrouterModelChange(e.target.value)}
                placeholder="openrouter/auto"
                className="w-full bg-black/50 border border-border-subtle px-2 py-1 font-mono text-[11px] text-text-bright outline-none focus:border-neon-violet rounded-sm transition-colors"
              />
              <div className={cn("font-mono text-[10px]", openrouterKey.trim() ? "text-neon-green" : "text-text-ghost")}>
                {openrouterKey.trim() ? '● KEY SET' : '● NO KEY'}
              </div>
            </div>
          )}

          {engine === 'ollama' && (
            <div className="space-y-2">
              <div className="text-[10px] text-text-ghost font-mono tracking-widest uppercase">ENDPOINT</div>
              <div className="flex gap-1">
                <input
                  value={ollamaEndpoint}
                  onChange={e => onOllamaEndpointChange(e.target.value)}
                  className="flex-1 bg-black/50 border border-border-subtle px-2 py-1 font-mono text-[11px] text-text-bright outline-none focus:border-neon-blue rounded-sm transition-colors min-w-0"
                />
                <button
                  onClick={onConnectOllama}
                  disabled={ollamaStatus === 'connecting'}
                  className="px-2.5 py-1 bg-neon-blue/10 border border-neon-blue rounded-sm font-orbitron text-[9px] text-neon-blue tracking-widest hover:bg-neon-blue/20 transition-all disabled:opacity-50"
                >
                  {ollamaStatus === 'connecting' ? '...' : 'LINK'}
                </button>
              </div>
              <div className={cn("font-mono text-[10px]",
                ollamaStatus === 'connected' ? "text-neon-green" :
                ollamaStatus === 'error' ? "text-neon-red" :
                ollamaStatus === 'connecting' ? "text-neon-gold" : "text-text-ghost"
              )}>
                {ollamaStatus === 'connected' ? `● CONNECTED — ${ollamaModels.length} model(s)` :
                 ollamaStatus === 'error' ? '● CONNECTION FAILED' :
                 ollamaStatus === 'connecting' ? '● CONNECTING...' : '● DISCONNECTED'}
              </div>

              {ollamaModels.length > 0 && (
                <div className="border border-border-subtle rounded-sm overflow-hidden">
                  <div className="px-2 py-1 border-b border-border-subtle bg-neon-blue/5 font-orbitron text-[9px] text-neon-blue tracking-widest">MODELS</div>
                  {ollamaModels.map(m => (
                    <button
                      key={m}
                      onClick={() => onOllamaModelChange(m)}
                      className={cn(
                        "w-full text-left px-3 py-1.5 border-b border-border-subtle last:border-0 font-mono text-[11px] flex items-center gap-2 transition-colors",
                        ollamaModel === m ? "bg-neon-blue/10 text-neon-blue" : "text-text-dim hover:bg-neon-violet/8 hover:text-text-bright"
                      )}
                    >
                      <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", ollamaModel === m ? "bg-neon-green shadow-[0_0_4px_var(--color-neon-green)]" : "bg-text-ghost")} />
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <div className="text-[10px] text-text-ghost font-mono tracking-widest mb-1.5 uppercase">VOCAL SYNTH</div>
            <button
              onClick={() => onUseTTSChange(!useTTS)}
              className={cn(
                "w-full py-1.5 border rounded-sm font-orbitron text-[9px] tracking-widest transition-all",
                useTTS ? "border-neon-cyan text-neon-cyan bg-neon-cyan/10" : "border-border-subtle text-text-ghost hover:border-text-dim"
              )}
            >{useTTS ? 'ENABLED' : 'DISABLED'}</button>
          </div>

          <div className="p-3 border border-border-subtle bg-black/40 rounded-sm">
            <div className="text-[20px] font-orbitron font-bold text-neon-blue">{messageCount}</div>
            <div className="text-[9px] text-text-ghost font-mono uppercase tracking-wider">TELEMETRY PACKETS</div>
          </div>
        </div>
      </Panel>

      {/* Neurochemical vitals */}
      <Panel title="NEUROCHEMICAL VITALITY">
        <div className="space-y-3">
          {[
            { label: 'Φ COHERENCE', val: (phi / 12) * 100, display: `${phi.toFixed(2)}%`, color: 'neon-blue' as const },
            { label: 'DOPAMINE',    val: neuro.dopamine,    display: `${neuro.dopamine.toFixed(0)}`, color: 'neon-violet' as const },
            { label: 'SEROTONIN',  val: neuro.serotonin,   display: `${neuro.serotonin.toFixed(0)}`, color: 'neon-green' as const },
            { label: 'CORTISOL',   val: neuro.cortisol,    display: `${neuro.cortisol.toFixed(0)}`, color: 'neon-red' as const },
          ].map(({ label, val, display, color }) => (
            <div key={label} className="flex flex-col gap-1">
              <div className="flex justify-between text-[9px] font-mono tracking-widest">
                <span className={`text-${color}`}>{label}</span>
                <span className={`text-${color}`}>{display}</span>
              </div>
              <div className="h-1 bg-void border border-border-subtle rounded-full overflow-hidden">
                <motion.div className={`h-full bg-${color}`} animate={{ width: `${val}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="ONTOLOGICAL GUARDS" className="flex-1">
        <div className="space-y-2">
          <Guard label="MÖBIUS GUARD" active={true} />
          <Guard label="CAUSAL_LOCK" active={true} />
          <Guard label="TEMPORAL_WEDGE" active={isTyping} />
        </div>
      </Panel>
    </div>
  );
}