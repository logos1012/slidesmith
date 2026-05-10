// lib/saga-state-memory.ts — 메모리 fallback (test/CI: better-sqlite3 미설치 OK)
// Cycle 3 (B2): saga-state.ts 분리 (50줄 룰 박제). MemorySagaStore만 단독.
import type { SagaRow, SagaStateStore } from './saga-state-types';

export class MemorySagaStore implements SagaStateStore {
  private rows = new Map<string, SagaRow>();
  upsert(row: SagaRow) {
    // 🟠-5 박제: idempotencyKey UNIQUE 충돌 시 silent overwrite 안 함.
    for (const r of this.rows.values()) {
      if (r.idempotencyKey === row.idempotencyKey) return; // INSERT OR IGNORE 의미.
    }
    this.rows.set(row.id, { ...row });
  }
  update(id: string, patch: Partial<SagaRow>) {
    const existing = this.rows.get(id);
    if (!existing) return;
    this.rows.set(id, { ...existing, ...patch, updatedAt: new Date().toISOString() });
  }
  get(id: string): SagaRow | null { return this.rows.get(id) ?? null; }
  byIdempotencyKey(key: string): SagaRow | null {
    for (const r of this.rows.values()) if (r.idempotencyKey === key) return r;
    return null;
  }
  listIncomplete(): SagaRow[] {
    return [...this.rows.values()].filter((r) => r.status === 'pending' || r.status === 'running');
  }
  countRecent(windowMs: number, nowMs: number = Date.now()) {
    const since = nowMs - windowMs;
    let failedRecent = 0; let inflightStuck = 0;
    for (const r of this.rows.values()) {
      const t = Date.parse(r.updatedAt);
      if (Number.isNaN(t)) continue;
      if ((r.status === 'failed' || r.status === 'compensated') && t >= since) failedRecent++;
      if ((r.status === 'pending' || r.status === 'running') && t < since) inflightStuck++;
    }
    return { failedRecent, inflightStuck };
  }
  close() { this.rows.clear(); }
}
