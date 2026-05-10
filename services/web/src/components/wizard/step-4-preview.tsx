// Step 4 — render 호출 → 미리보기 (Aurora swap, Loop 2 Build 2026-05-10).
// Cycle 2 Fix (F5, 🟠-6): individual selector + useShallow → 무관 필드 변경 시 re-render 0.
// Cycle 3 Fix (F6, Done #6): watermark 토글 명확화 + localStorage 영속.
// 외장: carousel design/aurora-2.jsx Editor canvas (slide thumbnails strip + Brand DSL panel) 흡수.
// Layer 1 격리: SlidePreviewBoundary는 그대로 (사용자 brand DSL은 그 안에서만 적용).
// Loop 2 Fix (F1, m4): WatermarkFieldset + RenderPreviewGrid sub-component 분리 — 본 함수 ~85 LOC.
'use client';
import { useState } from 'react';
import { ArrowRight, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useWizardStore } from '@/stores/wizard-store';
import { useBrandDsl } from '@/contexts/brand-dsl-context';
import { SlidePreviewBoundary } from '@/components/slide-preview-boundary';
import type { RenderResult } from '@/repositories/interfaces/IRenderGateway';
import type { BrandDsl } from '@/repositories/interfaces/IRenderGateway';
import { AuroraButton, AuroraChip } from '@/components/aurora/primitives';

export function Step4Preview() {
  const { slides, ratio, templateId, watermark } = useWizardStore(
    useShallow((s) => ({
      slides: s.slides,
      ratio: s.ratio,
      templateId: s.templateId,
      watermark: s.watermark,
    })),
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
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ templateId, ratio, slides, brand, watermark }),
      });
      const j = (await res.json()) as RenderResult & { error?: string };
      if (!res.ok) throw new Error(j.error ?? `${res.status}`);
      setResult(j);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-labelledby="step4" className="space-y-6">
      <header>
        <h2 id="step4" className="text-2xl font-bold text-ink tracking-[-0.01em]">
          4. 미리보기
        </h2>
        <p className="mt-1 text-sm text-ink-2">render 서비스로 PNG 생성 후 확인.</p>
      </header>
      <WatermarkFieldset watermark={watermark} onChange={setWatermark} />
      <AuroraButton
        onClick={doRender}
        disabled={loading || slides.length === 0}
        variant="primary"
        style={{ padding: '12px 22px', fontSize: 14 }}>
        <ImageIcon size={14} strokeWidth={1.6} />
        {loading ? '렌더링 중...' : 'render 호출'}
      </AuroraButton>
      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-[12px] border p-3 text-sm"
          style={{
            background: 'rgba(240,74,107,.06)',
            borderColor: 'rgba(240,74,107,.2)',
            color: 'var(--aurora-danger)',
          }}>
          <AlertTriangle size={16} strokeWidth={1.6} />
          <span className="font-medium">렌더 실패: {error}</span>
        </div>
      ) : null}
      {result ? <RenderPreviewGrid result={result} brand={brand} watermark={watermark} /> : null}
      <div className="flex justify-between pt-2">
        <AuroraButton onClick={prev} variant="ghost" style={{ padding: '10px 16px' }}>
          ← 이전
        </AuroraButton>
        <AuroraButton
          onClick={next}
          disabled={!result}
          variant="primary"
          style={{ padding: '12px 22px', fontSize: 14, opacity: !result ? 0.55 : 1 }}>
          다음 → 발행
          <ArrowRight size={14} strokeWidth={1.6} />
        </AuroraButton>
      </div>
    </section>
  );
}

// WatermarkFieldset — 워터마크 토글 fieldset + Aurora chip on/off.
// aria-checked 보존 (data-testid="watermark-toggle"). Loop 2 Fix F1 분리.
function WatermarkFieldset({
  watermark,
  onChange,
}: {
  watermark: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <fieldset
      className="rounded-[12px] border bg-aurora-surface-2 p-3.5"
      aria-labelledby="watermark-label"
      style={{ borderColor: 'var(--aurora-line)' }}>
      <legend
        id="watermark-label"
        className="px-1 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-2">
        워터마크 설정
      </legend>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          role="switch"
          aria-checked={watermark}
          data-testid="watermark-toggle"
          checked={watermark}
          onChange={(e) => onChange(e.target.checked)}
          className="accent-violet"
        />
        <span className="font-medium">워터마크 포함</span>
        <AuroraChip tone={watermark ? 'mint' : 'default'}>
          {watermark ? '하단 모서리에 표시됨' : '표시 안 됨'} · 자동 저장
        </AuroraChip>
      </label>
    </fieldset>
  );
}

// RenderPreviewGrid — render 결과 PNG grid + watermark overlay.
// SlidePreviewBoundary 안에서만 brand DSL 적용 (Layer 1 격리). Loop 2 Fix F1 분리.
function RenderPreviewGrid({
  result,
  brand,
  watermark,
}: {
  result: RenderResult;
  brand: BrandDsl;
  watermark: boolean;
}) {
  return (
    <SlidePreviewBoundary brand={brand} className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {result.pngUrls.map((url, i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-[12px] border"
          style={{ borderColor: 'var(--aurora-line)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={`slide ${i + 1}`} className="w-full" />
          {watermark ? (
            <span
              data-testid="watermark-overlay"
              className="aurora-tag absolute bottom-1.5 right-1.5 text-[10px]"
              style={{
                background: 'rgba(0,0,0,.55)',
                color: '#fff',
                borderColor: 'transparent',
              }}>
              slidesmith
            </span>
          ) : null}
        </div>
      ))}
    </SlidePreviewBoundary>
  );
}
