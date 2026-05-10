// fakes/services.ts — Blob / Llm / Render gateway fakes
import type { IBlobStorage, BlobUploadInput, BlobUploadResult } from '@/repositories/interfaces/IBlobStorage';
import type { ILlmGateway, ContentGenerateInput, ContentSlide, CaptionInput, ChatStreamInput } from '@/repositories/interfaces/ILlmGateway';
import type { IRenderGateway, RenderInput, RenderResult } from '@/repositories/interfaces/IRenderGateway';

export class FakeBlobStorage implements IBlobStorage {
  uploaded: string[] = []; deleted: string[] = []; failOn?: string;
  async upload(i: BlobUploadInput): Promise<BlobUploadResult> {
    if (this.failOn === i.key) throw new Error('upload failed');
    this.uploaded.push(i.key); return { key: i.key, url: `s3://bucket/${i.key}`, size: 1 };
  }
  async presignedUrl(key: string) { return `https://presign/${key}`; }
  async delete(key: string) { this.deleted.push(key); }
}
export class FakeLlmGateway implements ILlmGateway {
  failCaption = false; failModerate = false; flagged: string[] = [];
  async chatStream(_i: ChatStreamInput) { return new Response('hi'); }
  async generateContent(i: ContentGenerateInput) {
    return { slides: Array.from({ length: i.slideCount }, (_, idx): ContentSlide => ({ index: idx, title: `t${idx}`, body: `b${idx}` })) };
  }
  async generateCaption(_i: CaptionInput) {
    if (this.failCaption) throw new Error('caption down');
    return { caption: 'cap', hashtags: ['#x'] };
  }
  async moderate() {
    if (this.failModerate) throw new Error('moderate down');
    return { ok: this.flagged.length === 0, flaggedTerms: this.flagged };
  }
}
export class FakeRenderGateway implements IRenderGateway {
  failRender = false;
  async render(i: RenderInput): Promise<RenderResult> {
    if (this.failRender) throw new Error('render down');
    return { zipUrl: 'z', pngUrls: i.slides.map((_, idx) => `data:,${idx}`), durationMs: 1 };
  }
  async preview() { return { pngUrl: 'p' }; }
}
