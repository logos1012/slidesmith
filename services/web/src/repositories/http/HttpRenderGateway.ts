// HttpRenderGateway — web → render `/render`, `/preview/:slideId`
// Cycle 2 Fix (F3, 🟠-4): upstream 응답 Zod parse.
import type { IRenderGateway, RenderInput, RenderResult } from '@/repositories/interfaces/IRenderGateway';
import type { IServiceClient } from '@/repositories/interfaces/IServiceClient';
import { RenderResultSchema } from '@/lib/schemas/upstream.schema';
import { z } from 'zod';

const PreviewSchema = z.object({ pngUrl: z.string() });

export class HttpRenderGateway implements IRenderGateway {
  constructor(private readonly client: IServiceClient) {}

  async render(input: RenderInput): Promise<RenderResult> {
    return this.client.postJson('/render', input, { timeoutMs: 60_000 }, RenderResultSchema);
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
