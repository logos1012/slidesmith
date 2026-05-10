import { describe, it, expect } from 'vitest';
import { GET as healthGET } from '@/app/api/health/route';
import { GET as depsGET } from '@/app/api/health/deps/route';
import pkg from '../../package.json';

// Cycle 1 Fix (F3): Review 🔴-1 — placeholder가 아닌 실제 route handler 직접 호출 + body shape 검증.
// Phase 6 Fix (F3): version은 package.json과 정합해야 함 (P0-3 정직 박제).
// route.ts를 망가뜨리면 이 테스트가 fail해야 함 (계약 박제).

describe('/api/health', () => {
  it('returns 200 with the 4 required fields (status, version, timestamp, uptime)', async () => {
    const res = healthGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      status: 'ok',
      version: expect.any(String),
      timestamp: expect.any(String),
      uptime: expect.any(Number),
    });
    // ISO8601 형태 검증
    expect(() => new Date(body.timestamp).toISOString()).not.toThrow();
  });

  it('reports version that matches package.json (release 명패 정합 박제)', async () => {
    const res = healthGET();
    const body = await res.json();
    expect(body.version).toBe(pkg.version);
    expect(body.version).toBe('1.0.0');
  });
});

describe('/api/health/deps', () => {
  it('returns 200 with 4 service slots + external aggregate (object shape)', async () => {
    const res = await depsGET();
    expect(res.status).toBe(200);
    const body = await res.json();

    // 4 services
    for (const k of ['web', 'llm', 'render', 'storage'] as const) {
      expect(body[k]).toBeDefined();
      expect(typeof body[k].status).toBe('string');
    }

    // external aggregate — F6: object shape (not string)
    for (const k of ['anthropic', 'airtable', 's3', 'gemini'] as const) {
      expect(body.external[k]).toBeDefined();
      expect(typeof body.external[k].status).toBe('string');
      expect(typeof body.external[k].responseMs).toBe('number');
    }
  });
});
