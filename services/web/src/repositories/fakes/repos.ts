// fakes/repos.ts — Knowledge / Template / Carousel / Element 4 도메인 fakes
import type { IKnowledgeRepo, KnowledgeRecord } from '@/repositories/interfaces/IKnowledgeRepo';
import type { ITemplateRepo, TemplateRecord } from '@/repositories/interfaces/ITemplateRepo';
import type { ICarouselRepo, CarouselRecord, CarouselSaveInput } from '@/repositories/interfaces/ICarouselRepo';
import type { IElementRepo, ElementRecord } from '@/repositories/interfaces/IElementRepo';
import { newUUID, nowIso } from '@/types/foundation';

export class FakeKnowledgeRepo implements IKnowledgeRepo {
  async list(): Promise<KnowledgeRecord[]> { return []; }
  async bySensitiveTopics(): Promise<KnowledgeRecord[]> { return []; }
}
export class FakeTemplateRepo implements ITemplateRepo {
  constructor(private items: TemplateRecord[] = []) {}
  async list() { return this.items; }
  async detect() { return this.items[0] ?? null; }
}
export class FakeCarouselRepo implements ICarouselRepo {
  saved: CarouselRecord[] = [];
  async list() { return { items: this.saved }; }
  async save(i: CarouselSaveInput) {
    const r: CarouselRecord = { id: newUUID(), title: i.title, ratios: i.ratios, platform: i.platform,
      s3Urls: i.s3Urls, ...(i.caption !== undefined ? { caption: i.caption } : {}), createdAt: nowIso() };
    this.saved.push(r); return r;
  }
  async get(id: string) { return this.saved.find((c) => c.id === id) ?? null; }
}
export class FakeElementRepo implements IElementRepo {
  async list(): Promise<ElementRecord[]> { return []; }
  async matchForSlide(): Promise<ElementRecord[]> { return []; }
}
