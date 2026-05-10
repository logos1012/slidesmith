// AirtableKnowledgeRepo.ts — Airtable adapter for IKnowledgeRepo (DIP).
// Routes/services depend on the interface, never on this concrete class.
import type {
  IKnowledgeRepo,
  ListKnowledgeArgs,
} from '../interfaces/IKnowledgeRepo.js';
import type {
  KnowledgeItem,
  KnowledgeCreate,
  KnowledgePatch,
  ListPage,
} from '../../types/domain.js';
import type {
  AirtableListResponse,
  AirtableRecord,
  AirtableKnowledgeFields,
} from '../../types/airtable.js';
import { airtableFetch } from '../../lib/airtable-client.js';
import { airtableToKnowledge } from '../../lib/vendor-mapper.js';
import { encodeKnowledge } from './airtable-encode.js';

const TABLE = 'Knowledge';

// Cycle 2 Fix F4 (Review §M2): escape every char Airtable's formula parser
// treats as syntax — `\` must come first to avoid double-escaping our own
// inserted backslashes. `'` is included for symmetry with formulas that
// switch quote style. CR/LF are stripped since they break the parser entirely.
function escape(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/[\r\n]/g, ' ');
}

function buildFormula(args: ListKnowledgeArgs): string | null {
  const clauses: string[] = [];
  if (args.category) clauses.push(`{category}="${escape(args.category)}"`);
  if (args.q) clauses.push(`SEARCH(LOWER("${escape(args.q.toLowerCase())}"), LOWER({name}&""))`);
  if (clauses.length === 0) return null;
  return clauses.length === 1 ? (clauses[0] ?? null) : `AND(${clauses.join(',')})`;
}

export class AirtableKnowledgeRepo implements IKnowledgeRepo {
  async list(args: ListKnowledgeArgs): Promise<ListPage<KnowledgeItem>> {
    // Airtable does not expose a true `total` cheaply. We page with pageSize=limit
    // and surface `hasMore` from the offset cursor presence (Cycle 2 contract).
    const params = new URLSearchParams();
    params.set('pageSize', String(args.limit));
    const formula = buildFormula(args);
    if (formula) params.set('filterByFormula', formula);
    // offset is opaque from Airtable — for simple offset-paging we accept that
    // numeric offset is not natively supported. Cycle 3 lifts this to cursor.
    const data = await airtableFetch<AirtableListResponse<AirtableKnowledgeFields>>(
      `/${TABLE}?${params.toString()}`,
    );
    const items = data.records.map(airtableToKnowledge);
    return {
      items,
      total: items.length,
      hasMore: Boolean(data.offset),
    };
  }

  async get(id: string): Promise<KnowledgeItem | null> {
    try {
      const rec = await airtableFetch<AirtableRecord<AirtableKnowledgeFields>>(`/${TABLE}/${id}`);
      return airtableToKnowledge(rec);
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }

  async create(input: KnowledgeCreate): Promise<KnowledgeItem> {
    const rec = await airtableFetch<AirtableRecord<AirtableKnowledgeFields>>(`/${TABLE}`, {
      method: 'POST',
      body: JSON.stringify({ fields: encodeKnowledge(input), typecast: true }),
    });
    return airtableToKnowledge(rec);
  }

  async update(id: string, patch: KnowledgePatch): Promise<KnowledgeItem> {
    const rec = await airtableFetch<AirtableRecord<AirtableKnowledgeFields>>(`/${TABLE}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ fields: encodeKnowledge(patch), typecast: true }),
    });
    return airtableToKnowledge(rec);
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

  /**
   * Cycle 3 — single-record lookup by `(name, category)` for `POST /knowledge/seed`
   * upsert. Uses `filterByFormula` with both fields ANDed so the round-trip is
   * one cheap Airtable call (no full-table scan).
   */
  async findByNameCategory(name: string, category: string): Promise<KnowledgeItem | null> {
    const formula = `AND({name}="${escape(name)}",{category}="${escape(category)}")`;
    const params = new URLSearchParams();
    params.set('pageSize', '1');
    params.set('filterByFormula', formula);
    const data = await airtableFetch<AirtableListResponse<AirtableKnowledgeFields>>(
      `/${TABLE}?${params.toString()}`,
    );
    const first = data.records[0];
    return first ? airtableToKnowledge(first) : null;
  }
}

function isNotFound(err: unknown): boolean {
  // Avoid importing AirtableError directly to keep this file decoupled from the
  // client class — duck-type the status property instead.
  const status = (err as { status?: number } | undefined)?.status;
  return status === 404;
}
