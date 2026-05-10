// lib/saga-state.ts — Factory entry (Cycle 3 B2 분리: types/memory/sqlite 별도 파일).
//   factory만 단독 노출 — consumers는 createSagaStore + 타입만 import.
//   Cycle 3 (A1): prod에서 better-sqlite3 native build → saga.db 컨테이너 재시작 후 박제.
import type { SagaStateStore } from './saga-state-types';
import { MemorySagaStore } from './saga-state-memory';

export type { SagaRow, SagaStateStore } from './saga-state-types';

export function createSagaStore(dbPath?: string): SagaStateStore {
  if (!dbPath || dbPath === ':memory:') return new MemorySagaStore();
  try {
    // 동적 require — better-sqlite3가 native 빌드 안 된 환경에서 즉시 fallback.
    const { createSqliteStore } = require('./saga-state-sqlite') as typeof import('./saga-state-sqlite');
    return createSqliteStore(dbPath);
  } catch {
    // sqlite native 모듈 로드 실패 (alpine glibc / test) — 메모리 fallback.
    //   prod (Cycle 3 A1)에서는 alpine + python3/g++로 native build 성공해야 함.
    return new MemorySagaStore();
  }
}
