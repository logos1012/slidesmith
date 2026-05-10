// Step 1 — Brief 입력 (주제 + ratio + platform)
// Cycle 2 Fix (F5, 🟠-6): individual selector + useShallow → 무관 필드 변경 시 re-render 0.
'use client';
import { useShallow } from 'zustand/react/shallow';
import { useWizardStore } from '@/stores/wizard-store';
import type { AspectRatio, Platform } from '@/types/foundation';

const RATIOS: AspectRatio[] = ['1:1', '4:5', '9:16'];
const PLATFORMS: Platform[] = ['instagram', 'threads', 'twitter'];

export function Step1Input() {
  const { brief, ratio, platform } = useWizardStore(
    useShallow((s) => ({ brief: s.brief, ratio: s.ratio, platform: s.platform })),
  );
  // Action 함수는 stable reference (Zustand action은 setter라 매 렌더 동일).
  const setBrief = useWizardStore((s) => s.setBrief);
  const setRatio = useWizardStore((s) => s.setRatio);
  const setPlatform = useWizardStore((s) => s.setPlatform);
  const next = useWizardStore((s) => s.next);
  return (
    <section aria-labelledby="step1" className="space-y-6">
      <header><h2 id="step1" className="text-2xl font-semibold text-text">1. 주제 입력</h2>
        <p className="text-sm text-text-muted">한 줄로 만들 카루셀 주제를 적어주세요.</p></header>
      <textarea value={brief} onChange={(e) => setBrief(e.target.value)}
        rows={4} maxLength={2000}
        placeholder="예: 솔로 PoC 사이드프로젝트 1주 만에 출시한 5가지 결정"
        className="w-full border border-border bg-bg p-3 text-text outline-none focus:border-border-strong" />
      <div className="grid grid-cols-2 gap-4">
        <div><label className="text-sm text-text-muted">비율</label>
          <div className="mt-2 flex gap-2">
            {RATIOS.map((r) => (
              <button key={r} type="button" onClick={() => setRatio(r)}
                className={`px-3 py-1.5 text-sm border ${ratio === r ? 'bg-active text-active-text border-border-strong' : 'border-border text-text-muted'}`}>
                {r}
              </button>
            ))}
          </div></div>
        <div><label className="text-sm text-text-muted">플랫폼</label>
          <div className="mt-2 flex gap-2">
            {PLATFORMS.map((p) => (
              <button key={p} type="button" onClick={() => setPlatform(p)}
                className={`px-3 py-1.5 text-sm border ${platform === p ? 'bg-active text-active-text border-border-strong' : 'border-border text-text-muted'}`}>
                {p}
              </button>
            ))}
          </div></div>
      </div>
      <div className="flex justify-end">
        <button type="button" onClick={next} disabled={brief.trim().length < 5}
          className="bg-active text-active-text px-6 py-2 text-sm font-medium border border-border-strong disabled:opacity-50">
          다음 → 템플릿 선택
        </button>
      </div>
    </section>
  );
}
