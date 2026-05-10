// SlidePreviewBoundary — DESIGN-v3 §1-1-3 단일 진입점 (Aurora swap Loop 2 Build, 메커니즘 동일).
// 사용자 brand DSL은 이 컴포넌트 자손에서만 `--brand-color-*` 토큰으로 적용.
// 도구 UI는 Aurora — 이 wrapper 밖에서는 brand color 0회 사용 (Layer 1 격리 보존).
'use client';
import type { CSSProperties, ReactNode } from 'react';
import type { BrandDsl } from '@/repositories/interfaces/IRenderGateway';

interface Props {
  brand: BrandDsl;
  children: ReactNode;
  className?: string;
}

export function SlidePreviewBoundary({ brand, children, className }: Props) {
  // Aurora swap: ESLint 룰이 var(--brand-color-*) 사용을 본 파일 안에서만 허용.
  // 시각 외장은 Aurora violet dashed selection box를 자손 카드가 자유롭게 적용 가능.
  const style = {
    '--brand-color-primary': brand.primary,
    '--brand-color-accent': brand.accent,
    '--brand-color-surface': brand.surface,
    '--brand-font-stack': brand.fontStack,
  } as CSSProperties;
  return (
    <div
      className={`slide-preview-container ${className ?? ''}`.trim()}
      data-slide-preview="true"
      style={style}>
      {children}
    </div>
  );
}
