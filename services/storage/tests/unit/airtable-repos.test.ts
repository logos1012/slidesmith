// airtable-repos.test.ts — repository CRUD against a mocked airtableFetch.
// Verifies the URL/body shape sent to Airtable and the round-trip back through
// the vendor-mapper. This is the seam where vendor field names + adapters meet.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Each call records (path, init) and replies with whatever `nextResponse` is.
const calls: Array<{ path: string; init: RequestInit }> = [];
let nextResponse: unknown = {};

vi.mock('../../src/lib/airtable-client.js', () => ({
  airtableFetch: vi.fn(async (path: string, init: RequestInit = {}) => {
    calls.push({ path, init });
    return nextResponse;
  }),
  AirtableError: class extends Error {
    constructor(public status: number, public body: string) {
      super(`Airtable HTTP ${status}`);
    }
  },
}));

const { AirtableKnowledgeRepo } = await import(
  '../../src/repositories/airtable/AirtableKnowledgeRepo.js'
);
const { AirtableTemplateRepo } = await import(
  '../../src/repositories/airtable/AirtableTemplateRepo.js'
);
const { AirtableCarouselRepo } = await import(
  '../../src/repositories/airtable/AirtableCarouselRepo.js'
);
const { AirtableElementRepo } = await import(
  '../../src/repositories/airtable/AirtableElementRepo.js'
);

