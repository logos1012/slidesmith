// ITemplateRepo.ts — server-side DIP.
import type {
  TemplateItem,
  TemplateCreate,
  TemplatePatch,
  ListPage,
} from '../../types/domain.js';

export interface ListTemplatesArgs {
  q?: string;
  limit: number;
  offset: number;
}

export interface ITemplateRepo {
  list(args: ListTemplatesArgs): Promise<ListPage<TemplateItem>>;
  get(id: string): Promise<TemplateItem | null>;
  create(input: TemplateCreate): Promise<TemplateItem>;
  update(id: string, patch: TemplatePatch): Promise<TemplateItem>;
  /** PATCH /:id/usage — atomic-ish counter increment (Airtable single field). */
  incrementUsage(id: string, by?: number): Promise<TemplateItem>;
  delete(id: string): Promise<boolean>;
  /**
   * v1.1.2 — used by `POST /templates/seed` to upsert by `name` without
   * scanning the whole table. Repos that have an indexable name field map
   * this to a `filterByFormula` query; the in-memory fake walks the store.
   * Returns null when no exact match exists.
   */
  findByName(name: string): Promise<TemplateItem | null>;
}
