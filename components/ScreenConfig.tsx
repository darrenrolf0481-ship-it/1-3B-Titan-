'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Save, Trash2, Shield, Settings, Activity } from 'lucide-react';

export default function ScreenConfig() {
    const [toggles, setToggles] = useState({
        autoReconnect: true,
        sensorPrompt: true,
        audioAlerts: false,
        autoSave: true
    });

    const toggle = (key: keyof typeof toggles) => {
        setToggles(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-8">
            <Panel icon={<Shield size={14} />} title="API CONFIGURATION">
                <div className="space-y-4">
                    <div className="text-[10px] font-orbitron text-neon-violet tracking-widest border-b border-border-subtle pb-2 mb-2">EXTERNAL PROVIDERS</div>
                    <Field label="GOOGLE API KEY (GEMINI)" placeholder="AIza..." type="password" />
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
                        <Toggle label="Include sensor data in prompts" active={toggles.sensorPrompt} onClick={() => toggle('sensorPrompt')} />
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

function Panel({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) {
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

function Toggle({ label, active, onClick }: { label: string, active: boolean, onClick: any }) {
    return (
        <div className="flex items-center justify-between py-1.5 border-b border-border-subtle text-[13px] text-text-dim">
            <span>{label}</span>
            <div 
                onClick={onClick}
                className={cn(
                    "w-9 h-4.5 rounded-full relative cursor-pointer transition-all",
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
