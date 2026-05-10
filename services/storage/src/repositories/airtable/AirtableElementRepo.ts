// AirtableElementRepo.ts — Airtable adapter for IElementRepo.
import type {
  IElementRepo,
  ListElementsArgs,
} from '../interfaces/IElementRepo.js';
import type {
  ElementItem,
  ElementCreate,
  ElementPatch,
  ListPage,
} from '../../types/domain.js';
import type {
  AirtableListResponse,
  AirtableRecord,
  AirtableElementFields,
} from '../../types/airtable.js';
import { airtableFetch } from '../../lib/airtable-client.js';
import { airtableToElement } from '../../lib/vendor-mapper.js';
import { encodeElement } from './airtable-encode.js';

const TABLE = 'Elements';

// Cycle 2 Fix F4 (Review §M2): see AirtableKnowledgeRepo for the full
// rationale — escape backslash first, then quote forms, drop CR/LF.
function escape(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/[\r\n]/g, ' ');
}

function buildFormula(args: ListElementsArgs): string | null {
  const clauses: string[] = [];
  if (args.type) clauses.push(`{type}="${escape(args.type)}"`);
  if (args.q) clauses.push(`SEARCH(LOWER("${escape(args.q.toLowerCase())}"), LOWER({name}&""))`);
  if (clauses.length === 0) return null;
  return clauses.length === 1 ? (clauses[0] ?? null) : `AND(${clauses.join(',')})`;
}

export class AirtableElementRepo implements IElementRepo {
  async list(args: ListElementsArgs): Promise<ListPage<ElementItem>> {
    const params = new URLSearchParams();
    params.set('pageSize', String(args.limit));
    const formula = buildFormula(args);
    if (formula) params.set('filterByFormula', formula);
    const data = await airtableFetch<AirtableListResponse<AirtableElementFields>>(
      `/${TABLE}?${params.toString()}`,
    );
    const items = data.records.map(airtableToElement);
    return { items, total: items.length, hasMore: Boolean(data.offset) };
  }

  async get(id: string): Promise<ElementItem | null> {
    try {
      const rec = await airtableFetch<AirtableRecord<AirtableElementFields>>(`/${TABLE}/${id}`);
      return airtableToElement(rec);
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }

  async create(input: ElementCreate): Promise<ElementItem> {
    const rec = await airtableFetch<AirtableRecord<AirtableElementFields>>(`/${TABLE}`, {
      method: 'POST',
      body: JSON.stringify({ fields: encodeElement(input) }),
    });
    return airtableToElement(rec);
  }

  async update(id: string, patch: ElementPatch): Promise<ElementItem> {
    const rec = await airtableFetch<AirtableRecord<AirtableElementFields>>(`/${TABLE}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ fields: encodeElement(patch) }),
    });
    return airtableToElement(rec);
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
