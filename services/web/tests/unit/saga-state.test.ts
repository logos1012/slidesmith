import { describe, it, expect } from 'vitest';
import { createSagaStore, type SagaRow } from '@/lib/saga-state';

function row(over: Partial<SagaRow> = {}): SagaRow {
  return {
    id: 's1', idempotencyKey: 'k1', status: 'pending', currentStep: 'validate',
    payload: '{}', sideEffects: '{"s3Keys":[]}',
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', ...over,
  };
}

describe('saga-state (memory store)', () => {
  it('upsert + get round-trip', () => {
    const s = createSagaStore();
    s.upsert(row());
    expect(s.get('s1')?.status).toBe('pending');
  });

  it('update merges patch', () => {
    const s = createSagaStore();
    s.upsert(row());
    s.update('s1', { status: 'completed' });
    expect(s.get('s1')?.status).toBe('completed');
  });

  it('byIdempotencyKey finds row', () => {
    const s = createSagaStore();
    s.upsert(row({ idempotencyKey: 'KEY-X' }));
    expect(s.byIdempotencyKey('KEY-X')?.id).toBe('s1');
    expect(s.byIdempotencyKey('missing')).toBeNull();
  });

  it('listIncomplete returns pending + running only', () => {
    const s = createSagaStore();
    s.upsert(row({ id: 'a', idempotencyKey: 'a', status: 'pending' }));
    s.upsert(row({ id: 'b', idempotencyKey: 'b', status: 'running' }));
    s.upsert(row({ id: 'c', idempotencyKey: 'c', status: 'completed' }));
    s.upsert(row({ id: 'd', idempotencyKey: 'd', status: 'compensated' }));
    const ids = s.listIncomplete().map((r) => r.id).sort();
    expect(ids).toEqual(['a', 'b']);
  });

  // Cycle 3 Fix (F4, 🟠-3): time-window 평가.
  it('🆕 F4 countRecent: time-window classifies recent failures + stuck inflight', () => {
    const now = Date.parse('2026-05-10T12:00:00Z');
    const window = 5 * 60 * 1000;
    const s = createSagaStore();
    // 30일 전 compensated — window 밖 → ok 영역.
    s.upsert(row({ id: 'old-1', idempotencyKey: 'old-1', status: 'compensated',
      updatedAt: '2026-04-10T12:00:00Z' }));
    // 1분 전 failed — window 안 → failedRecent.
    s.upsert(row({ id: 'recent-failed', idempotencyKey: 'recent-failed', status: 'failed',
      updatedAt: '2026-05-10T11:59:00Z' }));
    // 30분 전 시작된 running — window 밖 → stuck.
    s.upsert(row({ id: 'stuck', idempotencyKey: 'stuck', status: 'running',
      updatedAt: '2026-05-10T11:30:00Z' }));
    // 방금 시작한 running — window 안 → 정상 inflight, count 0.
    s.upsert(row({ id: 'fresh', idempotencyKey: 'fresh', status: 'running',
      updatedAt: '2026-05-10T11:58:00Z' }));
    const c = s.countRecent(window, now);
    expect(c.failedRecent).toBe(1);
    expect(c.inflightStuck).toBe(1);
  });
});
