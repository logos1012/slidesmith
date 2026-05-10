import { describe, it, expect } from 'vitest';
import { getContainer, setContainer } from '@/lib/container';

describe('DI Container (lib/container.ts)', () => {
  it('returns singleton across calls', () => {
    const a = getContainer();
    const b = getContainer();
    expect(a).toBe(b);
  });

  it('exposes 7 repos + 1 orchestrator + sagaState', () => {
    const c = getContainer();
    expect(c.knowledge).toBeDefined();
    expect(c.templates).toBeDefined();
    expect(c.carousels).toBeDefined();
    expect(c.elements).toBeDefined();
    expect(c.blob).toBeDefined();
    expect(c.llm).toBeDefined();
    expect(c.render).toBeDefined();
    expect(c.persist).toBeDefined();
    expect(c.sagaState).toBeDefined();
  });

  it('setContainer(null) forces re-init on next get', () => {
    const a = getContainer();
    setContainer(null);
    const b = getContainer();
    expect(a).not.toBe(b);
  });
});
