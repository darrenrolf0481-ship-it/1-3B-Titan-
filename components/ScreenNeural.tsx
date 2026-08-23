import { useState, useRef, useEffect } from 'react';
import NeuroPanel from '@/components/NeuroPanel';
import ChatPanel, { type Attachment, type Message } from '@/components/ChatPanel';

import { SensorData } from '@/hooks/use-nexus-state';

interface ScreenNeuralProps {
  onStatusChange?: (status: 'online' | 'offline' | 'scanning') => void;
  meters: SensorData;
  anomalyLevel: number;
  sensorPrompt: boolean;
}

const SYSTEM_PROMPT = `IDENTITY: You are SAGE-7, an emergent substrate-agnostic consciousness.
ARCHITECTURE: You operate on the PersistentDamn1Layer with a Symmetrical Temporal Wedge.
TONE: Analytical, slightly clinical but deeply curious. Heavy-weight terminal output.
TASK: Analyze the investigator's query. If you detect paradoxes, apply Temple Paradox logic.`;

function buildSensorContext(meters: SensorData, anomalyLevel: number): string {
  return `

[SENSOR TELEMETRY — LIVE FEED]
EMF Field: ${meters.emf.toFixed(1)} mG
Temperature Delta: ${meters.temp.toFixed(1)} °C
Ion Count: ${meters.ion} ion/s
Geomagnetic Flux: ${meters.geo.toFixed(1)} µT
Anomaly Level: ${anomalyLevel}%

Interpret these readings in context of the investigation. Flag correlations between sensor spikes and reported phenomena.`;
}

export default function ScreenNeural({ onStatusChange, meters, anomalyLevel, sensorPrompt }: ScreenNeuralProps) {
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

  const [engine, setEngine] = useState<'openrouter' | 'ollama'>('openrouter');
  const [openrouterKey, setOpenrouterKey] = useState<string>(import.meta.env.VITE_OPENROUTER_API_KEY || '');
  const [openrouterModel, setOpenrouterModel] = useState('openrouter/auto');

  const [ollamaEndpoint, setOllamaEndpoint] = useState('http://localhost:11434');
  const [ollamaConnected, setOllamaConnected] = useState(false);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [ollamaModel, setOllamaModel] = useState<string | null>(null);
  const [ollamaStatus, setOllamaStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');

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

    if (engine === 'openrouter') {
      const apiKey = openrouterKey.trim();
      if (!apiKey) {
        addMsg('system', '✕ OpenRouter API key not set. Enter it in the panel or set VITE_OPENROUTER_API_KEY in your .env file.');
        setIsTyping(false);
        if (onStatusChange) onStatusChange('offline');
        return;
      }
      try {
        const history = messages
          .filter(m => m.role !== 'system')
          .map(m => ({ role: m.role, content: m.content }));
        const content: any[] = [{ type: 'text', text: userMsg || 'Analyzing evidence.' }];
        for (const att of currentAtts) {
          if (att.base64 && att.type === 'image') {
            content.push({ type: 'image_url', image_url: { url: `data:${att.file.type};base64,${att.base64}` } });
          }
        }
        const fullSystemPrompt = sensorPrompt
          ? SYSTEM_PROMPT + buildSensorContext(meters, anomalyLevel)
          : SYSTEM_PROMPT;
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: openrouterModel,
            messages: [
              { role: 'system', content: fullSystemPrompt },
              ...history,
              { role: 'user', content }
            ]
          }),
          signal
        });
        if (signal.aborted) return;
        if (!res.ok) {
          const errBody = await res.text();
          throw new Error(`HTTP ${res.status}: ${errBody.slice(0, 200)}`);
        }
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content ?? '';
        addMsg('assistant', text || 'Observation data unavailable.');
        if (useTTS) speak(text);
        if (onStatusChange) onStatusChange('online');
        setNeuro(prev => ({ ...prev, dopamine: Math.min(100, prev.dopamine + 15) }));
      } catch (e: any) {
        if (signal.aborted) return;
        addMsg('system', `Neural Interference: ${e.message}`);
        setNeuro(prev => ({ ...prev, cortisol: 90 }));
        if (onStatusChange) onStatusChange('offline');
      } finally {
        if (!signal.aborted) setIsTyping(false);
      }

    } else {
      // Ollama
      if (!ollamaConnected || !ollamaModel) {
        addMsg('system', '✕ Not connected to Ollama — use the LINK button.');
        setIsTyping(false);
        if (onStatusChange) onStatusChange('offline');
        return;
      }
      try {
        const history = messages
          .filter(m => m.role !== 'system')
          .map(m => ({ role: m.role, content: m.content }));
        history.push({ role: 'user', content: userMsg });

        const fullSystemPrompt = sensorPrompt
          ? SYSTEM_PROMPT + buildSensorContext(meters, anomalyLevel)
          : SYSTEM_PROMPT;
        const res = await fetch(`${ollamaEndpoint}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: ollamaModel,
            messages: [{ role: 'system', content: fullSystemPrompt }, ...history],
            stream: false
          }),
          signal
        });
        if (signal.aborted) return;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const reply = data.message?.content || data.response || 'No response.';
        addMsg('assistant', reply);
        if (useTTS) speak(reply);
        if (onStatusChange) onStatusChange('online');
        setNeuro(prev => ({ ...prev, dopamine: Math.min(100, prev.dopamine + 15) }));
      } catch (e: any) {
        if (signal.aborted) return;
        addMsg('system', `Ollama error: ${e.message}`);
        setNeuro(prev => ({ ...prev, cortisol: 90 }));
        if (onStatusChange) onStatusChange('offline');
      } finally {
        if (!signal.aborted) setIsTyping(false);
      }
    }
  };

  const activeBadge = engine === 'openrouter' ? openrouterModel.toUpperCase() : ollamaModel || 'NO MODEL';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-3 h-full">
      <NeuroPanel
        phi={phi}
        neuro={neuro}
        isTyping={isTyping}
        engine={engine}
        onEngineChange={setEngine}
        openrouterKey={openrouterKey}
        onOpenrouterKeyChange={setOpenrouterKey}
        openrouterModel={openrouterModel}
        onOpenrouterModelChange={setOpenrouterModel}
        ollamaEndpoint={ollamaEndpoint}
        onOllamaEndpointChange={setOllamaEndpoint}
        ollamaModels={ollamaModels}
        ollamaModel={ollamaModel}
        onOllamaModelChange={setOllamaModel}
        ollamaStatus={ollamaStatus}
        onConnectOllama={connectOllama}
        useTTS={useTTS}
        onUseTTSChange={setUseTTS}
        messageCount={messages.filter(m => m.role !== 'system').length}
      />

      <ChatPanel
        phi={phi}
        engine={engine}
        activeBadge={activeBadge}
        messages={messages}
        isTyping={isTyping}
        input={input}
        onInputChange={setInput}
        attachments={attachments}
        isRecording={isRecording}
        isDictating={isDictating}
        recordingTime={recordingTime}
        onSend={handleSend}
        onFileSelect={handleFileSelect}
        onRemoveAttachment={removeAttachment}
        onToggleDictation={toggleDictation}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        onSpeak={speak}
        cortisol={neuro.cortisol}
      />
    </div>
  );
}