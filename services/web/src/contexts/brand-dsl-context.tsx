// contexts/brand-dsl-context.tsx — Brand DSL Provider (DESIGN-v3 §1-1-3 단일 진입점)
// 사용자 carousel 컬러 격리 — `--brand-color-*`는 SlidePreviewBoundary 안에서만 set.
// 도구 UI는 monochrome (`--color-*`) 만 사용. 침투 0.
'use client';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { BrandDsl } from '@/repositories/interfaces/IRenderGateway';

const DEFAULT_BRAND: BrandDsl = {
  primary: '#111827', accent: '#6366F1', surface: '#FFFFFF',
  fontStack: 'Pretendard, -apple-system, sans-serif',
};

interface BrandDslContextValue {
  brand: BrandDsl;
  setBrand: (b: BrandDsl) => void;
}

const Ctx = createContext<BrandDslContextValue | null>(null);
const STORAGE_KEY = 'slidesmith:brand-dsl';

export function BrandDslProvider({ children, initial }: { children: ReactNode; initial?: BrandDsl }) {
  const [brand, setBrand] = useState<BrandDsl>(() => {
    if (initial) return initial;
    if (typeof window === 'undefined') return DEFAULT_BRAND;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BRAND;
    try { return { ...DEFAULT_BRAND, ...(JSON.parse(raw) as BrandDsl) }; }
    catch { return DEFAULT_BRAND; }
  });
  const value = useMemo<BrandDslContextValue>(() => ({
    brand,
    setBrand: (b) => {
      setBrand(b);
      if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(b));
    },
  }), [brand]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBrandDsl(): BrandDslContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useBrandDsl must be inside <BrandDslProvider>');
  return v;
}
