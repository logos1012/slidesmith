// IKnowledgeRepo.ts — server-side DIP (sw-eng §4-2 / SPEC §1).
// Vendor-neutral: only domain types cross this boundary.
import type {
  KnowledgeItem,
  KnowledgeCreate,
  KnowledgePatch,
  ListPage,
} from '../../types/domain.js';

export interface ListKnowledgeArgs {
  category?: string;
  q?: string;
  limit: number;
  offset: number;
}

export interface IKnowledgeRepo {
  list(args: ListKnowledgeArgs): Promise<ListPage<KnowledgeItem>>;
  get(id: string): Promise<KnowledgeItem | null>;
  create(input: KnowledgeCreate): Promise<KnowledgeItem>;
  update(id: string, patch: KnowledgePatch): Promise<KnowledgeItem>;
  delete(id: string): Promise<boolean>;
  /**
   * Cycle 3 — used by `POST /knowledge/seed` to upsert by `(category, name)`
   * without scanning the whole table. Repos that have a unique-key index map
   * this to a `filterByFormula` query; the in-memory fake walks the store.
   * Returns null when no exact match exists.
   */
  findByNameCategory(name: string, category: string): Promise<KnowledgeItem | null>;
}
