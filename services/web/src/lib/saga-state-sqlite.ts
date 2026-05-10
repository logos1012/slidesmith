// lib/saga-state-sqlite.ts — better-sqlite3 영속 (Cycle 3 A1: prod native build)
// 동적 require — better-sqlite3가 없거나 native 빌드 실패 시 catch 가능.
//   prod (alpine + python3 + g++)에서는 정상 로드 → 컨테이너 재시작 후 saga 보존.
//   test/CI (jsdom)에서는 fallback to MemorySagaStore.
import type { SagaRow, SagaStateStore } from './saga-state-types';

interface NativeDb {
  prepare(sql: string): {
    run(...args: unknown[]): unknown;
    get(...args: unknown[]): unknown;
    all(...args: unknown[]): unknown;
  };
  exec(sql: string): void;
  close(): void;
}

export function createSqliteStore(dbPath: string): SagaStateStore {
  const Database = require('better-sqlite3') as new (p: string) => unknown;
  const db = new Database(dbPath) as NativeDb;
  db.exec(`CREATE TABLE IF NOT EXISTS sagas (
    id TEXT PRIMARY KEY, idempotencyKey TEXT UNIQUE, status TEXT, currentStep TEXT,
    payload TEXT, sideEffects TEXT, createdAt TEXT, updatedAt TEXT
  )`);
  return {
    upsert(row) {
      // 🟠-5 박제: idempotencyKey UNIQUE 충돌 시 silent overwrite 안 함.
      db.prepare(
        `INSERT OR IGNORE INTO sagas VALUES (@id,@idempotencyKey,@status,@currentStep,@payload,@sideEffects,@createdAt,@updatedAt)`,
      ).run(row);
    },
    update(id, patch) {
      const existing = this.get(id);
      if (!existing) return;
      const merged = { ...existing, ...patch, updatedAt: new Date().toISOString() };
      // PK only — UNIQUE 충돌 영향 0.
      db.prepare(
        `UPDATE sagas SET idempotencyKey=@idempotencyKey, status=@status, currentStep=@currentStep,
         payload=@payload, sideEffects=@sideEffects, createdAt=@createdAt, updatedAt=@updatedAt
         WHERE id=@id`,
      ).run(merged);
    },
    get(id) { return (db.prepare(`SELECT * FROM sagas WHERE id=?`).get(id) as SagaRow | undefined) ?? null; },
    byIdempotencyKey(key) {
      return (db.prepare(`SELECT * FROM sagas WHERE idempotencyKey=?`).get(key) as SagaRow | undefined) ?? null;
    },
    listIncomplete() {
      return (db.prepare(`SELECT * FROM sagas WHERE status IN ('pending','running')`).all() as SagaRow[]) ?? [];
    },
    countRecent(windowMs, nowMs = Date.now()) {
      // Cycle 3 Fix (F4, 🟠-3): time-window — fixed threshold(<5) 폐기.
      const sinceIso = new Date(nowMs - windowMs).toISOString();
      const failed = db.prepare(
        `SELECT COUNT(*) as n FROM sagas WHERE status IN ('failed','compensated') AND updatedAt >= ?`,
      ).get(sinceIso) as { n?: number } | undefined;
      const stuck = db.prepare(
        `SELECT COUNT(*) as n FROM sagas WHERE status IN ('pending','running') AND updatedAt < ?`,
      ).get(sinceIso) as { n?: number } | undefined;
      return { failedRecent: failed?.n ?? 0, inflightStuck: stuck?.n ?? 0 };
    },
    close() { db.close(); },
  };
}
