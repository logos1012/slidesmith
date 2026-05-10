// Step 2 — 템플릿 선택 (storage `/templates` BFF)
// Cycle 2 Fix (F5, 🟠-6): individual selector → re-render 0.
'use client';
import { useEffect, useState } from 'react';
import { useWizardStore } from '@/stores/wizard-store';
import type { TemplateRecord } from '@/repositories/interfaces/ITemplateRepo';

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
      .then((j) => { if (!cancelled) setItems(j.items ?? []); })
      .catch(() => { if (!cancelled) setItems([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  return (
    <section aria-labelledby="step2" className="space-y-6">
      <header><h2 id="step2" className="text-2xl font-semibold text-text">2. 템플릿 선택</h2>
        <p className="text-sm text-text-muted">디자인 톤이 가장 비슷한 템플릿을 고르세요.</p></header>
      {loading ? <p className="text-text-muted">불러오는 중...</p> : null}
      {!loading && items.length === 0 ? <p className="text-text-muted">사용 가능한 템플릿이 없습니다 (Cycle 3에서 seed).</p> : null}
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {items.map((t) => (
          <li key={t.id}>
            <button type="button" onClick={() => setTemplate(t.id)}
              aria-pressed={templateId === t.id}
              className={`w-full text-left border p-4 ${templateId === t.id ? 'border-border-strong border-2' : 'border-border'}`}>
              <div className="text-sm font-semibold text-text">{t.name}</div>
              <div className="mt-1 text-xs text-text-muted">{t.description}</div>
              <div className="mt-2 text-xs text-text-subtle">{t.ratios.join(' / ')}</div>
            </button>
          </li>
        ))}
      </ul>
      <div className="flex justify-between">
        <button type="button" onClick={prev} className="px-4 py-2 text-sm border border-border text-text-muted">← 이전</button>
        <button type="button" onClick={next} disabled={!templateId}
          className="bg-active text-active-text px-6 py-2 text-sm font-medium border border-border-strong disabled:opacity-50">
          다음 → 본문 생성
        </button>
      </div>
    </section>
  );
}
