// Aurora TopBar — 48px 상단 (carousel design/shared.jsx TopBar 흡수).
// Logo + breadcrumb + 우측 actions slot.
import type { ReactNode } from 'react';
import { Logo } from '@/components/layout/logo';

interface Props {
  crumbs?: string[];
  right?: ReactNode;
}

export function TopBar({ crumbs = [], right }: Props) {
  return (
    <header className="flex h-12 items-center justify-between border-b border-line bg-aurora-surface px-4">
      <div className="flex items-center gap-3.5">
        <Logo />
        <span aria-hidden className="h-[18px] w-px bg-line" />
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <span
              key={i}
              className={`text-xs ${last ? 'font-semibold text-ink' : 'text-ink-3'}`}>
              {c}
              {!last ? <span className="mx-2 text-ink-3">›</span> : null}
            </span>
          );
        })}
      </div>
      {right ? <div className="flex items-center gap-2.5">{right}</div> : null}
    </header>
  );
}
