// Aurora Step Rail — 5-step circle + line + progress (carousel design/aurora-3.jsx Saga 패턴 흡수).
// Wizard 5 step indicator + Saga 5-step indicator 모두 사용.
import { Check } from 'lucide-react';

interface StepDef {
  num: number;
  label: string;
}

interface Props {
  steps: StepDef[];
  current: number;
}

export function AuroraStepRail({ steps, current }: Props) {
  const total = steps.length;
  const percent = total <= 1 ? 100 : ((current - 1) / (total - 1)) * 100;
  return (
    <div className="space-y-3">
      <div className="aurora-bar">
        <i style={{ width: `${percent}%` }} />
      </div>
      <ol aria-label="wizard progress" className="flex items-center justify-between gap-2 text-xs">
        {steps.map((s) => {
          const done = s.num < current;
          const active = s.num === current;
          return (
            <li key={s.num} className="flex flex-1 items-center gap-2">
              <span
                aria-current={active ? 'step' : undefined}
                className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full text-[11px] font-mono font-semibold"
                style={
                  done
                    ? { background: 'rgba(43,182,115,.15)', color: '#1d8a55' }
                    : active
                      ? { background: 'var(--grad-button)', color: '#fff' }
                      : { background: 'var(--aurora-surface-2)', color: 'var(--aurora-ink-3)' }
                }>
                {done ? <Check size={14} strokeWidth={2} /> : String(s.num).padStart(2, '0')}
              </span>
              <span
                className={`hidden sm:inline text-[12px] ${
                  active ? 'font-semibold text-ink' : done ? 'text-ink-2' : 'text-ink-3'
                }`}>
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
