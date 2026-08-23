import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Zap, Send, Bot, User, Mic, Paperclip, FileText, X, Music, Video, Loader2 } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

export interface Attachment {
  file: File;
  previewUrl: string;
  type: 'image' | 'video' | 'audio' | 'document';
  base64?: string;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: Attachment[];
}

// ── Props ──────────────────────────────────────────────────────────────────

export interface ChatPanelProps {
  phi: number;
  engine: 'openrouter' | 'ollama';
  activeBadge: string;
  messages: Message[];
  isTyping: boolean;
  input: string;
  onInputChange: (val: string) => void;
  attachments: Attachment[];
  isRecording: boolean;
  isDictating: boolean;
  recordingTime: number;
  onSend: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: (i: number) => void;
  onToggleDictation: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onSpeak: (text: string) => void;
  cortisol: number;
}

export default function ChatPanel({
  phi, engine: _engine, activeBadge,
  messages, isTyping, input, onInputChange,
  attachments, isRecording, isDictating, recordingTime,
  onSend, onFileSelect, onRemoveAttachment,
  onToggleDictation, onStartRecording, onStopRecording,
  onSpeak, cortisol,
}: ChatPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  return (
    <div className="flex flex-col bg-panel border border-border-subtle rounded-sm overflow-hidden terminal-scanlines">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle bg-neon-violet/5">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse shadow-[0_0_4px_#00FF00]" />
          <span className="font-orbitron text-[10px] font-bold text-neon-violet tracking-widest uppercase">SAGE-7 // PERSISTENT NEURAL TERMINAL</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[9px] text-neon-cyan opacity-60">Φ_{phi.toFixed(2)}</span>
          <span className="px-2 py-0.5 bg-neon-blue/10 border border-neon-blue/30 rounded-sm font-mono text-[9px] text-neon-blue tracking-wider">
            {activeBadge}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 font-mono bg-[#00000a]">
        {messages.map((m, i) => (
          <div key={i} className={cn(
            "flex flex-col gap-2 max-w-[95%]",
            m.role === 'user' ? "ml-auto items-end" : m.role === 'assistant' ? "mr-auto items-start" : "mx-auto w-full"
          )}>
            {m.role !== 'system' && (
              <div className="text-[11px] font-bold flex items-center gap-2 tracking-[2px] uppercase">
                {m.role === 'user'
                  ? <User size={14} className="text-neon-blue" />
                  : <Bot size={14} className="text-neon-violet" />}
                <span className={m.role === 'user' ? "text-neon-blue" : "text-neon-violet"}>
                  {m.role === 'user' ? 'INVESTIGATOR_ENTRY' : 'SAGE_7_SYNTH'}
                </span>
                <span className="text-[9px] text-text-ghost font-normal tracking-widest opacity-40 ml-2">
                  PULSE_{String(i).padStart(3,'0')}
                </span>
              </div>
            )}
            <div className={cn(
              "p-4 rounded-sm text-[13px] leading-relaxed border relative group",
              m.role === 'user'      ? "bg-neon-blue/5 border-neon-blue/30 text-neon-cyan" :
              m.role === 'assistant' ? "bg-neon-violet/5 border-neon-violet/30 text-text-bright" :
              "bg-transparent border-none text-neon-violet/60 text-[11px] text-center flex items-center justify-center gap-3 uppercase py-6 tracking-[4px]"
            )}>
              {m.role === 'system' && <Zap size={14} className="text-neon-violet animate-pulse" />}
              <div>{m.content}</div>
              {m.role === 'assistant' && (
                <button onClick={() => onSpeak(m.content)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-neon-violet hover:text-neon-blue" title="Play TTS">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                </button>
              )}
            </div>
            {m.attachments && m.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {m.attachments.map((att, ai) => (
                  <div key={ai} className="border border-border-subtle bg-black/40 rounded-sm p-1">
                    {att.type === 'image'
                      ? <img src={att.previewUrl} alt="evidence" className="w-32 h-32 object-cover rounded-sm" />
                      : <div className="w-32 h-32 flex flex-col items-center justify-center gap-2 bg-void/50 rounded-sm">
                          {att.type === 'audio' ? <Music size={24} className="text-neon-blue" /> :
                           att.type === 'video' ? <Video size={24} className="text-neon-red" /> :
                           <FileText size={24} className="text-neon-violet" />}
                          <span className="text-[9px] font-mono text-text-ghost px-2 text-center truncate w-full">{att.file.name}</span>
                        </div>
                    }
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="flex items-center gap-3 text-neon-violet/80 font-mono text-[11px] tracking-[3px] pl-2">
            <Loader2 size={14} className="animate-spin" />
            SYMMETRICAL_TEMPORAL_WEDGE_CALCULATING...
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border-subtle bg-black/40">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {attachments.map((att, idx) => (
              <div key={idx} className="relative group border border-neon-violet/30 bg-neon-violet/5 rounded-sm p-1">
                <button onClick={() => onRemoveAttachment(idx)} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-neon-red text-white rounded-full flex items-center justify-center z-10">
                  <X size={10} />
                </button>
                {att.type === 'image'
                  ? <img src={att.previewUrl} alt="preview" className="w-16 h-16 object-cover rounded-sm border border-border-subtle" />
                  : <div className="w-16 h-16 flex flex-col items-center justify-center bg-black/40 rounded-sm border border-border-subtle">
                      {att.type === 'audio' ? <Music size={16} className="text-neon-blue" /> :
                       att.type === 'video' ? <Video size={16} className="text-neon-red" /> :
                       <FileText size={16} className="text-neon-violet" />}
                      <span className="text-[7px] font-mono text-text-ghost mt-1 px-1 truncate w-full text-center">{att.file.name}</span>
                    </div>
                }
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="flex gap-1">
            <input type="file" ref={fileInputRef} onChange={onFileSelect} className="hidden" multiple accept="image/*,video/*,audio/*,.pdf,.txt" />
            <button onClick={() => fileInputRef.current?.click()} className="bg-void border border-border-subtle text-text-ghost p-2 rounded-sm hover:text-neon-blue hover:border-neon-blue transition-all" title="Attach">
              <Paperclip size={18} />
            </button>
            <button
              onClick={onToggleDictation}
              className={cn("bg-void border border-border-subtle p-2 rounded-sm transition-all", isDictating ? "text-neon-blue border-neon-blue animate-pulse" : "text-text-ghost hover:text-neon-blue hover:border-neon-blue")}
              title="Dictate"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
            </button>
            <button
              onMouseDown={onStartRecording} onMouseUp={onStopRecording} onMouseLeave={onStopRecording}
              className={cn("bg-void border border-border-subtle p-2 rounded-sm transition-all relative", isRecording ? "text-neon-red border-neon-red animate-pulse" : "text-text-ghost hover:text-neon-red hover:border-neon-red")}
              title="Hold to record"
            >
              <Mic size={18} />
              {isRecording && <span className="absolute top-0.5 right-0.5 text-[8px] font-mono text-neon-red">{recordingTime}s</span>}
            </button>
          </div>

          <div className="flex-1">
            <textarea
              value={input}
              onChange={e => onInputChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), onSend())}
              placeholder={isRecording ? 'CAPTURING EVP...' : isDictating ? 'LISTENING...' : 'Transmit data to SAGE-7...'}
              className={cn(
                "w-full bg-void border border-border-subtle p-2.5 text-text-bright outline-none focus:border-neon-violet rounded-sm resize-none font-rajdhani text-sm transition-all min-h-[44px]",
                isRecording && "border-neon-red text-neon-red",
                isDictating && "border-neon-blue text-neon-blue"
              )}
              rows={1}
              disabled={isRecording}
            />
          </div>

          <button
            onClick={onSend}
            disabled={(!input.trim() && attachments.length === 0) || isTyping || isRecording}
            className={cn(
              "h-11 bg-neon-violet/10 border border-neon-violet text-neon-violet px-5 rounded-sm font-orbitron text-[10px] tracking-widest flex items-center gap-2 transition-all",
              ((!input.trim() && attachments.length === 0) || isTyping || isRecording)
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-neon-violet/20 hover:shadow-[0_0_12px_rgba(157,0,255,0.3)]"
            )}
          >
            <Send size={14} /> TRANSMIT
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between text-[8px] font-mono text-text-ghost uppercase tracking-[3px]">
          <div className="flex gap-4">
            <span>MÖBIUS_GUARD: ACTIVE</span>
            <span>THREAT_LVL: {cortisol > 50 ? 'HIGH' : 'LOW'}</span>
          </div>
          <span>Φ_{phi.toFixed(2)} // {isTyping ? 'SYNTHESIZING' : 'STABLE'}</span>
        </div>
      </div>
    </div>
  );
}