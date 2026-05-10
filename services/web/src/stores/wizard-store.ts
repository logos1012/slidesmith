// stores/wizard-store.ts — 5-step 위저드 client state (Zustand)
// 서버 데이터 (templates list, generated slides 응답)는 TanStack Query에 두고,
// 여기는 사용자 선택/편집 같은 client UI state만.
// Cycle 3 Fix (F5, Done #4): localStorage draft 자동 저장 박제.
//   step 1~4 입력 (brief/template/ratio/platform/slides/caption/watermark)을 localStorage 영속.
//   새로고침 시 자동 복원. step=5 publish 성공 시 reset()이 draft도 비움.
import { create } from 'zustand';
import { persist as zustandPersist, createJSONStorage } from 'zustand/middleware';
import type { AspectRatio, Platform, UUID } from '@/types/foundation';
import type { ContentSlide } from '@/repositories/interfaces/ILlmGateway';
import { newUUID } from '@/types/foundation';

export type WizardStep = 1 | 2 | 3 | 4 | 5;

interface WizardState {
  sessionId: UUID;
  step: WizardStep;
  brief: string;
  templateId: string | null;
  ratio: AspectRatio;
  platform: Platform;
  slides: ContentSlide[];
  caption: string;
  watermark: boolean;
  setBrief: (s: string) => void;
  setTemplate: (id: string | null) => void;
  setRatio: (r: AspectRatio) => void;
  setPlatform: (p: Platform) => void;
  setSlides: (s: ContentSlide[]) => void;
  patchSlide: (idx: number, patch: Partial<ContentSlide>) => void;
  setCaption: (c: string) => void;
  setWatermark: (b: boolean) => void;
  goto: (step: WizardStep) => void;
  next: () => void;
  prev: () => void;
  reset: () => void;
}

const initialFactory = () => ({
  sessionId: newUUID(),
  step: 1 as WizardStep,
  brief: '',
  templateId: null as string | null,
  ratio: '1:1' as AspectRatio,
  platform: 'instagram' as Platform,
  slides: [] as ContentSlide[],
  caption: '',
  watermark: true,
});

/** F5 박제: localStorage draft key (G9 — 자동 저장으로 새로고침 안전). */
export const WIZARD_DRAFT_KEY = 'slidesmith.wizard.draft.v1';

// SSR fallback stub — Next.js 서버 렌더 시 window 부재.
const memoryStorageStub: Storage = {
  length: 0,
  clear() { /* noop */ },
  getItem() { return null; },
  key() { return null; },
  removeItem() { /* noop */ },
  setItem() { /* noop */ },
};

// F5 박제: 매 호출마다 globalThis.localStorage를 다시 읽어, 테스트가 setup에서
//   window.localStorage를 swap해도 정합 작동. createJSONStorage가 한 번만 storage를
//   캐시해도 wrapper의 실 메서드가 항상 최신 globalThis.localStorage를 참조.
const liveStorage: Storage = {
  get length() { return globalThis.localStorage?.length ?? 0; },
  clear() { globalThis.localStorage?.clear(); },
  getItem(k: string) { return globalThis.localStorage?.getItem(k) ?? null; },
  key(i: number) { return globalThis.localStorage?.key(i) ?? null; },
  removeItem(k: string) { globalThis.localStorage?.removeItem(k); },
  setItem(k: string, v: string) { globalThis.localStorage?.setItem(k, v); },
};

export const useWizardStore = create<WizardState>()(
  zustandPersist(
    (set) => ({
      ...initialFactory(),
      setBrief: (brief) => set({ brief }),
      setTemplate: (templateId) => set({ templateId }),
      setRatio: (ratio) => set({ ratio }),
      setPlatform: (platform) => set({ platform }),
      setSlides: (slides) => set({ slides }),
      patchSlide: (idx, patch) =>
        set((s) => ({ slides: s.slides.map((sl, i) => (i === idx ? { ...sl, ...patch } : sl)) })),
      setCaption: (caption) => set({ caption }),
      setWatermark: (watermark) => set({ watermark }),
      goto: (step) => set({ step }),
      next: () => set((s) => ({ step: Math.min(5, s.step + 1) as WizardStep })),
      prev: () => set((s) => ({ step: Math.max(1, s.step - 1) as WizardStep })),
      reset: () => {
        // F5: reset은 draft도 비움 — 발행 성공 후 새 카루셀 시작 흐름.
        try { liveStorage.removeItem(WIZARD_DRAFT_KEY); } catch { /* noop */ }
        set(initialFactory());
      },
    }),
    {
      name: WIZARD_DRAFT_KEY,
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? liveStorage : memoryStorageStub)),
      // step (5단계 진행도) + sessionId는 영속 X — 영속 시 발행 후에도 step=5 복원되어 혼란.
      //   reset 흐름과의 일관성을 위해 입력 데이터만 박제.
      partialize: (s) => ({
        brief: s.brief,
        templateId: s.templateId,
        ratio: s.ratio,
        platform: s.platform,
        slides: s.slides,
        caption: s.caption,
        watermark: s.watermark,
      }),
      version: 1,
    },
  ),
);
