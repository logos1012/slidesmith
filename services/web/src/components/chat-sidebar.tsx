// ChatSidebar — SSE chat (BFF /api/chat/stream → llm /chat/stream).
// 위저드 옆 사이드바. Aurora swap (Loop 2 Build 2026-05-10):
//   - violet user bubble (grad-button, white text)
//   - glassy assistant bubble (aurora-surface-2, ink text)
//   - 외장은 carousel design/aurora-2.jsx 우측 320px 패널 패턴 흡수.
'use client';
import { useRef, useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { useWizardStore } from '@/stores/wizard-store';
import { AuroraButton } from '@/components/aurora/primitives';

interface Msg {
  role: 'user' | 'assistant';
  text: string;
}

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
    setMessages((m) => [
      ...m,
      { role: 'user', text: message },
      { role: 'assistant', text: '' },
    ]);
    setStreaming(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message, sessionId }),
        signal: ctrl.signal,
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
    } catch {
      /* aborted or stream error — UI continues */
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  return (
    <aside
      aria-label="Chat"
      className="flex h-full w-80 flex-col border-l bg-aurora-surface"
      style={{ borderColor: 'var(--aurora-line)' }}>
      <header
        className="flex items-center gap-2 border-b px-4 py-3 text-sm font-bold text-ink"
        style={{ borderColor: 'var(--aurora-line)' }}>
        <span
          aria-hidden
          className="grid h-6 w-6 place-items-center rounded-[8px] text-white"
          style={{ background: 'var(--grad-button)' }}>
          <Sparkles size={12} strokeWidth={1.8} />
        </span>
        AI 도우미
      </header>
      <div className="flex-1 overflow-auto px-4 py-3 space-y-3 text-sm">
        {messages.length === 0 && (
          <div
            className="rounded-[12px] border border-dashed p-3 text-ink-3"
            style={{ borderColor: 'var(--aurora-line-2)' }}>
            <p className="leading-relaxed">위저드 진행 중 궁금한 점을 물어보세요.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <ChatBubble key={i} role={m.role} text={m.text} />
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="flex gap-2 border-t p-3"
        style={{ borderColor: 'var(--aurora-line)' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={streaming}
          placeholder="메시지 입력..."
          aria-label="message input"
          className="flex-1 rounded-[10px] border bg-aurora-surface-2 px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-violet"
          style={{ borderColor: 'var(--aurora-line)' }}
        />
        <AuroraButton type="submit" disabled={streaming} variant="primary" style={{ padding: '8px 12px', fontSize: 12 }}>
          <Send size={12} strokeWidth={1.8} />
          {streaming ? '전송중' : '전송'}
        </AuroraButton>
      </form>
    </aside>
  );
}

function ChatBubble({ role, text }: { role: 'user' | 'assistant'; text: string }) {
  const isUser = role === 'user';
  return (
    <div className={isUser ? 'flex justify-end' : 'flex justify-start'}>
      <div
        className="max-w-[260px] rounded-[14px] px-3 py-2"
        style={
          isUser
            ? { background: 'var(--grad-button)', color: '#fff' }
            : { background: 'var(--aurora-surface-2)', color: 'var(--aurora-ink)' }
        }>
        <span
          className="font-mono text-[9px] uppercase opacity-70"
          style={{ color: isUser ? 'rgba(255,255,255,.85)' : 'var(--aurora-ink-3)' }}>
          {role}
        </span>
        <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{text}</p>
      </div>
    </div>
  );
}
