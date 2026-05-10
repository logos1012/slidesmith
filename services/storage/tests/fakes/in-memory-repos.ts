// in-memory-repos.ts — fakes for Repository interfaces (sw-eng §4-3).
// Used by route + service tests so we never hit Airtable / S3 in unit + integ.
import { nanoid } from 'nanoid';
import type {
  IKnowledgeRepo,
  ListKnowledgeArgs,
} from '../../src/repositories/interfaces/IKnowledgeRepo.js';
import type {
  ITemplateRepo,
  ListTemplatesArgs,
} from '../../src/repositories/interfaces/ITemplateRepo.js';
import type {
  ICarouselRepo,
  ListCarouselsArgs,
} from '../../src/repositories/interfaces/ICarouselRepo.js';
import type {
  IElementRepo,
  ListElementsArgs,
} from '../../src/repositories/interfaces/IElementRepo.js';
import type {
  IBlobStorage,
  UploadInput,
} from '../../src/repositories/interfaces/IBlobStorage.js';
import type {
  KnowledgeItem,
  KnowledgeCreate,
  KnowledgePatch,
  TemplateItem,
  TemplateCreate,
  TemplatePatch,
  Carousel,
  CarouselCreate,
  CarouselPatch,
  ElementItem,
  ElementCreate,
  ElementPatch,
  ListPage,
  CursorPage,
  BlobUploadResult,
  BlobSignedUrl,
} from '../../src/types/domain.js';

function id(prefix: string): string {
  return `${prefix}_${nanoid(10)}`;
}

export class FakeKnowledgeRepo implements IKnowledgeRepo {
  private store = new Map<string, KnowledgeItem>();

  async list(args: ListKnowledgeArgs): Promise<ListPage<KnowledgeItem>> {
    let items = [...this.store.values()];
    if (args.category) items = items.filter((i) => i.category === args.category);
    if (args.q) items = items.filter((i) => i.name.toLowerCase().includes(args.q!.toLowerCase()));
    const total = items.length;
    const sliced = items.slice(args.offset, args.offset + args.limit);
    return { items: sliced, total, hasMore: args.offset + args.limit < total };
  }

  async get(id: string): Promise<KnowledgeItem | null> {
    return this.store.get(id) ?? null;
  }

  async create(input: KnowledgeCreate): Promise<KnowledgeItem> {
    const recordId = id('rec');
    const item: KnowledgeItem = {
      id: recordId,
      recordId,
      name: input.name,
      category: input.category,
      description: input.description ?? '',
      whenToUse: input.whenToUse ?? '',
      structure: input.structure ?? '',
      examples: input.examples ?? '',
      tags: input.tags ?? [],
    };
    this.store.set(recordId, item);
    return item;
  }

  async update(id: string, patch: KnowledgePatch): Promise<KnowledgeItem> {
    const cur = this.store.get(id);
    if (!cur) throw Object.assign(new Error('not found'), { status: 404 });
    const next: KnowledgeItem = {
      ...cur,
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.category !== undefined ? { category: patch.category } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.whenToUse !== undefined ? { whenToUse: patch.whenToUse } : {}),
      ...(patch.structure !== undefined ? { structure: patch.structure } : {}),
      ...(patch.examples !== undefined ? { examples: patch.examples } : {}),
      ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
    };
    this.store.set(id, next);
    return next;
  }

  async delete(idArg: string): Promise<boolean> {
    return this.store.delete(idArg);
  }

  async findByNameCategory(name: string, category: string): Promise<KnowledgeItem | null> {
    for (const item of this.store.values()) {
      if (item.name === name && item.category === category) return item;
    }
    return null;
  }
}

export class FakeTemplateRepo implements ITemplateRepo {
  private store = new Map<string, TemplateItem>();

  async list(args: ListTemplatesArgs): Promise<ListPage<TemplateItem>> {
    let items = [...this.store.values()];
    if (args.q) items = items.filter((i) => i.name.toLowerCase().includes(args.q!.toLowerCase()));
    const total = items.length;
    const sliced = items.slice(args.offset, args.offset + args.limit);
    return { items: sliced, total, hasMore: args.offset + args.limit < total };
  }

  async get(idArg: string): Promise<TemplateItem | null> {
    return this.store.get(idArg) ?? null;
  }

  async create(input: TemplateCreate): Promise<TemplateItem> {
    const recordId = id('rec');
    const item: TemplateItem = {
      id: recordId,
      recordId,
      name: input.name,
      schema: input.schema ?? {},
      narrativeArc: input.narrativeArc ?? '',
      files: input.files ?? [],
      version: input.version ?? '0.0.0',
      usageCount: input.usageCount ?? 0,
    };
    this.store.set(recordId, item);
    return item;
  }

  async update(idArg: string, patch: TemplatePatch): Promise<TemplateItem> {
    const cur = this.store.get(idArg);
    if (!cur) throw Object.assign(new Error('not found'), { status: 404 });
    const next: TemplateItem = {
      ...cur,
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.schema !== undefined ? { schema: patch.schema } : {}),
      ...(patch.narrativeArc !== undefined ? { narrativeArc: patch.narrativeArc } : {}),
      ...(patch.files !== undefined ? { files: patch.files } : {}),
      ...(patch.version !== undefined ? { version: patch.version } : {}),
      ...(patch.usageCount !== undefined ? { usageCount: patch.usageCount } : {}),
    };
    this.store.set(idArg, next);
    return next;
  }

  async incrementUsage(idArg: string, by = 1): Promise<TemplateItem> {
    const cur = this.store.get(idArg);
    if (!cur) throw Object.assign(new Error('not found'), { status: 404 });
    return this.update(idArg, { usageCount: cur.usageCount + by });
  }

  async delete(idArg: string): Promise<boolean> {
    return this.store.delete(idArg);
  }

  async findByName(name: string): Promise<TemplateItem | null> {
    for (const item of this.store.values()) {
      if (item.name === name) return item;
    }
    return null;
  }
}

