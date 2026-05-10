// lib/container.ts — DI Container singleton (SERVICE-web.md §6, Cycle 3 B2 50줄 룰).
//   wiring은 container-build.ts, types는 container-types.ts.
import 'server-only';
import { buildContainer } from './container-build';
import type { Container } from './container-types';

export type { Container } from './container-types';

let _container: Container | null = null;

export function getContainer(): Container {
  if (_container) return _container;
  _container = buildContainer();
  return _container;
}

/** 테스트 / 명시적 swap 용. */
export function setContainer(c: Container | null) { _container = c; }

/** 서버 부팅 시 1회 — 미완료 saga step replay (Cycle 3 A2). */
export async function bootstrapContainer(): Promise<void> {
  const c = getContainer();
  await c.persist.recoverIncomplete();
}
