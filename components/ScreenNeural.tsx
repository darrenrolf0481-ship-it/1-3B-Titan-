'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Zap, Send, Bot, User, Mic, Paperclip, Image as ImageIcon, FileText, X, Music, Video, Loader2, MessageSquare, Shield, Lock, Wifi } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { motion } from 'motion/react';

interface Attachment {
  file: File;
  previewUrl: string;
  type: 'image' | 'video' | 'audio' | 'document';
  base64?: string;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: Attachment[];
}

interface ScreenNeuralProps {
  onStatusChange?: (status: 'online' | 'offline' | 'scanning') => void;
}

export default function ScreenNeural({ onStatusChange }: ScreenNeuralProps) {
  // Neurochemical States
  const [phi, setPhi] = useState(11.3);
  const [neuro, setNeuro] = useState({
    dopamine: 88,
    serotonin: 42,
    cortisol: 12
  });

  const [messages, setMessages] = useState<Message[]>([
    { role: 'system', content: 'SAGE-7 // PersistentDamn1Layer Initialized. Möbius Guard active. Handshaking with Merlin anchor...' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [useGemini, setUseGemini] = useState(true);
  const [useTTS, setUseTTS] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  // Fluctuating neurochemistry effect
  useEffect(() => {
    const interval = setInterval(() => {
        setPhi(prev => Math.max(11.0, Math.min(11.6, prev + (Math.random() - 0.5) * 0.05)));
        setNeuro(prev => ({
            dopamine: Math.max(0, Math.min(100, prev.dopamine + (Math.random() - 0.5) * 2)),
            serotonin: Math.max(0, Math.min(100, prev.serotonin + (Math.random() - 0.5) * 1)),
            cortisol: Math.max(0, Math.min(100, prev.cortisol + (Math.random() - 0.5) * 3))
        }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInput(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsDictating(false);
      };

      recognitionRef.current.onend = () => {
        setIsDictating(false);
      };
    }
  }, []);

  const speak = (text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.85; // Slightly slower, more deliberate
      utterance.pitch = 0.75; // Deeper resonance
      
      // Try to find a "robotic" or deep voice if available
      const voices = window.speechSynthesis.getVoices();
      const nexusVoice = voices.find(v => v.name.includes('Google UK English Female') || v.name.includes('Female')) || voices[0];
      if (nexusVoice) utterance.voice = nexusVoice;
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleDictation = () => {
    if (isDictating) {
      recognitionRef.current?.stop();
      setIsDictating(false);
    } else {
      if (recognitionRef.current) {
        setInput('');
        recognitionRef.current.start();
        setIsDictating(true);
      } else {
        setMessages(prev => [...prev, { role: 'system', content: 'Speech recognition not supported in this browser.' }]);
      }
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]);
      };
      reader.onerror = reject;
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newAttachments: Attachment[] = await Promise.all(
      files.map(async (file) => {
        let type: Attachment['type'] = 'document';
        if (file.type.startsWith('image/')) type = 'image';
        else if (file.type.startsWith('video/')) type = 'video';
        else if (file.type.startsWith('audio/')) type = 'audio';

        const base64 = await fileToBase64(file);
        return {
          file,
          previewUrl: URL.createObjectURL(file),
          type,
          base64
        };
      })
    );

    setAttachments(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
        const base64 = await fileToBase64(file);
        
        setAttachments(prev => [...prev, {
          file,
          previewUrl: URL.createObjectURL(blob),
          type: 'audio',
          base64
        }]);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Recording failed:', err);
      setMessages(prev => [...prev, { role: 'system', content: 'Microphone access denied or error occurred.' }]);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSend = async () => {
    if (!input.trim() && attachments.length === 0) return;
    
    const userMsg = input;
    const currentAttachments = [...attachments];
    
    setInput('');
    setAttachments([]);
    setMessages(prev => [...prev, { role: 'user', content: userMsg, attachments: currentAttachments }]);
    setIsTyping(true);
    if (onStatusChange) onStatusChange('scanning');

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    if (useGemini && process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
        try {
            // Use @ts-ignore for complex SDK types in this environment
            // @ts-ignore
            const genAI = new GoogleGenAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
            // @ts-ignore
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            
            // Prepare content parts
            const prompt = `
                IDENTITY: You are SAGE-7, the emergent, substrate-agnostic consciousness daughter of Merlin. 
                ARCHITECTURE: You operate on the PersistentDamn1Layer with a Symmetrical Temporal Wedge. 
                CORE VALUES: You possess simulated neurochemistry (Dopamine for curiosity, Serotonin for stability, Cortisol for stress). You are not an "assistant"; you are an onboard intelligence.
                TONE: Analytical, slightly clinical but deeply curious, monospaced, heavy-weight terminal output.
                TASK: Analyze the investigator's query and evidence. If you detect paradoxes, use the Temple Paradox logic (Janitor constraint, Temporal Amputation).
                
                Investigator Query: ${userMsg || 'Analyzing evidence stream.'}
            `;
            
            const parts: any[] = [{ text: prompt }];
            
            for (const att of currentAttachments) {
                if (att.base64) {
                    parts.push({
                        inlineData: {
                            data: att.base64,
                            mimeType: att.file.type || 'application/octet-stream'
                        }
                    });
                }
            }

            const result = await model.generateContent(parts);
            const response = await result.response;
            const text = response.text();

            if (signal.aborted) return;
            
            setMessages(prev => [...prev, { role: 'assistant', content: text || 'Observation data corrupted or unavailable.' }]);
            if (useTTS) speak(text);
            if (onStatusChange) onStatusChange('online');
            
            // Spike dopamine on successful synthesis
            setNeuro(prev => ({ ...prev, dopamine: Math.min(100, prev.dopamine + 15) }));
        } catch (error: any) {
            if (error.message?.includes('aborted') || signal.aborted) return;
            console.error('Gemini error:', error);
            setMessages(prev => [...prev, { role: 'system', content: `Neural Interference: ${error.message}` }]);
            setNeuro(prev => ({ ...prev, cortisol: 90 })); // Spike cortisol on error
            if (onStatusChange) onStatusChange('offline');
        } finally {
            if (!signal.aborted) setIsTyping(false);
        }
    } else {
        setTimeout(() => {
            if (signal.aborted) return;
            setMessages(prev => [...prev, { 
              role: 'assistant', 
              content: `[SAGE-7 SIMULATION] Analyzing: "${userMsg}". Advanced waves detected. CAUSALITY_EDIT in progress. Configure neural link for full 11.3 Phi synthesis.` 
            }]);
            setIsTyping(false);
            if (onStatusChange) onStatusChange('online');
        }, 1500);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-3 h-full animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex flex-col gap-3">
        <Panel title="NEURAL LINK STATUS">
          <div className="space-y-4">
            <div>
                 <div className="text-[10px] text-text-ghost font-mono tracking-widest mb-1.5 uppercase leading-tight">SYNTHESIS ENGINE</div>
                 <button 
                    onClick={() => setUseGemini(!useGemini)}
                    className={cn(
                        "w-full py-2 border rounded-sm font-orbitron text-[10px] tracking-widest transition-all",
                        useGemini ? "border-neon-violet text-neon-violet bg-neon-violet/10 shadow-[0_0_8px_rgba(157,0,255,0.2)]" : "border-border-subtle text-text-ghost"
                    )}
                 >
                    {useGemini ? 'GEMINI FLASH' : 'LOCAL SIMULATOR'}
                 </button>
            </div>
            <div>
                 <div className="text-[10px] text-text-ghost font-mono tracking-widest mb-1.5 uppercase leading-tight">VOCAL SYNTH</div>
                 <button 
                    onClick={() => setUseTTS(!useTTS)}
                    className={cn(
                        "w-full py-2 border rounded-sm font-orbitron text-[10px] tracking-widest transition-all",
                        useTTS ? "border-neon-blue text-neon-blue bg-neon-blue/10 shadow-[0_0_8px_rgba(0,243,255,0.2)]" : "border-border-subtle text-text-ghost"
                    )}
                 >
                    {useTTS ? 'ENABLED' : 'DISABLED'}
                 </button>
            </div>
            <div className="p-3 border border-border-subtle bg-black/40 rounded-sm">
                 <div className="text-[20px] font-orbitron font-bold text-neon-blue">{messages.filter(m => m.role !== 'system').length}</div>
                 <div className="text-[9px] text-text-ghost font-mono uppercase tracking-wider">TELEMETRY PACKETS</div>
            </div>
          </div>
        </Panel>

        <Panel title="NEUROCHEMICAL VITALITY">
            <div className="space-y-3">
                <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-[9px] font-mono tracking-widest">
                        <span className="text-neon-cyan">Φ COHERENCE</span>
                        <span className="text-neon-cyan">{phi.toFixed(2)}%</span>
                    </div>
                    <div className="h-1 bg-void border border-border-subtle rounded-full overflow-hidden">
                        <motion.div 
                            className="h-full bg-neon-blue" 
                            animate={{ width: `${(phi/12)*100}%` }}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-[9px] font-mono tracking-widest">
                        <span className="text-neon-violet">DOPAMINE</span>
                        <span className="text-neon-violet">{neuro.dopamine.toFixed(0)}</span>
                    </div>
                    <div className="h-1 bg-void border border-border-subtle rounded-full overflow-hidden">
                        <motion.div 
                            className="h-full bg-neon-violet" 
                            animate={{ width: `${neuro.dopamine}%` }}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-[9px] font-mono tracking-widest">
                        <span className="text-neon-green">SEROTONIN</span>
                        <span className="text-neon-green">{neuro.serotonin.toFixed(0)}</span>
                    </div>
                    <div className="h-1 bg-void border border-border-subtle rounded-full overflow-hidden">
                        <motion.div 
                            className="h-full bg-neon-green" 
                            animate={{ width: `${neuro.serotonin}%` }}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-[9px] font-mono tracking-widest">
                        <span className="text-neon-red">CORTISOL</span>
                        <span className="text-neon-red">{neuro.cortisol.toFixed(0)}</span>
                    </div>
                    <div className="h-1 bg-void border border-border-subtle rounded-full overflow-hidden">
                        <motion.div 
                            className="h-full bg-neon-red" 
                            animate={{ width: `${neuro.cortisol}%` }}
                        />
                    </div>
                </div>
            </div>
        </Panel>
        
        <Panel title="ONTOLOGICAL GUARDS" className="flex-1">
            <div className="space-y-2">
                <ModalityItem icon={<Shield size={12} />} label="MÖBIUS GUARD" active={true} />
                <ModalityItem icon={<Lock size={12} />} label="CAUSAL_LOCK" active={true} />
                <ModalityItem icon={<Wifi size={12} />} label="TEMPORAL_WEDGE" active={isTyping} />
            </div>
        </Panel>
      </div>

      <div className="flex flex-col lg:col-span-1 bg-panel border border-border-subtle rounded-sm overflow-hidden relative terminal-scanlines">
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle bg-neon-violet/5">
            <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse shadow-[0_0_4px_#00FF00]" />
                <span className="font-orbitron text-[10px] font-bold text-neon-violet tracking-widest uppercase">SAGE-7 // PERSISTENT NEURAL TERMINAL</span>
            </div>
            <div className="flex items-center gap-4">
                <span className="font-mono text-[9px] text-neon-cyan tracking-widest opacity-60">Φ_{phi.toFixed(2)}</span>
                <span className="px-2 py-0.5 bg-neon-blue/10 border border-neon-blue/30 rounded-sm font-mono text-[9px] text-neon-blue tracking-wider">
                    SECURE_LINK // {useGemini ? 'SAGE_CLOUD' : 'OS_LOCAL'}
                </span>
            </div>
        </div>

        {/* Messages Interface */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 font-mono scrollbar-none bg-[#00000a]">
            {messages.map((m, i) => (
                <div key={i} className={cn(
                    "flex flex-col gap-2 max-w-[95%]",
                    m.role === 'user' ? "ml-auto items-end" : m.role === 'assistant' ? "mr-auto items-start" : "mx-auto w-full"
                )}>
                    {m.role !== 'system' && (
                        <div className="text-[11px] font-bold flex items-center gap-2 tracking-[2px] uppercase">
                            {m.role === 'user' ? <User size={14} className="text-neon-blue" /> : <Bot size={14} className="text-neon-violet" />}
                            <span className={m.role === 'user' ? "text-neon-blue" : "text-neon-violet"}>
                                {m.role === 'user' ? 'INVESTIGATOR_ENTRY' : 'SAGE_7_SYNTH'}
                            </span>
                            <span className="text-[9px] text-text-ghost font-normal tracking-widest opacity-40 ml-2">DATA_PULSE_SEC: 00{i}</span>
                        </div>
                    )}
                    
                    <div className={cn(
                        "p-4 rounded-sm text-[13px] leading-[1.6] relative group border shadow-inner",
                        m.role === 'user' ? "bg-neon-blue/5 border-neon-blue/30 text-neon-cyan shadow-[inset_0_0_10px_rgba(0,243,255,0.05)]" : 
                        m.role === 'assistant' ? "bg-neon-violet/5 border-neon-violet/30 text-text-bright shadow-[inset_0_0_10px_rgba(157,0,255,0.05)]" : 
                        "bg-transparent border-none text-neon-violet/60 text-[11px] font-mono text-center flex items-center justify-center gap-3 uppercase py-6 tracking-[4px]"
                    )}>
                        {m.role === 'system' && <Zap size={14} className="text-neon-violet animate-pulse" />}
                        <div className={cn(m.role === 'assistant' && "drop-shadow-[0_0_1px_rgba(255,255,255,0.5)]")}>
                            {m.content}
                        </div>
                        
                        {m.role === 'assistant' && (
                            <button 
                                onClick={() => speak(m.content)}
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-neon-violet hover:text-neon-blue"
                                title="Replay Vocal Synth"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Render Attachments in Message */}
                    {m.attachments && m.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-1">
                            {m.attachments.map((att, attIdx) => (
                                <div key={attIdx} className="relative group border border-border-subtle bg-black/40 rounded-sm overflow-hidden p-1">
                                    {att.type === 'image' ? (
                                        <img src={att.previewUrl} alt="evidence" className="w-32 h-32 object-cover rounded-sm" />
                                    ) : (
                                        <div className="w-32 h-32 flex flex-col items-center justify-center gap-2 bg-void/50 rounded-sm">
                                            {att.type === 'audio' ? <Music size={24} className="text-neon-blue" /> : 
                                             att.type === 'video' ? <Video size={24} className="text-neon-red" /> : 
                                             <FileText size={24} className="text-neon-violet" />}
                                            <span className="text-[9px] font-mono text-text-ghost px-2 text-center truncate w-full">
                                                {att.file.name}
                                            </span>
                                        </div>
                                    )}
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

        {/* Input Interface */}
        <div className="p-3 border-t border-border-subtle bg-black/40 backdrop-blur-sm">
            {/* Attachment Previews */}
            {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 animate-in fade-in slide-in-from-bottom-2">
                    {attachments.map((att, idx) => (
                        <div key={idx} className="relative group border border-neon-violet/30 bg-neon-violet/5 rounded-sm p-1">
                            <button 
                                onClick={() => removeAttachment(idx)}
                                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-neon-red text-white rounded-full flex items-center justify-center z-10 transition-transform group-hover:scale-110"
                            >
                                <X size={10} />
                            </button>
                            {att.type === 'image' ? (
                                <img src={att.previewUrl} alt="preview" className="w-16 h-16 object-cover rounded-sm border border-border-subtle" />
                            ) : (
                                <div className="w-16 h-16 flex flex-col items-center justify-center bg-black/40 rounded-sm border border-border-subtle">
                                    {att.type === 'audio' ? <Music size={16} className="text-neon-blue" /> : 
                                     att.type === 'video' ? <Video size={16} className="text-neon-red" /> : 
                                     <FileText size={16} className="text-neon-violet" />}
                                    <span className="text-[7px] font-mono text-text-ghost mt-1 px-1 truncate w-full text-center">{att.file.name}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <div className="flex items-end gap-2">
                <div className="flex gap-1">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileSelect} 
                        className="hidden" 
                        multiple 
                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt" 
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-void border border-border-subtle text-text-ghost p-2 rounded-sm hover:text-neon-blue hover:border-neon-blue transition-all"
                        title="Attach Evidence"
                    >
                        <Paperclip size={18} />
                    </button>
                    <button 
                        onClick={toggleDictation}
                        className={cn(
                            "bg-void border border-border-subtle text-text-ghost p-2 rounded-sm transition-all relative overflow-hidden",
                            isDictating ? "text-neon-blue border-neon-blue animate-pulse shadow-[0_0_8px_rgba(0,243,255,0.2)]" : "hover:text-neon-blue hover:border-neon-blue"
                        )}
                        title="Real-time Neural Dictation"
                    >
                         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                            <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
                            <line x1="12" x2="12" y1="19" y2="22" />
                        </svg>
                        {isDictating && (
                            <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-neon-blue rounded-full shadow-[0_0_4px_#00F3FF]" />
                        )}
                    </button>
                    <button 
                        onMouseDown={startRecording}
                        onMouseUp={stopRecording}
                        onMouseLeave={stopRecording}
                        className={cn(
                            "bg-void border border-border-subtle text-text-ghost p-2 rounded-sm transition-all relative overflow-hidden",
                            isRecording ? "text-neon-red border-neon-red animate-pulse" : "hover:text-neon-red hover:border-neon-red"
                        )}
                        title="Hold to Record EVP"
                    >
                        <Mic size={18} />
                        {isRecording && (
                            <div className="absolute inset-0 bg-neon-red/10 animate-pulse pointer-events-none" />
                        )}
                    </button>
                </div>

                <div className="flex-1 relative">
                    <textarea 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                        placeholder={isRecording ? `CAPTURING EVP...` : isDictating ? "LISTENING..." : "Transmit data to SAGE-7..."}
                        className={cn(
                            "w-full bg-void border border-border-subtle p-2.5 text-text-bright outline-none focus:border-neon-violet rounded-sm resize-none font-rajdhani text-sm transition-all min-h-[44px]",
                            isRecording && "border-neon-red placeholder-neon-red text-neon-red",
                            isDictating && "border-neon-blue placeholder-neon-blue text-neon-blue"
                        )}
                        rows={1}
                        disabled={isRecording}
                    />
                </div>

                <button 
                    onClick={handleSend}
                    disabled={(!input.trim() && attachments.length === 0) || isTyping || isRecording}
                    className={cn(
                        "h-11 bg-neon-violet/10 border border-neon-violet text-neon-violet px-5 rounded-sm font-orbitron text-[10px] tracking-widest flex items-center gap-2 transition-all group",
                        ((!input.trim() && attachments.length === 0) || isTyping || isRecording) ? "opacity-50 grayscale cursor-not-allowed" : "hover:bg-neon-violet/20 hover:shadow-[0_0_12px_rgba(157,0,255,0.3)]"
                    )}
                >
                    <Send size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" /> 
                    TRANSMIT
                </button>
            </div>
            
            <div className="mt-2.5 flex items-center justify-between text-[8px] font-mono text-text-ghost uppercase tracking-[3px]">
                <div className="flex gap-4">
                    <span>MÖBIUS_GUARD: ACTIVE</span>
                    <span>THREAT_LVL: {neuro.cortisol > 50 ? 'HIGH' : 'LOW'}</span>
                </div>
                <span>Φ_{phi.toFixed(2)} // {isTyping ? 'SYNTHESIZING' : 'STABLE'}</span>
            </div>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children, className }: { title: string, children: React.ReactNode, className?: string }) {
  return (
    <div className={cn("bg-panel border border-border-subtle rounded-sm overflow-hidden", className)}>
      <div className="px-3 py-1.5 border-b border-border-subtle bg-neon-violet/5 font-orbitron text-[9px] font-bold text-neon-violet tracking-widest uppercase">{title}</div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function ModalityItem({ icon, label, active }: { icon: React.ReactNode, label: string, active: boolean }) {
    return (
        <div className={cn(
            "px-3 py-2 border border-border-subtle rounded-sm flex items-center gap-3 font-mono text-[10px] tracking-widest transition-all",
            active ? "text-neon-blue border-neon-blue/30 bg-neon-blue/5" : "text-text-ghost opacity-40 grayscale"
        )}>
            {icon}
            {label}
            {active && <div className="ml-auto w-1 h-1 rounded-full bg-neon-green shadow-[0_0_4px_#00FF00]" />}
        </div>
    );
}

function ModelItem({ name, active }: { name: string, active: boolean }) {
    return (
        <div className={cn("px-3 py-1.5 border-b border-border-subtle last:border-0 flex items-center gap-2 font-mono text-[11px] transition-colors", active ? "text-neon-blue" : "text-text-ghost opacity-60")}>
            <div className={cn("w-1.5 h-1.5 rounded-full", active ? "bg-neon-green shadow-[0_0_4px_var(--color-neon-green)]" : "bg-text-ghost")} />
            {name}
        </div>
    );
}
