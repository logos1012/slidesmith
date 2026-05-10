// Step 1 — Brief 입력 (Aurora swap, Loop 2 Build 2026-05-10).
// Cycle 2 Fix (F5, 🟠-6): individual selector + useShallow → 무관 필드 변경 시 re-render 0.
// 외장: carousel design/aurora-1.jsx AuroraBrief big-input + violet ring focus + OptionGroup 흡수.
'use client';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useWizardStore } from '@/stores/wizard-store';
import type { AspectRatio, Platform } from '@/types/foundation';
import { AuroraButton } from '@/components/aurora/primitives';
import { AuroraOptionGroup } from '@/components/aurora/option-group';

const RATIO_OPTIONS: { value: AspectRatio; label: string; hint: string }[] = [
  { value: '1:1', label: '1:1', hint: '1080×1080' },
  { value: '4:5', label: '4:5', hint: '1080×1350' },
  { value: '9:16', label: '9:16', hint: '1080×1920' },
];
const PLATFORM_OPTIONS: { value: Platform; label: string; hint: string }[] = [
  { value: 'instagram', label: 'Instagram', hint: '4:5 권장' },
  { value: 'threads', label: 'Threads', hint: '1:1 권장' },
  { value: 'twitter', label: 'X', hint: '1:1 / 16:9' },
];

export function Step1Input() {
  const { brief, ratio, platform } = useWizardStore(
    useShallow((s) => ({ brief: s.brief, ratio: s.ratio, platform: s.platform })),
  );
  const setBrief = useWizardStore((s) => s.setBrief);
  const setRatio = useWizardStore((s) => s.setRatio);
  const setPlatform = useWizardStore((s) => s.setPlatform);
  const next = useWizardStore((s) => s.next);
  return (
    <section aria-labelledby="step1" className="space-y-6">
      <header>
        <h2 id="step1" className="text-2xl font-bold text-ink tracking-[-0.01em]">
          1. 주제 입력
        </h2>
        <p className="mt-1 text-sm text-ink-2">한 줄로 만들 카루셀 주제를 적어주세요.</p>
      </header>
      <textarea
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        rows={4}
        maxLength={2000}
        placeholder="예: 솔로 PoC 사이드프로젝트 1주 만에 출시한 5가지 결정"
        className="aurora-brief-input w-full rounded-[14px] border bg-aurora-surface-2 p-4 text-base text-ink outline-none transition-colors"
        style={{ borderColor: 'var(--aurora-line)' }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--aurora-violet)';
          e.currentTarget.style.boxShadow = '0 0 0 4px rgba(124,92,255,.15)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--aurora-line)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <AuroraOptionGroup
          label="비율"
          options={RATIO_OPTIONS}
          value={ratio}
          onChange={setRatio}
          cols={3}
        />
        <AuroraOptionGroup
          label="플랫폼"
          options={PLATFORM_OPTIONS}
          value={platform}
          onChange={setPlatform}
          cols={3}
        />
      </div>
      <div className="flex justify-end pt-2">
        <AuroraButton
          onClick={next}
          disabled={brief.trim().length < 5}
          variant="primary"
          style={{ padding: '12px 22px', fontSize: 14, opacity: brief.trim().length < 5 ? 0.55 : 1 }}>
          <Sparkles size={14} strokeWidth={1.6} /> 다음 → 템플릿 선택
          <ArrowRight size={14} strokeWidth={1.6} />
        </AuroraButton>
      </div>
    </section>
  );
}
