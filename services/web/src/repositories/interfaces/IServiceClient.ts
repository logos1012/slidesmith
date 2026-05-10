// IServiceClient — fetch + SSE + retry + correlation_id (ARCH-v3 §1-3, NEW v3)
// 7개 Http*Repo가 의존하는 HTTP layer 추상. test에서 MockServiceClient로 swap.
// Cycle 2 Fix (F3, 🟠-4): SERVICE-web.md §8 "모든 외부 응답을 Zod 검증" 박제.
//   getJson/postJson에 옵셔널 schema 인자 → 응답 즉시 parse. 깨진 contract immediate detect.
import type { z } from 'zod';

export type ServiceFetchInit = Omit<RequestInit, 'signal'> & {
  timeoutMs?: number;
  correlationId?: string;
};

export interface IServiceClient {
  /** baseUrl 절대값. 모든 path는 leading-slash. */
  readonly baseUrl: string;
  /** JSON GET. schema 전달 시 응답 자동 Zod parse — 깨진 contract 즉시 throw. */
  getJson<T>(path: string, init?: ServiceFetchInit, schema?: z.ZodSchema<T>): Promise<T>;
  /** JSON POST. schema 전달 시 응답 자동 Zod parse. body는 자동 JSON.stringify. */
  postJson<T>(
    path: string,
    body: unknown,
    init?: ServiceFetchInit,
    schema?: z.ZodSchema<T>,
  ): Promise<T>;
  /** Raw fetch (multipart, SSE 등). */
  fetch(path: string, init?: ServiceFetchInit): Promise<Response>;
}
