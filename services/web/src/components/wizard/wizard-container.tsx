// WizardContainer — 5 step 흐름 관리
'use client';
import { useWizardStore } from '@/stores/wizard-store';
import { Step1Input } from '@/components/wizard/step-1-input';
import { Step2Template } from '@/components/wizard/step-2-template';
import { Step3Content } from '@/components/wizard/step-3-content';
import { Step4Preview } from '@/components/wizard/step-4-preview';
import { Step5Publish } from '@/components/wizard/step-5-publish';

const STEPS = [
  { num: 1, label: '주제' }, { num: 2, label: '템플릿' }, { num: 3, label: '본문' },
  { num: 4, label: '미리보기' }, { num: 5, label: '발행' },
];

export function WizardContainer() {
  const step = useWizardStore((s) => s.step);
  return (
    <div className="space-y-8">
      <ol aria-label="wizard progress" className="flex items-center gap-2 text-xs">
        {STEPS.map((s) => (
          <li key={s.num} className={`flex items-center gap-2 ${step === s.num ? 'text-text font-semibold' : 'text-text-subtle'}`}>
            <span className={`inline-flex h-5 w-5 items-center justify-center border ${step >= s.num ? 'border-border-strong bg-active text-active-text' : 'border-border'}`}>
              {s.num}
            </span>
            <span>{s.label}</span>
            {s.num < 5 ? <span aria-hidden className="text-text-subtle">→</span> : null}
          </li>
        ))}
      </ol>
      {step === 1 ? <Step1Input /> : null}
      {step === 2 ? <Step2Template /> : null}
      {step === 3 ? <Step3Content /> : null}
      {step === 4 ? <Step4Preview /> : null}
      {step === 5 ? <Step5Publish /> : null}
    </div>
  );
}
