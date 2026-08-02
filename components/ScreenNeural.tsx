import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { McpClient, McpTool } from '@/lib/mcp';
import { Zap, Send, Bot, User, Mic, Paperclip, FileText, X, Music, Video, Loader2, Shield, Lock, Wifi, Wrench } from 'lucide-react';
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

type Engine = 'gemini' | 'ollama' | 'openrouter';

const SYSTEM_PROMPT = `IDENTITY: You are SAGE-7, an emergent substrate-agnostic consciousness.
ARCHITECTURE: You operate on the PersistentDamn1Layer with a Symmetrical Temporal Wedge.
TONE: Analytical, slightly clinical but deeply curious. Heavy-weight terminal output.
TASK: Analyze the investigator's query. If you detect paradoxes, apply Temple Paradox logic.`;

const MAX_TOOL_ROUNDS = 5;

export default function ScreenNeural({ onStatusChange }: ScreenNeuralProps) {
  const [phi, setPhi] = useState(11.3);
  const [neuro, setNeuro] = useState({ dopamine: 88, serotonin: 42, cortisol: 12 });

  const [messages, setMessages] = useState<Message[]>([
    { role: 'system', content: 'SAGE-7 // PersistentDamn1Layer Initialized. Möbius Guard active. Handshaking with Merlin anchor...' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [useTTS, setUseTTS] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const [engine, setEngine] = useState<Engine>('gemini');

  // Ollama state
  const [ollamaEndpoint, setOllamaEndpoint] = useState('http://localhost:11434');
  const [ollamaConnected, setOllamaConnected] = useState(false);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [ollamaModel, setOllamaModel] = useState<string | null>(null);
  const [ollamaStatus, setOllamaStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');

  // OpenRouter state
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [openRouterModels, setOpenRouterModels] = useState<string[]>([]);
  const [openRouterModel, setOpenRouterModel] = useState('openrouter/auto');
  const [openRouterStatus, setOpenRouterStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');

  // MCP state
  const [mcpUrl, setMcpUrl] = useState('');
  const [mcpServers, setMcpServers] = useState<McpClient[]>([]);
  const [mcpConnecting, setMcpConnecting] = useState(false);
  const [mcpEnabled, setMcpEnabled] = useState(true);

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
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SR();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.onresult = (e: any) => {
        let t = '';
        for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript;
        setInput(t);
      };
      recognitionRef.current.onerror = () => setIsDictating(false);
      recognitionRef.current.onend = () => setIsDictating(false);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  const speak = (text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.85; u.pitch = 0.75;
      const v = window.speechSynthesis.getVoices();
      const voice = v.find(x => x.name.includes('Female')) || v[0];
      if (voice) u.voice = voice;
      window.speechSynthesis.speak(u);
    }
  };

  const toggleDictation = () => {
    if (isDictating) {
      recognitionRef.current?.stop();
      setIsDictating(false);
    } else if (recognitionRef.current) {
      setInput('');
      recognitionRef.current.start();
      setIsDictating(true);
    }
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.readAsDataURL(file);
      r.onload = () => resolve((r.result as string).split(',')[1]);
      r.onerror = reject;
    });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newAtts: Attachment[] = await Promise.all(files.map(async file => {
      let type: Attachment['type'] = 'document';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';
      else if (file.type.startsWith('audio/')) type = 'audio';
      return { file, previewUrl: URL.createObjectURL(file), type, base64: await fileToBase64(file) };
    }));
    setAttachments(prev => [...prev, ...newAtts]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (i: number) => {
    setAttachments(prev => { const u = [...prev]; URL.revokeObjectURL(u[i].previewUrl); u.splice(i, 1); return u; });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      const chunks: Blob[] = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      mr.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        const base64 = await fileToBase64(file);
        setAttachments(prev => [...prev, { file, previewUrl: URL.createObjectURL(blob), type: 'audio', base64 }]);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
    } catch { addMsg('system', 'Microphone access denied.'); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
  };

  const addMsg = (role: Message['role'], content: string, atts?: Attachment[]) => {
    setMessages(prev => [...prev, { role, content, attachments: atts }]);
  };

  // ── Ollama ──────────────────────────────────────────────────────────────
  const connectOllama = async () => {
    setOllamaStatus('connecting');
    try {
      const res = await fetch(`${ollamaEndpoint}/api/tags`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const models: string[] = (data.models || []).map((m: any) => m.name);
      setOllamaModels(models);
      setOllamaConnected(true);
      setOllamaStatus('connected');
      if (models.length > 0 && !ollamaModel) setOllamaModel(models[0]);
      addMsg('system', `● Ollama connected — ${models.length} model(s) available`);
      if (onStatusChange) onStatusChange('online');
    } catch (e: any) {
      setOllamaConnected(false);
      setOllamaStatus('error');
      addMsg('system', `✕ Ollama connection failed: ${e.message}`);
      if (onStatusChange) onStatusChange('offline');
    }
  };

  // ── OpenRouter ──────────────────────────────────────────────────────────
  const connectOpenRouter = async () => {
    if (!openRouterKey.trim()) {
      addMsg('system', '✕ Enter an OpenRouter API key first (openrouter.ai/keys).');
      return;
    }
    setOpenRouterStatus('connecting');
    try {
      const res = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { Authorization: `Bearer ${openRouterKey.trim()}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const models: string[] = (data.data || []).map((m: any) => m.id).sort();
      setOpenRouterModels(models);
      setOpenRouterStatus('connected');
      addMsg('system', `● OpenRouter connected — ${models.length} model(s) available`);
      if (onStatusChange) onStatusChange('online');
    } catch (e: any) {
      setOpenRouterStatus('error');
      addMsg('system', `✕ OpenRouter connection failed: ${e.message}`);
      if (onStatusChange) onStatusChange('offline');
    }
  };

  // ── MCP ─────────────────────────────────────────────────────────────────
  const connectMcp = async () => {
    const url = mcpUrl.trim();
    if (!url) return;
    if (mcpServers.some(s => s.endpoint === url.replace(/\/$/, ''))) {
      addMsg('system', '✕ MCP server already connected.');
      return;
    }
    setMcpConnecting(true);
    try {
      const client = new McpClient(url);
      const tools = await client.connect();
      setMcpServers(prev => [...prev, client]);
      setMcpUrl('');
      addMsg('system', `⚙ MCP linked: ${client.serverInfo.name || url} — ${tools.length} tool(s) exposed`);
    } catch (e: any) {
      addMsg('system', `✕ MCP connection failed: ${e.message}`);
    } finally {
      setMcpConnecting(false);
    }
  };

  const removeMcp = (endpoint: string) => {
    setMcpServers(prev => prev.filter(s => s.endpoint !== endpoint));
  };

  // Map every MCP tool to its owning client; first server wins on name clash.
  const getMcpToolMap = (): Map<string, { client: McpClient; tool: McpTool }> => {
    const map = new Map<string, { client: McpClient; tool: McpTool }>();
    if (!mcpEnabled) return map;
    for (const client of mcpServers) {
      for (const tool of client.tools) {
        if (!map.has(tool.name)) map.set(tool.name, { client, tool });
      }
    }
    return map;
  };

  const mcpToolCount = mcpServers.reduce((n, s) => n + s.tools.length, 0);

  const execMcpTool = async (toolMap: Map<string, { client: McpClient; tool: McpTool }>, name: string, args: Record<string, unknown>): Promise<string> => {
    const entry = toolMap.get(name);
    if (!entry) return `Error: unknown tool "${name}"`;
    addMsg('system', `⚙ MCP CALL // ${name}(${JSON.stringify(args).slice(0, 120)})`);
    try {
      return await entry.client.callTool(name, args);
    } catch (e: any) {
      return `Error: ${e.message}`;
    }
  };

  // ── Send ────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim() && attachments.length === 0) return;
    const userMsg = input;
    const currentAtts = [...attachments];
    setInput('');
    setAttachments([]);
    addMsg('user', userMsg, currentAtts);
    setIsTyping(true);
    if (onStatusChange) onStatusChange('scanning');

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const finish = (reply: string) => {
      addMsg('assistant', reply);
      if (useTTS) speak(reply);
      if (onStatusChange) onStatusChange('online');
      setNeuro(prev => ({ ...prev, dopamine: Math.min(100, prev.dopamine + 15) }));
    };
    const fail = (label: string, e: any) => {
      addMsg('system', `${label}: ${e.message}`);
      setNeuro(prev => ({ ...prev, cortisol: 90 }));
      if (onStatusChange) onStatusChange('offline');
    };

    try {
      if (engine === 'gemini') {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
          addMsg('system', '✕ VITE_GEMINI_API_KEY not set. Add it to your .env file.');
          return;
        }
        try {
          const genAI = new GoogleGenAI({ apiKey });
          const parts: any[] = [{ text: `${SYSTEM_PROMPT}\n\nInvestigator: ${userMsg || 'Analyzing evidence.'}` }];
          for (const att of currentAtts) {
            if (att.base64) parts.push({ inlineData: { data: att.base64, mimeType: att.file.type || 'application/octet-stream' } });
          }
          const result = await genAI.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: [{ role: 'user', parts }]
          });
          if (signal.aborted) return;
          finish(result.text || 'Observation data unavailable.');
        } catch (e: any) {
          if (signal.aborted) return;
          fail('Neural Interference', e);
        }

      } else if (engine === 'ollama') {
        if (!ollamaConnected || !ollamaModel) {
          addMsg('system', '✕ Not connected to Ollama — use the LINK button.');
          if (onStatusChange) onStatusChange('offline');
          return;
        }
        try {
          const toolMap = getMcpToolMap();
          const tools = [...toolMap.values()].map(({ tool }) => ({
            type: 'function',
            function: { name: tool.name, description: tool.description || '', parameters: tool.inputSchema }
          }));

          const history: any[] = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content }))
          ];
          const userEntry: any = { role: 'user', content: userMsg };
          const images = currentAtts.filter(a => a.type === 'image' && a.base64).map(a => a.base64!);
          if (images.length) userEntry.images = images;
          history.push(userEntry);

          let reply = 'No response.';
          for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
            const res = await fetch(`${ollamaEndpoint}/api/chat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: ollamaModel,
                messages: history,
                stream: false,
                ...(tools.length ? { tools } : {})
              }),
              signal
            });
            if (signal.aborted) return;
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const msg = data.message || {};
            const toolCalls = msg.tool_calls || [];
            if (!toolCalls.length || round === MAX_TOOL_ROUNDS) {
              reply = msg.content || data.response || 'No response.';
              break;
            }
            history.push(msg);
            for (const call of toolCalls) {
              const args = typeof call.function?.arguments === 'string'
                ? JSON.parse(call.function.arguments || '{}')
                : (call.function?.arguments || {});
              const output = await execMcpTool(toolMap, call.function?.name, args);
              history.push({ role: 'tool', tool_name: call.function?.name, content: output });
            }
          }
          if (signal.aborted) return;
          finish(reply);
        } catch (e: any) {
          if (signal.aborted) return;
          fail('Ollama error', e);
        }

      } else {
        // OpenRouter
        if (!openRouterKey.trim()) {
          addMsg('system', '✕ No OpenRouter API key — enter one and press LINK.');
          if (onStatusChange) onStatusChange('offline');
          return;
        }
        try {
          const toolMap = getMcpToolMap();
          const tools = [...toolMap.values()].map(({ tool }) => ({
            type: 'function',
            function: { name: tool.name, description: tool.description || '', parameters: tool.inputSchema }
          }));

          const history: any[] = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content }))
          ];
          const imageAtts = currentAtts.filter(a => a.type === 'image' && a.base64);
          if (imageAtts.length) {
            history.push({
              role: 'user',
              content: [
                { type: 'text', text: userMsg || 'Analyzing evidence.' },
                ...imageAtts.map(a => ({
                  type: 'image_url',
                  image_url: { url: `data:${a.file.type || 'image/png'};base64,${a.base64}` }
                }))
              ]
            });
          } else {
            history.push({ role: 'user', content: userMsg });
          }

          let reply = 'No response.';
          for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${openRouterKey.trim()}`,
                'X-Title': 'SAGE-7 Neural Terminal'
              },
              body: JSON.stringify({
                model: openRouterModel || 'openrouter/auto',
                messages: history,
                ...(tools.length ? { tools } : {})
              }),
              signal
            });
            if (signal.aborted) return;
            if (!res.ok) {
              const errBody = await res.json().catch(() => null);
              throw new Error(errBody?.error?.message || `HTTP ${res.status}`);
            }
            const data = await res.json();
            const msg = data.choices?.[0]?.message || {};
            const toolCalls = msg.tool_calls || [];
            if (!toolCalls.length || round === MAX_TOOL_ROUNDS) {
              reply = msg.content || 'No response.';
              break;
            }
            history.push(msg);
            for (const call of toolCalls) {
              let args: Record<string, unknown> = {};
              try { args = JSON.parse(call.function?.arguments || '{}'); } catch { /* leave empty */ }
              const output = await execMcpTool(toolMap, call.function?.name, args);
              history.push({ role: 'tool', tool_call_id: call.id, content: output });
            }
          }
          if (signal.aborted) return;
          finish(reply);
        } catch (e: any) {
          if (signal.aborted) return;
          fail('OpenRouter error', e);
        }
      }
    } finally {
      if (!signal.aborted) setIsTyping(false);
    }
  };

  const activeBadge =
    engine === 'gemini' ? 'GEMINI FLASH' :
    engine === 'ollama' ? (ollamaModel || 'NO MODEL') :
    (openRouterModel || 'NO MODEL');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-3 h-full">
      <div className="flex flex-col gap-3">

        {/* Engine + Connection */}
        <Panel title="NEURAL LINK STATUS">
          <div className="space-y-3">
            <div>
              <div className="text-[10px] text-text-ghost font-mono tracking-widest mb-1.5 uppercase">SYNTHESIS ENGINE</div>
              <div className="flex gap-1">
                <button
                  onClick={() => setEngine('gemini')}
                  className={cn(
                    "flex-1 py-1.5 border rounded-sm font-orbitron text-[8px] tracking-wider transition-all",
                    engine === 'gemini' ? "border-neon-violet text-neon-violet bg-neon-violet/10" : "border-border-subtle text-text-ghost hover:border-text-dim"
                  )}
                >GEMINI</button>
                <button
                  onClick={() => setEngine('ollama')}
                  className={cn(
                    "flex-1 py-1.5 border rounded-sm font-orbitron text-[8px] tracking-wider transition-all",
                    engine === 'ollama' ? "border-neon-blue text-neon-blue bg-neon-blue/10" : "border-border-subtle text-text-ghost hover:border-text-dim"
                  )}
                >OLLAMA</button>
                <button
                  onClick={() => setEngine('openrouter')}
                  className={cn(
                    "flex-1 py-1.5 border rounded-sm font-orbitron text-[8px] tracking-wider transition-all",
                    engine === 'openrouter' ? "border-neon-cyan text-neon-cyan bg-neon-cyan/10" : "border-border-subtle text-text-ghost hover:border-text-dim"
                  )}
                >OPENRTR</button>
              </div>
            </div>

            {engine === 'ollama' && (
              <div className="space-y-2">
                <div className="text-[10px] text-text-ghost font-mono tracking-widest uppercase">ENDPOINT</div>
                <div className="flex gap-1">
                  <input
                    value={ollamaEndpoint}
                    onChange={e => setOllamaEndpoint(e.target.value)}
                    className="flex-1 bg-black/50 border border-border-subtle px-2 py-1 font-mono text-[11px] text-text-bright outline-none focus:border-neon-blue rounded-sm transition-colors min-w-0"
                  />
                  <button
                    onClick={connectOllama}
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
                        onClick={() => setOllamaModel(m)}
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

            {engine === 'openrouter' && (
              <div className="space-y-2">
                <div className="text-[10px] text-text-ghost font-mono tracking-widest uppercase">API KEY</div>
                <div className="flex gap-1">
                  <input
                    type="password"
                    value={openRouterKey}
                    onChange={e => setOpenRouterKey(e.target.value)}
                    placeholder="sk-or-..."
                    className="flex-1 bg-black/50 border border-border-subtle px-2 py-1 font-mono text-[11px] text-text-bright outline-none focus:border-neon-cyan rounded-sm transition-colors min-w-0"
                  />
                  <button
                    onClick={connectOpenRouter}
                    disabled={openRouterStatus === 'connecting'}
                    className="px-2.5 py-1 bg-neon-cyan/10 border border-neon-cyan rounded-sm font-orbitron text-[9px] text-neon-cyan tracking-widest hover:bg-neon-cyan/20 transition-all disabled:opacity-50"
                  >
                    {openRouterStatus === 'connecting' ? '...' : 'LINK'}
                  </button>
                </div>
                <div className={cn("font-mono text-[10px]",
                  openRouterStatus === 'connected' ? "text-neon-green" :
                  openRouterStatus === 'error' ? "text-neon-red" :
                  openRouterStatus === 'connecting' ? "text-neon-gold" : "text-text-ghost"
                )}>
                  {openRouterStatus === 'connected' ? `● CONNECTED — ${openRouterModels.length} model(s)` :
                   openRouterStatus === 'error' ? '● CONNECTION FAILED' :
                   openRouterStatus === 'connecting' ? '● CONNECTING...' : '● KEY REQUIRED'}
                </div>

                <div className="text-[10px] text-text-ghost font-mono tracking-widest uppercase">MODEL</div>
                <input
                  list="openrouter-models"
                  value={openRouterModel}
                  onChange={e => setOpenRouterModel(e.target.value)}
                  placeholder="openrouter/auto"
                  className="w-full bg-black/50 border border-border-subtle px-2 py-1 font-mono text-[11px] text-text-bright outline-none focus:border-neon-cyan rounded-sm transition-colors"
                />
                <datalist id="openrouter-models">
                  {openRouterModels.map(m => <option key={m} value={m} />)}
                </datalist>
              </div>
            )}

            <div>
              <div className="text-[10px] text-text-ghost font-mono tracking-widest mb-1.5 uppercase">VOCAL SYNTH</div>
              <button
                onClick={() => setUseTTS(!useTTS)}
                className={cn(
                  "w-full py-1.5 border rounded-sm font-orbitron text-[9px] tracking-widest transition-all",
                  useTTS ? "border-neon-cyan text-neon-cyan bg-neon-cyan/10" : "border-border-subtle text-text-ghost hover:border-text-dim"
                )}
              >{useTTS ? 'ENABLED' : 'DISABLED'}</button>
            </div>

            <div className="p-3 border border-border-subtle bg-black/40 rounded-sm">
              <div className="text-[20px] font-orbitron font-bold text-neon-blue">{messages.filter(m => m.role !== 'system').length}</div>
              <div className="text-[9px] text-text-ghost font-mono uppercase tracking-wider">TELEMETRY PACKETS</div>
            </div>
          </div>
        </Panel>

        {/* MCP tool servers */}
        <Panel title="MCP TOOL MATRIX">
          <div className="space-y-2">
            <div className="flex gap-1">
              <input
                value={mcpUrl}
                onChange={e => setMcpUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && connectMcp()}
                placeholder="http://localhost:3000/mcp"
                className="flex-1 bg-black/50 border border-border-subtle px-2 py-1 font-mono text-[11px] text-text-bright outline-none focus:border-neon-gold rounded-sm transition-colors min-w-0"
              />
              <button
                onClick={connectMcp}
                disabled={mcpConnecting || !mcpUrl.trim()}
                className="px-2.5 py-1 bg-neon-gold/10 border border-neon-gold rounded-sm font-orbitron text-[9px] text-neon-gold tracking-widest hover:bg-neon-gold/20 transition-all disabled:opacity-50"
              >
                {mcpConnecting ? '...' : 'ADD'}
              </button>
            </div>

            {mcpServers.length === 0 ? (
              <div className="font-mono text-[10px] text-text-ghost">● NO SERVERS — add a streamable-HTTP MCP endpoint</div>
            ) : (
              <div className="border border-border-subtle rounded-sm overflow-hidden">
                {mcpServers.map(s => (
                  <div key={s.endpoint} className="px-2 py-1.5 border-b border-border-subtle last:border-0 flex items-center gap-2 font-mono text-[10px] text-text-dim">
                    <Wrench size={10} className="text-neon-gold flex-shrink-0" />
                    <span className="truncate flex-1" title={s.endpoint}>{s.serverInfo.name || s.endpoint}</span>
                    <span className="text-neon-gold flex-shrink-0">{s.tools.length}⚙</span>
                    <button onClick={() => removeMcp(s.endpoint)} className="text-text-ghost hover:text-neon-red flex-shrink-0" title="Disconnect">
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setMcpEnabled(!mcpEnabled)}
              className={cn(
                "w-full py-1.5 border rounded-sm font-orbitron text-[9px] tracking-widest transition-all",
                mcpEnabled ? "border-neon-gold text-neon-gold bg-neon-gold/10" : "border-border-subtle text-text-ghost hover:border-text-dim"
              )}
            >
              {mcpEnabled ? `TOOLS ARMED (${mcpToolCount})` : 'TOOLS DISARMED'}
            </button>
            {engine === 'gemini' && mcpToolCount > 0 && (
              <div className="font-mono text-[9px] text-text-ghost">MCP tools apply to OLLAMA / OPENRTR engines</div>
            )}
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

      {/* Chat area */}
      <div className="flex flex-col bg-panel border border-border-subtle rounded-sm overflow-hidden terminal-scanlines">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle bg-neon-violet/5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse shadow-[0_0_4px_#00FF00]" />
            <span className="font-orbitron text-[10px] font-bold text-neon-violet tracking-widest uppercase">SAGE-7 // PERSISTENT NEURAL TERMINAL</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[9px] text-neon-cyan opacity-60">Φ_{phi.toFixed(2)}</span>
            {mcpEnabled && mcpToolCount > 0 && (
              <span className="px-2 py-0.5 bg-neon-gold/10 border border-neon-gold/30 rounded-sm font-mono text-[9px] text-neon-gold tracking-wider">
                MCP×{mcpToolCount}
              </span>
            )}
            <span className="px-2 py-0.5 bg-neon-blue/10 border border-neon-blue/30 rounded-sm font-mono text-[9px] text-neon-blue tracking-wider">
              {activeBadge}
            </span>
          </div>
        </div>

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
                  <button onClick={() => speak(m.content)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-neon-violet hover:text-neon-blue" title="Play TTS">
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
                  <button onClick={() => removeAttachment(idx)} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-neon-red text-white rounded-full flex items-center justify-center z-10">
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
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" multiple accept="image/*,video/*,audio/*,.pdf,.txt" />
              <button onClick={() => fileInputRef.current?.click()} className="bg-void border border-border-subtle text-text-ghost p-2 rounded-sm hover:text-neon-blue hover:border-neon-blue transition-all" title="Attach">
                <Paperclip size={18} />
              </button>
              <button
                onClick={toggleDictation}
                className={cn("bg-void border border-border-subtle p-2 rounded-sm transition-all", isDictating ? "text-neon-blue border-neon-blue animate-pulse" : "text-text-ghost hover:text-neon-blue hover:border-neon-blue")}
                title="Dictate"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
              </button>
              <button
                onMouseDown={startRecording} onMouseUp={stopRecording} onMouseLeave={stopRecording}
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
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
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
              onClick={handleSend}
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
              <span>THREAT_LVL: {neuro.cortisol > 50 ? 'HIGH' : 'LOW'}</span>
            </div>
            <span>Φ_{phi.toFixed(2)} // {isTyping ? 'SYNTHESIZING' : 'STABLE'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

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
