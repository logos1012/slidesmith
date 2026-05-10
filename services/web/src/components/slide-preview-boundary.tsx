// SlidePreviewBoundary — DESIGN-v3 §1-1-3 단일 진입점
// 사용자 brand DSL은 이 컴포넌트 자손에서만 `--brand-color-*` 토큰으로 적용.
// 도구 UI 침투 방지: 이 wrapper 밖에서는 brand color 0회 사용.
'use client';
import type { CSSProperties, ReactNode } from 'react';
import type { BrandDsl } from '@/repositories/interfaces/IRenderGateway';

interface Props { brand: BrandDsl; children: ReactNode; className?: string }

export function SlidePreviewBoundary({ brand, children, className }: Props) {
  const style = {
    '--brand-color-primary': brand.primary,
    '--brand-color-accent': brand.accent,
    '--brand-color-surface': brand.surface,
    '--brand-font-stack': brand.fontStack,
  } as CSSProperties;
  return (
    <div className={`slide-preview-container ${className ?? ''}`.trim()} style={style}>
      {children}
    </div>
  );
}
