// AirtableTemplateRepo.ts — Airtable adapter for ITemplateRepo.
import type {
  ITemplateRepo,
  ListTemplatesArgs,
} from '../interfaces/ITemplateRepo.js';
import type {
  TemplateItem,
  TemplateCreate,
  TemplatePatch,
  ListPage,
} from '../../types/domain.js';
import type {
  AirtableListResponse,
  AirtableRecord,
  AirtableTemplateFields,
} from '../../types/airtable.js';
import { airtableFetch } from '../../lib/airtable-client.js';
import { airtableToTemplate } from '../../lib/vendor-mapper.js';
import { encodeTemplate } from './airtable-encode.js';

const TABLE = 'Templates';

export class AirtableTemplateRepo implements ITemplateRepo {
  async list(args: ListTemplatesArgs): Promise<ListPage<TemplateItem>> {
    const params = new URLSearchParams();
    params.set('pageSize', String(args.limit));
    if (args.q) {
      // Cycle 2 Fix F4 (Review §M2): full escape (backslash-first, quotes,
      // CR/LF) keeps Airtable's formula parser from blowing up on weird input.
      const q = args.q
        .toLowerCase()
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/'/g, "\\'")
        .replace(/[\r\n]/g, ' ');
      params.set('filterByFormula', `SEARCH(LOWER("${q}"), LOWER({name}&""))`);
    }
    const data = await airtableFetch<AirtableListResponse<AirtableTemplateFields>>(
      `/${TABLE}?${params.toString()}`,
    );
    const items = data.records.map(airtableToTemplate);
    return { items, total: items.length, hasMore: Boolean(data.offset) };
  }

  async get(id: string): Promise<TemplateItem | null> {
    try {
      const rec = await airtableFetch<AirtableRecord<AirtableTemplateFields>>(`/${TABLE}/${id}`);
      return airtableToTemplate(rec);
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }

  async create(input: TemplateCreate): Promise<TemplateItem> {
    const rec = await airtableFetch<AirtableRecord<AirtableTemplateFields>>(`/${TABLE}`, {
      method: 'POST',
      body: JSON.stringify({ fields: encodeTemplate(input) }),
    });
    return airtableToTemplate(rec);
  }

  async update(id: string, patch: TemplatePatch): Promise<TemplateItem> {
    const rec = await airtableFetch<AirtableRecord<AirtableTemplateFields>>(`/${TABLE}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ fields: encodeTemplate(patch) }),
    });
    return airtableToTemplate(rec);
  }

  async incrementUsage(id: string, by = 1): Promise<TemplateItem> {
    // Airtable lacks atomic increments. Read-modify-write is acceptable for
    // analytics-class data (last-writer-wins). Caller may queue if exact
    // semantics are needed.
    const current = await this.get(id);
    if (!current) throw Object.assign(new Error('template not found'), { status: 404 });
    return this.update(id, { usageCount: current.usageCount + by });
  }

  async delete(id: string): Promise<boolean> {
    try {
      await airtableFetch<{ deleted: boolean }>(`/${TABLE}/${id}`, { method: 'DELETE' });
      return true;
    } catch (err) {
      if (isNotFound(err)) return false;
      throw err;
    }
  }
}

function isNotFound(err: unknown): boolean {
  const status = (err as { status?: number } | undefined)?.status;
  return status === 404;
}