export class FakeCarouselRepo implements ICarouselRepo {
  private store = new Map<string, Carousel>();
  /** Test hook: lets specs preload records without going through create(). */
  seed(c: Carousel): void {
    this.store.set(c.id, c);
  }

  async list(args: ListCarouselsArgs): Promise<CursorPage<Carousel>> {
    let items = [...this.store.values()];
    if (args.seriesId) items = items.filter((c) => c.seriesId === args.seriesId);
    if (args.parentCarouselId)
      items = items.filter((c) => c.parentCarouselId === args.parentCarouselId);
    const start = args.cursor ? Number(args.cursor) : 0;
    const slice = items.slice(start, start + args.limit);
    const next = start + args.limit;
    return { items: slice, nextCursor: next < items.length ? String(next) : null };
  }

  async get(idArg: string): Promise<Carousel | null> {
    return this.store.get(idArg) ?? null;
  }

  async create(input: CarouselCreate): Promise<Carousel> {
    const recordId = id('recCar');
    const c: Carousel = {
      id: recordId,
      recordId,
      brief: input.brief ?? input.title ?? '',
      templateId: input.templateId ?? '',
      content: input.content ?? {},
      brandDSLSnapshot: input.brandDSLSnapshot ?? {},
      hookCategory: input.hookCategory ?? null,
      narrativeArc: input.narrativeArc ?? null,
      frameworksUsed: input.frameworksUsed ?? [],
      s3Keys: input.s3Keys ?? [],
      aspectRatio: input.aspectRatio ?? '1:1',
      watermarkEnabled: input.watermarkEnabled ?? false,
      templateSchemaVersion: input.templateSchemaVersion ?? '1.0.0',
      seriesId: input.seriesId ?? null,
      seriesVolume: input.seriesVolume ?? null,
      parentCarouselId: input.parentCarouselId ?? null,
      repurposeType: input.repurposeType ?? null,
      moderationStatus: input.moderationStatus ?? null,
      captionJson: input.captionJson ?? null,
      insightsJson: input.insightsJson ?? null,
      lastUsedAt: input.lastUsedAt ?? null,
      versionHistory: input.versionHistory ?? [],
      createdAt: new Date().toISOString(),
    };
    this.store.set(recordId, c);
    return c;
  }

  async update(idArg: string, patch: CarouselPatch): Promise<Carousel> {
    const cur = this.store.get(idArg);
    if (!cur) throw Object.assign(new Error('not found'), { status: 404 });
    const next: Carousel = { ...cur };
    for (const [k, v] of Object.entries(patch)) {
      if (v !== undefined) (next as Record<string, unknown>)[k] = v;
    }
    this.store.set(idArg, next);
    return next;
  }

  async delete(idArg: string): Promise<boolean> {
    return this.store.delete(idArg);
  }
}

export class FakeElementRepo implements IElementRepo {
  private store = new Map<string, ElementItem>();

  async list(args: ListElementsArgs): Promise<ListPage<ElementItem>> {
    let items = [...this.store.values()];
    if (args.type) items = items.filter((e) => e.type === args.type);
    if (args.q) items = items.filter((e) => e.name.toLowerCase().includes(args.q!.toLowerCase()));
    const total = items.length;
    const sliced = items.slice(args.offset, args.offset + args.limit);
    return { items: sliced, total, hasMore: args.offset + args.limit < total };
  }

  async get(idArg: string): Promise<ElementItem | null> {
    return this.store.get(idArg) ?? null;
  }

  async create(input: ElementCreate): Promise<ElementItem> {
    const recordId = id('recEl');
    const item: ElementItem = {
      id: recordId,
      recordId,
      type: input.type,
      name: input.name,
      src: input.src,
      aliases: input.aliases ?? [],
      tags: input.tags ?? [],
    };
    this.store.set(recordId, item);
    return item;
  }

  async update(idArg: string, patch: ElementPatch): Promise<ElementItem> {
    const cur = this.store.get(idArg);
    if (!cur) throw Object.assign(new Error('not found'), { status: 404 });
    const next: ElementItem = {
      ...cur,
      ...(patch.type !== undefined ? { type: patch.type } : {}),
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.src !== undefined ? { src: patch.src } : {}),
      ...(patch.aliases !== undefined ? { aliases: patch.aliases } : {}),
      ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
    };
    this.store.set(idArg, next);
    return next;
  }

  async delete(idArg: string): Promise<boolean> {
    return this.store.delete(idArg);
  }
}

export class FakeBlobStorage implements IBlobStorage {
  private store = new Map<string, { body: Buffer; contentType: string }>();

  async upload(input: UploadInput): Promise<BlobUploadResult> {
    this.store.set(input.key, { body: input.body, contentType: input.contentType });
    return {
      key: input.key,
      url: `https://signed.test.local/${input.key}?sig=fake&exp=300`,
      etag: `"etag-${nanoid(8)}"`,
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
    };
  }

  async signRead(key: string, ttlSeconds = 300): Promise<BlobSignedUrl> {
    return {
      url: `https://signed.test.local/${key}?sig=fake&exp=${ttlSeconds}`,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
      ttlSeconds,
    };
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }
}
