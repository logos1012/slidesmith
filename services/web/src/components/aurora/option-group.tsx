// Aurora Option Group — 단일 선택 grid chip (carousel design/aurora-1.jsx OptionGroup 흡수).
// Wizard step-1 (ratio/platform), step-2 (template) 등에서 재사용.
import type { ReactNode } from 'react';

interface Option<T extends string> {
  value: T;
  label: ReactNode;
  hint?: ReactNode;
}

interface Props<T extends string> {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  cols?: 2 | 3 | 4;
}

export function AuroraOptionGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  cols = 3,
}: Props<T>) {
  const colsClass = cols === 4 ? 'grid-cols-4' : cols === 2 ? 'grid-cols-2' : 'grid-cols-3';
  return (
    <div>
      <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-2">
        {label}
      </div>
      <div className={`grid gap-2 ${colsClass}`}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              aria-pressed={active}
              className="rounded-[12px] border px-3 py-2 text-left text-sm transition-colors"
              style={
                active
                  ? {
                      background: 'var(--grad-card)',
                      borderColor: 'var(--aurora-violet)',
                      color: 'var(--aurora-ink)',
                    }
                  : {
                      background: 'var(--aurora-surface-2)',
                      borderColor: 'var(--aurora-line)',
                      color: 'var(--aurora-ink-2)',
                    }
              }>
              <div className="font-semibold">{o.label}</div>
              {o.hint ? (
                <div className="mt-0.5 font-mono text-[10px] text-ink-3">{o.hint}</div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
