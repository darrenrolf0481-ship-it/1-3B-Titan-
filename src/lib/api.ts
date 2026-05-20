'use client';

export async function generateResponse(
  provider: string,
  model: string,
  prompt: string,
  _settings: any,
  systemPrompt?: string,
  history?: { role: string; content: string }[]
) {
  if (provider === 'google') {
    const apiBase = window.location.origin + window.location.pathname.replace(/\/$/, '');
    const res = await fetch(`${apiBase}/api/gemini/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || 'gemini-2.0-flash',
        message: prompt,
        system: systemPrompt || '',
        history: history || [],
      }),
    });
    if (!res.ok) throw new Error(`Gemini proxy HTTP ${res.status}`);
    const data = await res.json();
    return data.reply || '';
  }

  return `[${provider.toUpperCase()} SIMULATION] I processed your request: "${prompt.substring(0, 30)}..."`;
}
