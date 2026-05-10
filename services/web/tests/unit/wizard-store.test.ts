import { describe, it, expect, beforeEach } from 'vitest';
import { useWizardStore, WIZARD_DRAFT_KEY } from '@/stores/wizard-store';

describe('wizard-store (Zustand)', () => {
  beforeEach(() => useWizardStore.getState().reset());

  it('initial step is 1', () => {
    expect(useWizardStore.getState().step).toBe(1);
  });

  it('next/prev clamps in 1..5', () => {
    const s = useWizardStore.getState();
    s.prev(); expect(useWizardStore.getState().step).toBe(1);
    for (let i = 0; i < 10; i++) s.next();
    expect(useWizardStore.getState().step).toBe(5);
  });

  it('setBrief updates state', () => {
    useWizardStore.getState().setBrief('hello');
    expect(useWizardStore.getState().brief).toBe('hello');
  });

  it('patchSlide updates only the targeted slide', () => {
    useWizardStore.getState().setSlides([
      { index: 0, title: 'a', body: '' }, { index: 1, title: 'b', body: '' },
    ]);
    useWizardStore.getState().patchSlide(1, { title: 'B!' });
    const slides = useWizardStore.getState().slides;
    expect(slides[0]?.title).toBe('a');
    expect(slides[1]?.title).toBe('B!');
  });

  it('reset returns to initial', () => {
    const s = useWizardStore.getState();
    s.setBrief('x'); s.next();
    s.reset();
    expect(useWizardStore.getState().brief).toBe('');
    expect(useWizardStore.getState().step).toBe(1);
  });

  // Cycle 3 Fix (F5, Done #4): localStorage draft 자동 저장 박제.
  it('🆕 F5 draft autosave: setBrief/setSlides 박제가 localStorage에 보존', async () => {
    const s = useWizardStore.getState();
    s.setBrief('한국어 인스타 5분 가이드');
    s.setRatio('4:5');
    s.setSlides([{ index: 0, title: 'T', body: 'B' }]);
    s.setWatermark(false);
    // zustand persist가 동기적으로 storage write — wait next tick.
    await Promise.resolve();
    const raw = window.localStorage.getItem(WIZARD_DRAFT_KEY);
    expect(raw, 'draft must be persisted').toBeTruthy();
    const parsed = JSON.parse(raw!);
    // partialize 박제: brief/ratio/slides/watermark 등 입력만 영속.
    expect(parsed.state.brief).toBe('한국어 인스타 5분 가이드');
    expect(parsed.state.ratio).toBe('4:5');
    expect(parsed.state.slides).toHaveLength(1);
    expect(parsed.state.watermark).toBe(false);
    // step (진행도)은 영속 X.
    expect(parsed.state.step).toBeUndefined();
  });

  it('🆕 F5 reset clears draft data — persisted state has empty initial values', async () => {
    const s = useWizardStore.getState();
    s.setBrief('temp');
    s.setSlides([{ index: 0, title: 'X', body: 'Y' }]);
    await Promise.resolve();
    expect(window.localStorage.getItem(WIZARD_DRAFT_KEY)).toBeTruthy();
    s.reset();
    await Promise.resolve();
    // reset 후 persist는 initial 빈 상태로 다시 쓰여진 상태 — 사용자가 새로고침해도 깨끗.
    const raw = window.localStorage.getItem(WIZARD_DRAFT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      expect(parsed.state.brief).toBe('');
      expect(parsed.state.slides).toEqual([]);
    }
    // 그리고 store state도 초기.
    expect(useWizardStore.getState().brief).toBe('');
    expect(useWizardStore.getState().slides).toEqual([]);
  });
});
