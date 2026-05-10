// types/foundation.ts — UUID / IsoDateTime / AspectRatio / Platform (SERVICE-web.md §1)
// Cycle 2: 모든 도메인 type의 부모. zod schema는 각 도메인 type 파일에서 정의.
export type UUID = string & { readonly __brand: 'UUID' };
export type IsoDateTime = string & { readonly __brand: 'IsoDateTime' };

export type AspectRatio = '1:1' | '4:5' | '9:16';
export type Platform = 'instagram' | 'threads' | 'twitter';

export type ServiceStatus = 'ok' | 'degraded' | 'down' | 'unknown';
export type DepStatus = { status: ServiceStatus; responseMs: number };

export const newUUID = (): UUID =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`) as UUID;

export const nowIso = (): IsoDateTime => new Date().toISOString() as IsoDateTime;
