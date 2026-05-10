// WizardContainer — 5 step 흐름 관리 (Aurora swap, Loop 2 Build 2026-05-10).
// 외장은 carousel design/aurora-1.jsx step rail 패턴 흡수, state는 wizard-store 그대로.
'use client';
import { useWizardStore } from '@/stores/wizard-store';
import { AuroraStepRail } from '@/components/aurora/step-rail';
import { Step1Input } from '@/components/wizard/step-1-input';
import { Step2Template } from '@/components/wizard/step-2-template';
import { Step3Content } from '@/components/wizard/step-3-content';
import { Step4Preview } from '@/components/wizard/step-4-preview';
import { Step5Publish } from '@/components/wizard/step-5-publish';

const STEPS = [
  { num: 1, label: '주제' },
  { num: 2, label: '템플릿' },
  { num: 3, label: '본문' },
  { num: 4, label: '미리보기' },
  { num: 5, label: '발행' },
];

export function WizardContainer() {
  const step = useWizardStore((s) => s.step);
  return (
    <div className="space-y-7">
      <AuroraStepRail steps={STEPS} current={step} />
      <div className="aurora-card p-6">
        {step === 1 ? <Step1Input /> : null}
        {step === 2 ? <Step2Template /> : null}
        {step === 3 ? <Step3Content /> : null}
        {step === 4 ? <Step4Preview /> : null}
        {step === 5 ? <Step5Publish /> : null}
      </div>
    </div>
  );
}
