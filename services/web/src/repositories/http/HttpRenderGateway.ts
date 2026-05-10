// HttpRenderGateway — web → render `/render`, `/preview/:slideId`
// v1.0.1 contract gap fix:
//   render service expects { slides:[{id, html}], format:'png', aspectRatio? } and
//   replies with raw `application/zip`. The Saga upstream expects URL-keyed result
//   { zipUrl, pngUrls, durationMs }. Translate both sides here so neither end has
//   to know the other's shape.
//
// Wire steps per render() call:
//   1. ContentSlide → safe HTML via contentSlideToHtml() (XSS-escaped).
//   2. POST /render with { id, html } slides — raw fetch (response is binary, not JSON).
//   3. Parse ZIP entries, sort by entry name (already `slide-001.png` → ordered).
//   4. Park PNGs + ZIP in render-temp-store, mint same-process URLs the Saga can fetch.
//   5. Return RenderResult with same-process URLs.
//
// Cycle 2 Fix (F3, 🟠-4) preservation: preview() still uses postJson + Zod schema.
import AdmZip from 'adm-zip';
import { z } from 'zod';
import type { IRenderGateway, RenderInput, RenderResult } from '@/repositories/interfaces/IRenderGateway';
import type { IServiceClient } from '@/repositories/interfaces/IServiceClient';
import { contentSlideToHtml } from '@/lib/content-to-html';
import { storeRender } from '@/lib/render-temp-store';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

const PreviewSchema = z.object({ pngUrl: z.string() });

export class HttpRenderGateway implements IRenderGateway {
  constructor(private readonly client: IServiceClient) {}

  async render(input: RenderInput): Promise<RenderResult> {
    const start = Date.now();
    const wireBody = {
      aspectRatio: input.ratio,
      format: 'png' as const,
      ...(input.watermark
        ? { watermark: { enabled: true, text: 'made with slidesmith' } }
        : {}),
      slides: input.slides.map((s) => ({
        id: `slide-${String(s.index).padStart(3, '0')}`,
        html: contentSlideToHtml(s),
      })),
    };
    // Render service returns binary ZIP (not JSON) — bypass postJson + Zod schema,
    // use raw fetch via the client (preserves timeout + correlation_id wiring).
    const res = await this.client.fetch('/render', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(wireBody),
      timeoutMs: 60_000,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '<no body>');
      throw new Error(`POST /render → ${res.status}: ${text.slice(0, 200)}`);
    }
    const zipBuf = Buffer.from(await res.arrayBuffer());
    const pngs = unpackZipPngs(zipBuf);
    if (pngs.length === 0) {
      throw new Error('render: ZIP contained 0 PNG entries');
    }
    const token = storeRender(pngs, zipBuf);
    const baseUrl = env.WEB_INTERNAL_URL;
    const durationMs = Date.now() - start;
    logger.info(
      { slides: pngs.length, zipBytes: zipBuf.length, durationMs, token },
      'render: ZIP extracted to temp store',
    );
    return {
      zipUrl: `${baseUrl}/api/render/temp/${token}/zip`,
      pngUrls: pngs.map((_, i) => `${baseUrl}/api/render/temp/${token}/${i}`),
      durationMs,
    };
  }

  async preview(slideIndex: number, html: string): Promise<{ pngUrl: string }> {
    return this.client.postJson(
      `/preview/${slideIndex}`,
      { html },
      { timeoutMs: 15_000 },
      PreviewSchema,
    );
  }
}

/** Extract PNG buffers from render service ZIP, sorted by entry name (slide-001…). */
function unpackZipPngs(zipBuf: Buffer): Buffer[] {
  const zip = new AdmZip(zipBuf);
  return zip
    .getEntries()
    .filter((e) => !e.isDirectory && e.entryName.toLowerCase().endsWith('.png'))
    .sort((a, b) => a.entryName.localeCompare(b.entryName))
    .map((e) => e.getData());
}
