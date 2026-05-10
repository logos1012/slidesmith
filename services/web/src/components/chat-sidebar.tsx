// ChatSidebar — SSE chat (BFF /api/chat/stream → llm /chat/stream)
// 위저드 옆 사이드바. 사용자 질문을 llm에 던지고 SSE 토큰 stream 표시.
'use client';
import { useRef, useState } from 'react';
import { useWizardStore } from '@/stores/wizard-store';

interface Msg { role: 'user' | 'assistant'; text: string }

export function ChatSidebar() {
  const sessionId = useWizardStore((s) => s.sessionId);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function send() {
    const message = input.trim();
    if (!message || streaming) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: message }, { role: 'assistant', text: '' }]);
    setStreaming(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message, sessionId }), signal: ctrl.signal,
      });
      const reader = res.body?.getReader();
      const dec = new TextDecoder();
      while (reader) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value);
        setMessages((m) => {
          const copy = [...m];
          const last = copy[copy.length - 1];
          if (last) copy[copy.length - 1] = { ...last, text: last.text + chunk };
          return copy;
        });
      }
    } catch { /* aborted or stream error — UI continues */ }
    finally { setStreaming(false); abortRef.current = null; }
  }

  return (
    <aside aria-label="Chat" className="flex h-full w-80 flex-col border-l border-border bg-surface">
      <header className="border-b border-border px-4 py-3 text-sm font-semibold text-text">채팅</header>
      <div className="flex-1 overflow-auto px-4 py-3 space-y-3 text-sm">
        {messages.length === 0 && (
          <p className="text-text-subtle">위저드 진행 중 궁금한 점을 물어보세요.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-text' : 'text-text-muted'}>
            <span className="font-mono text-[10px] uppercase text-text-subtle">{m.role}</span>
            <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
          </div>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); void send(); }}
        className="border-t border-border p-3 flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} disabled={streaming}
          placeholder="메시지 입력..." aria-label="message input"
          className="flex-1 border border-border bg-bg px-2 py-1.5 text-sm text-text outline-none focus:border-border-strong" />
        <button type="submit" disabled={streaming}
          className="bg-active text-active-text px-3 py-1.5 text-sm font-medium border border-border-strong disabled:opacity-50">
          {streaming ? '전송중' : '전송'}
        </button>
      </form>
    </aside>
  );
}
