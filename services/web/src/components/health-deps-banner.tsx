// HealthDepsBanner — 9-light status (DESIGN-v3 §3-12)
// 4 서비스 (web/llm/render/storage) + 4 외부 (anthropic/airtable/s3/gemini) + 1 saga = 9.
// Monochrome dot styling — 텍스트 + 아이콘 + 점선 5-channel ARIA.
'use client';
import { useEffect, useState } from 'react';
import type { DepStatus, ServiceStatus } from '@/types/foundation';

interface DepsResponse {
  web: DepStatus; llm: DepStatus; render: DepStatus; storage: DepStatus;
  external: { anthropic: DepStatus; airtable: DepStatus; s3: DepStatus; gemini: DepStatus };
  saga?: DepStatus;
}

const LABELS: Array<[string, (d: DepsResponse) => DepStatus]> = [
  ['web', (d) => d.web], ['llm', (d) => d.llm], ['render', (d) => d.render],
  ['storage', (d) => d.storage], ['anthropic', (d) => d.external.anthropic],
  ['airtable', (d) => d.external.airtable], ['s3', (d) => d.external.s3],
  ['gemini', (d) => d.external.gemini], ['saga', (d) => d.saga ?? { status: 'ok', responseMs: 0 }],
];

const DOT: Record<ServiceStatus, string> = {
  ok: 'bg-text', degraded: 'bg-text-muted border border-text-muted',
  down: 'bg-bg border-2 border-dashed border-text', unknown: 'bg-bg border border-text-subtle',
};

const ICON: Record<ServiceStatus, string> = { ok: '●', degraded: '◐', down: '✗', unknown: '○' };

export function HealthDepsBanner({ pollMs = 5000 }: { pollMs?: number }) {
  const [data, setData] = useState<DepsResponse | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const r = await fetch('/api/health/deps');
        if (!r.ok) return;
        const j = (await r.json()) as DepsResponse;
        if (!cancelled) setData(j);
      } catch { /* tolerate transient errors */ }
    }
    void tick();
    const id = setInterval(tick, pollMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [pollMs]);
  if (!data) return null;
  return (
    <div role="status" aria-label="System dependencies"
      className="flex flex-wrap items-center gap-3 border border-border bg-surface px-3 py-2 text-xs text-text-muted">
      {LABELS.map(([name, pick]) => {
        const s = pick(data).status;
        return (
          <span key={name} className="inline-flex items-center gap-1.5">
            <span aria-hidden className={`h-2 w-2 rounded-full ${DOT[s]}`} />
            <span aria-label={`${name} ${s}`}>{name}</span>
            <span aria-hidden className="text-text-subtle">{ICON[s]}</span>
          </span>
        );
      })}
    </div>
  );
}
