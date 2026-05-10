// Step 2 — 템플릿 선택 (Aurora swap, Loop 2 Build 2026-05-10).
// 외장: carousel design/aurora-1.jsx OptionGroup grid + 5색 spectrum 흡수.
// 데이터: storage `/templates` BFF (Cycle 2 동일).
'use client';
import { useEffect, useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { useWizardStore } from '@/stores/wizard-store';
import type { TemplateRecord } from '@/repositories/interfaces/ITemplateRepo';
import { AuroraButton, AuroraChip } from '@/components/aurora/primitives';

const TEMPLATE_ACCENTS = ['#7c5cff', '#9d6bff', '#c25dff', '#ff5cb1', '#ff6b9d', '#5cb8ff'];

export function Step2Template() {
  const templateId = useWizardStore((s) => s.templateId);
  const setTemplate = useWizardStore((s) => s.setTemplate);
  const next = useWizardStore((s) => s.next);
  const prev = useWizardStore((s) => s.prev);
  const [items, setItems] = useState<TemplateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/templates')
      .then((r) => r.json() as Promise<{ items: TemplateRecord[] }>)
      .then((j) => {
        if (!cancelled) setItems(j.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <section aria-labelledby="step2" className="space-y-6">
      <header>
        <h2 id="step2" className="text-2xl font-bold text-ink tracking-[-0.01em]">
          2. 템플릿 선택
        </h2>
        <p className="mt-1 text-sm text-ink-2">디자인 톤이 가장 비슷한 템플릿을 고르세요.</p>
      </header>
      {loading ? <p className="text-ink-3">불러오는 중...</p> : null}
      {!loading && items.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-line-2 bg-aurora-surface-2 p-6 text-center">
          <p className="text-sm text-ink-2">사용 가능한 템플릿이 없습니다 (Cycle 3에서 seed).</p>
        </div>
      ) : null}
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {items.map((t, i) => {
          const accent = TEMPLATE_ACCENTS[i % TEMPLATE_ACCENTS.length];
          const active = templateId === t.id;
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setTemplate(t.id)}
                aria-pressed={active}
                className="relative w-full overflow-hidden rounded-[14px] border-2 p-3 text-left transition-shadow"
                style={{
                  borderColor: active ? 'var(--aurora-violet)' : 'var(--aurora-line)',
                  background: 'var(--aurora-surface)',
                  boxShadow: active ? '0 8px 24px -12px rgba(124,92,255,.4)' : 'none',
                }}>
                <div
                  aria-hidden
                  className="mb-2 h-20 w-full rounded-[10px]"
                  style={{
                    background: `linear-gradient(160deg, ${accent} 0%, ${accent}cc 100%)`,
                  }}
                />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">{t.name}</span>
                  {active ? (
                    <Check size={14} strokeWidth={2} style={{ color: 'var(--aurora-violet)' }} />
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-ink-2 line-clamp-2">{t.description}</p>
                <div className="mt-2">
                  <AuroraChip>{t.ratios.join(' / ')}</AuroraChip>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex justify-between pt-2">
        <AuroraButton onClick={prev} variant="ghost" style={{ padding: '10px 16px' }}>
          ← 이전
        </AuroraButton>
        <AuroraButton
          onClick={next}
          disabled={!templateId}
          variant="primary"
          style={{ padding: '12px 22px', fontSize: 14, opacity: !templateId ? 0.55 : 1 }}>
          다음 → 본문 생성
          <ArrowRight size={14} strokeWidth={1.6} />
        </AuroraButton>
      </div>
    </section>
  );
}
