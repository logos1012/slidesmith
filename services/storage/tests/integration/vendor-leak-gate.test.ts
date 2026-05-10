// vendor-leak-gate.test.ts — automated guard that every endpoint stays
// vendor-neutral (SPEC §6, ARCH §7-1, CLAUDE.md hard rule #2).
import './_setup.js';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import type { Hono } from 'hono';

// Cycle 3 §F — extend forbidden list from 9 → 14 patterns. The new entries
// (`amazonaws`, `bedrock`, `vertex`, `openai`, `anthropic`) catch upstream
// hostnames + sibling-vendor SDK names that should never reach the boundary
// from this storage service (Anthropic + OpenAI live in the llm container,
// not here).
const FORBIDDEN = [
  'airtable',
  'aws',
  's3url',
  's3bucket',
  'puppeteer',
  'gemini',
  'claudemessage',
  'claudecli',
  'airtablerecordid',
  'amazonaws',
  'bedrock',
  'vertex',
  'openai',
  'anthropic',
];

let app: Hono;
let fakes: typeof import('../fakes/in-memory-repos.js');
let container: typeof import('../../src/repositories/container.js');
let idem: typeof import('../../src/lib/idempotency.js');

beforeAll(async () => {
  fakes = await import('../fakes/in-memory-repos.js');
  container = await import('../../src/repositories/container.js');
  idem = await import('../../src/lib/idempotency.js');
  const mod = await import('../../src/server.js');
  app = mod.app;
});

beforeEach(() => {
  container.setRepos({
    knowledge: new fakes.FakeKnowledgeRepo(),
    templates: new fakes.FakeTemplateRepo(),
    carousels: new fakes.FakeCarouselRepo(),
    elements: new fakes.FakeElementRepo(),
    blob: new fakes.FakeBlobStorage(),
  });
  idem._resetIdempotency();
});

function assertClean(label: string, text: string): void {
  const lower = text.toLowerCase();
  for (const w of FORBIDDEN) {
    expect(
      lower.includes(w),
      `${label} leaked vendor word "${w}": ${text.slice(0, 200)}`,
    ).toBe(false);
  }
}

describe('vendor-leak gate — every endpoint × every forbidden word', () => {
  it('GET /knowledge', async () => {
    const r = await app.request('/knowledge');
    assertClean('GET /knowledge', await r.text());
  });
  it('GET /templates', async () => {
    const r = await app.request('/templates');
    assertClean('GET /templates', await r.text());
  });
  it('GET /carousels', async () => {
    const r = await app.request('/carousels');
    assertClean('GET /carousels', await r.text());
  });
  it('GET /elements', async () => {
    const r = await app.request('/elements');
    assertClean('GET /elements', await r.text());
  });

  it('POST /carousels (round-trip with all 11 forward-compat fields)', async () => {
    const r = await app.request('/carousels', {
      method: 'POST',
      body: JSON.stringify({
        title: 'leak-test',
        seriesId: 's1',
        seriesVolume: 1,
        parentCarouselId: 'p1',
        repurposeType: 'remix',
        hookCategory: 'curiosity',
        narrativeArc: 'reveal',
        moderationStatus: 'PASSED',
        captionJson: { text: 'x' },
        insightsJson: { impressions: 1 },
        lastUsedAt: '2026-05-10T00:00:00Z',
        versionHistory: [],
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    assertClean('POST /carousels', await r.text());
  });

  it('POST /blob/upload', async () => {
    const r = await app.request('/blob/upload', {
      method: 'POST',
      body: JSON.stringify({
        key: 'k',
        contentType: 'image/png',
        base64: Buffer.from('x').toString('base64'),
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    assertClean('POST /blob/upload', await r.text());
  });

  it('GET /blob/url/:key', async () => {
    const r = await app.request('/blob/url/foo/bar.png');
    assertClean('GET /blob/url/:key', await r.text());
  });

  // /health is the documented exemption (Cycle 1 fix §4 / SPEC §5-1):
  // it reports vendor *state* (breaker open/closed) by name. Verified narrowly
  // that no recordId is exposed under a vendor-prefixed key.
  it('GET /health does not leak vendor *record* identifiers (airtableRecordId etc.)', async () => {
    const r = await app.request('/health');
    const text = (await r.text()).toLowerCase();
    expect(text).not.toContain('airtablerecordid');
    expect(text).not.toContain('s3url');
    expect(text).not.toContain('s3bucket');
    expect(text).not.toContain('claudemessage');
  });

  // Cycle 3 new endpoints — series fetch, repurpose lookup, moderation update
  // also stay vendor-clean so the BFF doesn't have to sanitise on the way out.
  it('GET /carousels/series/:seriesId is vendor-clean', async () => {
    const r = await app.request('/carousels/series/s-1');
    assertClean('GET /carousels/series/:seriesId', await r.text());
  });

  it('GET /carousels/repurpose/:type is vendor-clean', async () => {
    const r = await app.request('/carousels/repurpose/original');
    assertClean('GET /carousels/repurpose/:type', await r.text());
  });

  it('POST /knowledge/seed is vendor-clean (with required Idempotency-Key)', async () => {
    const r = await app.request('/knowledge/seed', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'vendor-leak-gate-seed' },
    });
    assertClean('POST /knowledge/seed', await r.text());
  });

  // Cycle 3 Fix F1 — even the new 400 path (missing Idempotency-Key) must not
  // leak vendor identifiers in its userMessage / message strings.
  it('POST /knowledge/seed without Idempotency-Key is vendor-clean (400)', async () => {
    const r = await app.request('/knowledge/seed', { method: 'POST' });
    expect(r.status).toBe(400);
    assertClean('POST /knowledge/seed (no key)', await r.text());
  });

  it('GET /knowledge ?cursor=... is vendor-clean even on invalid cursor', async () => {
    const r = await app.request('/knowledge?cursor=garbage');
    assertClean('GET /knowledge?cursor=garbage', await r.text());
  });
});
