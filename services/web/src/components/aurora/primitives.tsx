// Aurora shared primitives — 도구 UI 자유 사용 (Layer 1: brand DSL과 분리).
// Loop 2 Build (D-aurora-1): carousel design/aurora-{1,2,3}.jsx 패턴 박제.
// 사용처: Wizard 5 step + admin/security-checklist + chat/health 컴포넌트.
import type { CSSProperties, ReactNode } from 'react';

/** Aurora glassy card (rgba white + blur + violet glow). */
export function AuroraCard({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`aurora-card ${className ?? ''}`.trim()} style={style}>
      {children}
    </div>
  );
}

/** Aurora pill chip (semantic 톤: default/violet/mint/amber/danger). */
export function AuroraChip({
  children,
  tone = 'default',
  className,
}: {
  children: ReactNode;
  tone?: 'default' | 'violet' | 'mint' | 'amber' | 'danger';
  className?: string;
}) {
  const styles: Record<string, CSSProperties> = {
    default: {},
    violet: {
      background: 'rgba(124,92,255,.1)',
      color: 'var(--aurora-violet-2)',
      borderColor: 'transparent',
      fontWeight: 600,
    },
    mint: {
      background: 'rgba(70,224,198,.14)',
      color: '#0a7a6a',
      borderColor: 'transparent',
    },
    amber: {
      background: 'rgba(255,181,71,.18)',
      color: '#a86600',
      borderColor: 'transparent',
    },
    danger: {
      background: 'rgba(240,74,107,.12)',
      color: 'var(--aurora-danger)',
      borderColor: 'transparent',
    },
  };
  return (
    <span className={`aurora-tag ${className ?? ''}`.trim()} style={styles[tone]}>
      {children}
    </span>
  );
}

/** Aurora primary/ghost/soft button. */
export function AuroraButton({
  children,
  variant = 'primary',
  type = 'button',
  className,
  style,
  ...rest
}: {
  children: ReactNode;
  variant?: 'primary' | 'ghost' | 'soft';
  type?: 'button' | 'submit';
  className?: string;
  style?: CSSProperties;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'type' | 'style'>) {
  const cls =
    variant === 'primary'
      ? 'aurora-btn aurora-btn-primary'
      : variant === 'ghost'
        ? 'aurora-btn aurora-btn-ghost'
        : 'aurora-btn aurora-btn-ghost';
  return (
    <button type={type} className={`${cls} ${className ?? ''}`.trim()} style={style} {...rest}>
      {children}
    </button>
  );
}

/** Aurora gradient progress bar (5-step indicator base). */
export function AuroraBar({ percent, className }: { percent: number; className?: string }) {
  const w = Math.max(0, Math.min(100, percent));
  return (
    <div className={`aurora-bar ${className ?? ''}`.trim()}>
      <i style={{ width: `${w}%` }} />
    </div>
  );
}
