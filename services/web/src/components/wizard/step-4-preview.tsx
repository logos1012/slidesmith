// Step 4 — render 호출 → 미리보기
// Cycle 2 Fix (F5, 🟠-6): individual selector + useShallow → 무관 필드 변경 시 re-render 0.
// Cycle 3 Fix (F6, Done #6): watermark 토글 명확화 + localStorage 영속 (wizard-store F5와 함께 박제).
'use client';
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useWizardStore } from '@/stores/wizard-store';
import { useBrandDsl } from '@/contexts/brand-dsl-context';
import { SlidePreviewBoundary } from '@/components/slide-preview-boundary';
import type { RenderResult } from '@/repositories/interfaces/IRenderGateway';

export function Step4Preview() {
  const { slides, ratio, templateId, watermark } = useWizardStore(
    useShallow((s) => ({ slides: s.slides, ratio: s.ratio, templateId: s.templateId, watermark: s.watermark })),
  );
  const setWatermark = useWizardStore((s) => s.setWatermark);
  const next = useWizardStore((s) => s.next);
  const prev = useWizardStore((s) => s.prev);
  const { brand } = useBrandDsl();
  const [result, setResult] = useState<RenderResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function doRender() {
    if (!templateId) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/render', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ templateId, ratio, slides, brand, watermark }),
      });
      const j = (await res.json()) as RenderResult & { error?: string };
      if (!res.ok) throw new Error(j.error ?? `${res.status}`);
      setResult(j);
    } catch (e) { setError(String(e)); } finally { setLoading(false); }
  }

  return (
    <section aria-labelledby="step4" className="space-y-6">
      <header><h2 id="step4" className="text-2xl font-semibold text-text">4. 미리보기</h2>
        <p className="text-sm text-text-muted">render 서비스로 PNG 생성 후 확인.</p></header>
      <fieldset className="border border-border p-3 space-y-2" aria-labelledby="watermark-label">
        <legend id="watermark-label" className="px-1 text-xs font-medium text-text-muted">워터마크 설정</legend>
        <label className="flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            role="switch"
            aria-checked={watermark}
            data-testid="watermark-toggle"
            checked={watermark}
            onChange={(e) => setWatermark(e.target.checked)}
          />
          <span>워터마크 포함</span>
          <span className="text-xs text-text-muted">
            ({watermark ? '하단 모서리에 표시됨' : '표시 안 됨'} · 자동 저장)
          </span>
        </label>
      </fieldset>
      <button type="button" onClick={doRender} disabled={loading || slides.length === 0}
        className="bg-active text-active-text px-6 py-2 text-sm font-medium border border-border-strong disabled:opacity-50">
        {loading ? '렌더링 중...' : 'render 호출'}
      </button>
      {error ? <p className="text-sm text-text" role="alert">렌더 실패: {error}</p> : null}
      {result ? (
        <SlidePreviewBoundary brand={brand} className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {result.pngUrls.map((url, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`slide ${i + 1}`} className="border border-border w-full" />
              {watermark ? (
                <span
                  data-testid="watermark-overlay"
                  className="absolute bottom-1 right-1 px-1 text-[10px] bg-active text-active-text border border-border-strong"
                >
                  slidesmith
                </span>
              ) : null}
            </div>
          ))}
        </SlidePreviewBoundary>
      ) : null}
      <div className="flex justify-between">
        <button type="button" onClick={prev} className="px-4 py-2 text-sm border border-border text-text-muted">← 이전</button>
        <button type="button" onClick={next} disabled={!result}
          className="bg-active text-active-text px-6 py-2 text-sm font-medium border border-border-strong disabled:opacity-50">
          다음 → 발행
        </button>
      </div>
    </section>
  );
}