beforeEach(() => {
  calls.length = 0;
  nextResponse = {};
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('AirtableKnowledgeRepo', () => {
  const repo = new AirtableKnowledgeRepo();

  it('list builds filterByFormula for category', async () => {
    nextResponse = { records: [], offset: undefined };
    await repo.list({ category: 'Frameworks', limit: 20, offset: 0 });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.path).toContain('/Knowledge');
    expect(calls[0]?.path).toContain('filterByFormula=');
    expect(decodeURIComponent(calls[0]?.path ?? '')).toContain('{category}="Frameworks"');
  });

  it('create POSTs encoded fields and maps the response', async () => {
    nextResponse = {
      id: 'recAAA',
      createdTime: '2026-05-10T00:00:00Z',
      fields: { name: 'PAS', category: 'Frameworks' },
    };
    const out = await repo.create({ name: 'PAS', category: 'Frameworks', whenToUse: 'short' });
    expect(calls[0]?.init.method).toBe('POST');
    const body = JSON.parse((calls[0]?.init.body as string) ?? '{}');
    expect(body.fields.when_to_use).toBe('short');
    expect(out.recordId).toBe('recAAA');
  });

  it('get maps 404 to null', async () => {
    const { airtableFetch } = await import('../../src/lib/airtable-client.js');
    (airtableFetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      Object.assign(new Error('not found'), { status: 404 }),
    );
    const out = await repo.get('recX');
    expect(out).toBeNull();
  });

  it('delete returns true on success and false on 404', async () => {
    nextResponse = { deleted: true };
    expect(await repo.delete('recA')).toBe(true);
    const { airtableFetch } = await import('../../src/lib/airtable-client.js');
    (airtableFetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      Object.assign(new Error('gone'), { status: 404 }),
    );
    expect(await repo.delete('recB')).toBe(false);
  });
});

describe('AirtableTemplateRepo — incrementUsage round-trip', () => {
  const repo = new AirtableTemplateRepo();

  it('reads current then patches usage_count = current + by', async () => {
    const { airtableFetch } = await import('../../src/lib/airtable-client.js');
    const mock = airtableFetch as ReturnType<typeof vi.fn>;
    mock.mockResolvedValueOnce({
      id: 'recT',
      createdTime: '2026-05-10T00:00:00Z',
      fields: { name: 'Listicle', usage_count: 4 },
    });
    mock.mockResolvedValueOnce({
      id: 'recT',
      createdTime: '2026-05-10T00:00:00Z',
      fields: { name: 'Listicle', usage_count: 6 },
    });
    const out = await repo.incrementUsage('recT', 2);
    expect(out.usageCount).toBe(6);
    // Two calls: GET then PATCH
    expect(mock.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('throws 404-tagged error when the template is missing', async () => {
    const { airtableFetch } = await import('../../src/lib/airtable-client.js');
    (airtableFetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      Object.assign(new Error('not found'), { status: 404 }),
    );
    await expect(repo.incrementUsage('nope')).rejects.toMatchObject({ status: 404 });
  });
});

describe('AirtableCarouselRepo — series filter + 11 forward-compat round-trip', () => {
  const repo = new AirtableCarouselRepo();

  it('list ?seriesId builds filterByFormula on series_id', async () => {
    nextResponse = { records: [], offset: undefined };
    await repo.list({ limit: 10, seriesId: 's-A' });
    const decoded = decodeURIComponent(calls[0]?.path ?? '');
    expect(decoded).toContain('{series_id}="s-A"');
  });

  it('create encodes all 11 forward-compat fields onto the POST body', async () => {
    nextResponse = {
      id: 'recC',
      createdTime: '2026-05-10T00:00:00Z',
      fields: {
        brief: 'b',
        series_id: 's1',
        series_volume: 2,
        parent_carousel_id: 'p',
        repurpose_type: 'remix',
        hook_category: 'curiosity',
        narrative_arc: 'reveal',
        moderation_status: 'PASSED',
        caption_json: '{"text":"hi"}',
        insights_json: '{"x":1}',
        last_used_at: '2026-05-10T00:00:00Z',
        version_history: '[]',
      },
    };
    await repo.create({
      brief: 'b',
      seriesId: 's1',
      seriesVolume: 2,
      parentCarouselId: 'p',
      repurposeType: 'remix',
      hookCategory: 'curiosity',
      narrativeArc: 'reveal',
      moderationStatus: 'PASSED',
      captionJson: { text: 'hi' },
      insightsJson: { x: 1 },
      lastUsedAt: '2026-05-10T00:00:00Z',
      versionHistory: [],
    });
    const body = JSON.parse((calls[0]?.init.body as string) ?? '{}');
    expect(body.fields).toMatchObject({
      series_id: 's1',
      series_volume: 2,
      parent_carousel_id: 'p',
      repurpose_type: 'remix',
      hook_category: 'curiosity',
      narrative_arc: 'reveal',
      moderation_status: 'PASSED',
    });
    expect(body.fields.caption_json).toBe('{"text":"hi"}');
    expect(body.fields.insights_json).toBe('{"x":1}');
    expect(body.fields.last_used_at).toBe('2026-05-10T00:00:00Z');
    expect(body.fields.version_history).toBe('[]');
  });

  it('update PATCHes the targeted record', async () => {
    nextResponse = {
      id: 'recC',
      createdTime: '2026-05-10T00:00:00Z',
      fields: { moderation_status: 'BLOCKED' },
    };
    await repo.update('recC', { moderationStatus: 'BLOCKED' });
    expect(calls[0]?.init.method).toBe('PATCH');
    expect(calls[0]?.path).toContain('/Carousels/recC');
  });

  it('delete maps 404 to false', async () => {
    const { airtableFetch } = await import('../../src/lib/airtable-client.js');
    (airtableFetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      Object.assign(new Error('gone'), { status: 404 }),
    );
    expect(await repo.delete('recC')).toBe(false);
  });
});

describe('AirtableElementRepo', () => {
  const repo = new AirtableElementRepo();

  it('list ?type=character + ?q=jisoo builds AND formula', async () => {
    nextResponse = { records: [], offset: undefined };
    await repo.list({ limit: 10, offset: 0, type: 'character', q: 'jisoo' });
    const decoded = decodeURIComponent(calls[0]?.path ?? '');
    expect(decoded).toContain('AND(');
    expect(decoded).toContain('{type}="character"');
    expect(decoded).toContain('jisoo');
  });

  it('create POSTs encoded fields with arrays preserved', async () => {
    nextResponse = {
      id: 'recE',
      createdTime: '2026-05-10T00:00:00Z',
      fields: { type: 'character', name: 'jisoo', src: 's3://x' },
    };
    const out = await repo.create({
      type: 'character',
      name: 'jisoo',
      src: 's3://x',
      aliases: ['지수'],
      tags: ['main'],
    });
    expect(out.recordId).toBe('recE');
    const body = JSON.parse((calls[0]?.init.body as string) ?? '{}');
    expect(body.fields.aliases).toEqual(['지수']);
    expect(body.fields.tags).toEqual(['main']);
  });

  it('update PATCHes the targeted element', async () => {
    nextResponse = {
      id: 'recE',
      createdTime: '2026-05-10T00:00:00Z',
      fields: { type: 'prop', name: 'mug', src: 's3://m' },
    };
    await repo.update('recE', { name: 'mug' });
    expect(calls[0]?.init.method).toBe('PATCH');
    expect(calls[0]?.path).toContain('/Elements/recE');
  });

  it('get maps 404 to null and delete returns false on 404', async () => {
    const { airtableFetch } = await import('../../src/lib/airtable-client.js');
    (airtableFetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      Object.assign(new Error('gone'), { status: 404 }),
    );
    expect(await repo.get('recX')).toBeNull();
    (airtableFetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      Object.assign(new Error('gone'), { status: 404 }),
    );
    expect(await repo.delete('recX')).toBe(false);
  });
});

describe('AirtableTemplateRepo — list + delete', () => {
  const repo = new AirtableTemplateRepo();

  it('list ?q escapes quotes + injects SEARCH', async () => {
    nextResponse = { records: [], offset: 'next-token' };
    const page = await repo.list({ limit: 10, offset: 0, q: 'has "quotes"' });
    const decoded = decodeURIComponent(calls[0]?.path ?? '');
    expect(decoded).toContain('SEARCH(LOWER(');
    // ensure quotes were escaped (not blowing up the formula)
    expect(decoded).toContain('\\"quotes\\"');
    expect(page.hasMore).toBe(true);
  });

  it('delete maps 404 to false and 200 to true', async () => {
    nextResponse = { deleted: true };
    expect(await repo.delete('recT')).toBe(true);
    const { airtableFetch } = await import('../../src/lib/airtable-client.js');
    (airtableFetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      Object.assign(new Error('gone'), { status: 404 }),
    );
    expect(await repo.delete('recT2')).toBe(false);
  });

  it('get returns the mapped template', async () => {
    nextResponse = {
      id: 'recT',
      createdTime: '2026-05-10T00:00:00Z',
      fields: { name: 'Story', usage_count: 3 },
    };
    const out = await repo.get('recT');
    expect(out?.recordId).toBe('recT');
    expect(out?.usageCount).toBe(3);
  });

  it('get maps 404 to null', async () => {
    const { airtableFetch } = await import('../../src/lib/airtable-client.js');
    (airtableFetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      Object.assign(new Error('gone'), { status: 404 }),
    );
    expect(await repo.get('recT')).toBeNull();
  });
});

describe('AirtableKnowledgeRepo — Cycle 3 findByNameCategory + list ?q', () => {
  const repo = new AirtableKnowledgeRepo();

  it('list ?q builds SEARCH(LOWER(...)) formula', async () => {
    nextResponse = { records: [], offset: undefined };
    await repo.list({ q: 'PAS', limit: 20, offset: 0 });
    const decoded = decodeURIComponent(calls[0]?.path ?? '');
    expect(decoded).toContain('SEARCH(LOWER(');
    expect(decoded).toContain('pas');
  });

  it('findByNameCategory returns mapped record on match', async () => {
    nextResponse = {
      records: [
        {
          id: 'recF',
          createdTime: '2026-05-10T00:00:00Z',
          fields: { name: 'PAS', category: 'Frameworks' },
        },
      ],
    };
    const out = await repo.findByNameCategory('PAS', 'Frameworks');
    expect(out?.recordId).toBe('recF');
    const decoded = decodeURIComponent(calls[0]?.path ?? '');
    expect(decoded).toContain('AND({name}="PAS",{category}="Frameworks")');
  });

  it('findByNameCategory returns null when records[] is empty', async () => {
    nextResponse = { records: [] };
    const out = await repo.findByNameCategory('NoSuch', 'Frameworks');
    expect(out).toBeNull();
  });

  it('update PATCHes the encoded knowledge fields', async () => {
    nextResponse = {
      id: 'recK',
      createdTime: '2026-05-10T00:00:00Z',
      fields: { name: 'PAS', category: 'Frameworks', description: 'updated' },
    };
    await repo.update('recK', { description: 'updated' });
    expect(calls[0]?.init.method).toBe('PATCH');
    const body = JSON.parse((calls[0]?.init.body as string) ?? '{}');
    expect(body.fields.description).toBe('updated');
  });
});

describe('AirtableCarouselRepo — list + get extra paths', () => {
  const repo = new AirtableCarouselRepo();

  it('list with cursor sets ?offset and AND-combines two filters', async () => {
    nextResponse = { records: [], offset: 'cur-2' };
    const page = await repo.list({
      limit: 10,
      cursor: 'cur-1',
      seriesId: 's-A',
      parentCarouselId: 'p-X',
    });
    expect(page.nextCursor).toBe('cur-2');
    const decoded = decodeURIComponent(calls[0]?.path ?? '');
    expect(decoded).toContain('offset=cur-1');
    expect(decoded).toContain('AND(');
    expect(decoded).toContain('{series_id}="s-A"');
    expect(decoded).toContain('{parent_carousel_id}="p-X"');
  });

  it('get maps 404 to null', async () => {
    const { airtableFetch } = await import('../../src/lib/airtable-client.js');
    (airtableFetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      Object.assign(new Error('gone'), { status: 404 }),
    );
    expect(await repo.get('recX')).toBeNull();
  });
});
