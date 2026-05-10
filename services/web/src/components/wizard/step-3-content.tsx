// Step 3 — Claude로 본문 생성 + 슬라이드 편집 (Aurora swap, Loop 2 Build 2026-05-10).
// Cycle 2 Fix (F5, 🟠-6): individual selector + useShallow → 무관 필드 변경 시 re-render 0.
// 외장: carousel design/aurora-2.jsx AuroraCopy slide cards (gradient accent + 좌측 인덱스 박스) 흡수.
// 데이터: /api/content/generate 실 LLM (Cycle 3 A6).
// Loop 2 Fix (F1, m4): SlideEditCard sub-component 분리 — 본 함수 ~95 LOC.
'use client';
import { useState } from 'react';
import { ArrowRight, Sparkles, AlertTriangle } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useWizardStore } from '@/stores/wizard-store';
import type { ContentSlide } from '@/repositories/interfaces/ILlmGateway';
import { AuroraButton, AuroraChip } from '@/components/aurora/primitives';

interface ContentResp {
  slides: ContentSlide[];
  userMessage?: string;
}

export function Step3Content() {
  const { brief, ratio, templateId, slides } = useWizardStore(
    useShallow((s) => ({
      brief: s.brief,
      ratio: s.ratio,
      templateId: s.templateId,
      slides: s.slides,
    })),
  );
  const setSlides = useWizardStore((s) => s.setSlides);
  const patchSlide = useWizardStore((s) => s.patchSlide);
  const next = useWizardStore((s) => s.next);
  const prev = useWizardStore((s) => s.prev);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!templateId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/content/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ brief, templateId, ratio, slideCount: 5 }),
      });
      const j = (await res.json()) as ContentResp;
      if (!res.ok) {
        setError(j.userMessage ?? '본문 생성 실패. 잠시 후 다시 시도해 주세요.');
        return;
      }
      if (!j.slides?.length) {
        setError('생성된 슬라이드가 비어있습니다.');
        return;
      }
      setSlides(j.slides);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-labelledby="step3" className="space-y-6">
      <header>
        <h2 id="step3" className="text-2xl font-bold text-ink tracking-[-0.01em]">
          3. 본문 생성
        </h2>
        <p className="mt-1 text-sm text-ink-2">
          {ratio} / 5장. AI가 한국어 초안 생성 → 직접 편집.
        </p>
      </header>
      {slides.length === 0 ? (
        <AuroraButton
          onClick={generate}
          disabled={loading || !templateId}
          variant="primary"
          style={{ padding: '12px 22px', fontSize: 14 }}>
          <Sparkles size={14} strokeWidth={1.6} />
          {loading ? '생성 중... (5~10초)' : 'AI로 초안 생성'}
        </AuroraButton>
      ) : null}
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
          <span className="font-medium">{error}</span>
        </div>
      ) : null}
      <ol className="space-y-2.5">
        {slides.map((s, i) => (
          <SlideEditCard
            key={s.index}
            index={i}
            slide={s}
            onPatch={(patch) => patchSlide(i, patch)}
          />
        ))}
      </ol>
      <div className="flex justify-between pt-2">
        <AuroraButton onClick={prev} variant="ghost" style={{ padding: '10px 16px' }}>
          ← 이전
        </AuroraButton>
        <AuroraButton
          onClick={next}
          disabled={slides.length === 0}
          variant="primary"
          style={{ padding: '12px 22px', fontSize: 14, opacity: slides.length === 0 ? 0.55 : 1 }}>
          다음 → 미리보기
          <ArrowRight size={14} strokeWidth={1.6} />
        </AuroraButton>
      </div>
    </section>
  );
}

// SlideEditCard — 좌측 hsl-spectrum 인덱스 박스 + AuroraChip + title/body inline edit.
// aurora-2.jsx AuroraCopy slide card 외장 박제. Loop 2 Fix F1 분리.
function SlideEditCard({
  index,
  slide,
  onPatch,
}: {
  index: number;
  slide: ContentSlide;
  onPatch: (patch: Partial<ContentSlide>) => void;
}) {
  const label = String(index + 1).padStart(2, '0');
  return (
    <li
      className="flex gap-3 rounded-[14px] border bg-aurora-surface p-3"
      style={{ borderColor: 'var(--aurora-line)' }}>
      <div
        aria-hidden
        className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-[12px] text-white"
        style={{
          background: `linear-gradient(160deg, hsl(${260 + index * 16} 90% 65%), hsl(${300 + index * 12} 88% 70%))`,
        }}>
        <span className="font-mono text-[10px]">{label}</span>
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <AuroraChip tone="violet">SLIDE {label}</AuroraChip>
          <span className="font-mono text-[10px] text-ink-3">
            {slide.title.length}자 · {slide.body.length}자
          </span>
        </div>
        <input
          value={slide.title}
          onChange={(e) => onPatch({ title: e.target.value })}
          aria-label={`slide ${index + 1} title`}
          className="w-full bg-transparent text-base font-bold text-ink outline-none"
        />
        <textarea
          value={slide.body}
          onChange={(e) => onPatch({ body: e.target.value })}
          rows={2}
          aria-label={`slide ${index + 1} body`}
          className="w-full bg-transparent text-sm text-ink-2 outline-none resize-none"
        />
      </div>
    </li>
  );
}
