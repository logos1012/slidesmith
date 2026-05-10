// Step 3 — Claude로 본문 생성 + 슬라이드 편집 (Cycle 3 A6: 실 LLM 호출).
// Cycle 2 Fix (F5, 🟠-6): individual selector + useShallow → 무관 필드 변경 시 re-render 0.
'use client';
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useWizardStore } from '@/stores/wizard-store';
import type { ContentSlide } from '@/repositories/interfaces/ILlmGateway';

interface ContentResp { slides: ContentSlide[]; userMessage?: string }

export function Step3Content() {
  const { brief, ratio, templateId, slides } = useWizardStore(
    useShallow((s) => ({ brief: s.brief, ratio: s.ratio, templateId: s.templateId, slides: s.slides })),
  );
  const setSlides = useWizardStore((s) => s.setSlides);
  const patchSlide = useWizardStore((s) => s.patchSlide);
  const next = useWizardStore((s) => s.next);
  const prev = useWizardStore((s) => s.prev);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!templateId) return;
    setLoading(true); setError(null);
    try {
      // Cycle 3 (A6): /api/content/generate 실 호출 (mock 제거).
      //   한국어 응답 default — llm 서비스가 system prompt에서 한국어 강제.
      const res = await fetch('/api/content/generate', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ brief, templateId, ratio, slideCount: 5 }),
      });
      const j = (await res.json()) as ContentResp;
      if (!res.ok) {
        setError(j.userMessage ?? '본문 생성 실패. 잠시 후 다시 시도해 주세요.');
        return;
      }
      if (!j.slides?.length) { setError('생성된 슬라이드가 비어있습니다.'); return; }
      setSlides(j.slides);
    } catch (e) { setError(String(e)); } finally { setLoading(false); }
  }

  return (
    <section aria-labelledby="step3" className="space-y-6">
      <header><h2 id="step3" className="text-2xl font-semibold text-text">3. 본문 생성</h2>
        <p className="text-sm text-text-muted">{ratio} / 5장. AI가 한국어 초안 생성 → 직접 편집.</p></header>
      {slides.length === 0 ? (
        <button type="button" onClick={generate} disabled={loading || !templateId}
          className="bg-active text-active-text px-6 py-2 text-sm font-medium border border-border-strong disabled:opacity-50">
          {loading ? '생성 중... (5~10초)' : 'AI로 초안 생성'}
        </button>
      ) : null}
      {error ? <p className="text-sm text-text" role="alert">{error}</p> : null}
      <ol className="space-y-3">
        {slides.map((s, i) => (
          <li key={s.index} className="border border-border p-3 space-y-2">
            <input value={s.title} onChange={(e) => patchSlide(i, { title: e.target.value })}
              aria-label={`slide ${i + 1} title`}
              className="w-full bg-transparent text-base font-semibold text-text outline-none" />
            <textarea value={s.body} onChange={(e) => patchSlide(i, { body: e.target.value })}
              rows={2} aria-label={`slide ${i + 1} body`}
              className="w-full bg-transparent text-sm text-text-muted outline-none resize-none" />
          </li>
        ))}
      </ol>
      <div className="flex justify-between">
        <button type="button" onClick={prev} className="px-4 py-2 text-sm border border-border text-text-muted">← 이전</button>
        <button type="button" onClick={next} disabled={slides.length === 0}
          className="bg-active text-active-text px-6 py-2 text-sm font-medium border border-border-strong disabled:opacity-50">
          다음 → 미리보기
        </button>
      </div>
    </section>
  );
}
