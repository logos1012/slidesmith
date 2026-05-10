// src/routes/image.ts — POST /image/generate
// SPEC: SERVICE-llm.md §5-6.
// Cycle 2 Fix:
//   F1 — sanitizeErrorMessage on userMessage.why and stderr passthrough.
//   F4 — distinguish CB-open (503) from script failure (502) and key-missing (503).
// Cycle 3:
//   A1 — vendor errors classified into 401/429/5xx/CB/no-backend/network/unknown.
//   B2 — accept all 4 ratios (1:1, 4:5, 16:9, 9:16) and propagate as-is to script.
//   C1 — userMessage uses unified 4-원칙 (mapErrorToKoreanUserMessage).
// Cycle 3 Fix F1:
//   Single funnel via respondWithKoreanError — Phase 6 contract enforcement.

import { Hono } from 'hono';
import { z } from 'zod';
import { generateImage } from '../services/gemini.service.js';
import { logger } from '../lib/logger.js';
import { classifyError, sanitizeErrorMessage } from '../lib/sanitize-error.js';
import { errorCodeFor, respondWithKoreanError } from '../lib/korean-ux.js';

const ImageBody = z.object({
  prompt: z.string().min(1).max(2000),
  ratio: z.enum(['1:1', '4:5', '16:9', '9:16']).optional(),
  count: z.number().int().min(1).max(4).optional(),
});

export const imageRoute = new Hono();

imageRoute.post('/image/generate', async (c) => {
  const json = await c.req.json().catch(() => null);
  const parsed = ImageBody.safeParse(json);
  if (!parsed.success) {
    return c.json({ error: 'BAD_REQUEST', details: parsed.error.flatten() }, 400);
  }
  try {
    const result = await generateImage(parsed.data);
    if (!result.ok) {
      const safeMsg = sanitizeErrorMessage(result.message ?? 'unknown');
      // P2-4: tighten substring matching — anchor on explicit markers we emit
      // ourselves from gemini.service / generate_image.py instead of the loose
      // "missing" / "config_error" substring (which could match unrelated stderr).
      const isMissingKey =
        result.message === 'GEMINI_API_KEY missing' ||
        /^GEMINI_API_KEY\s+missing/i.test(result.message ?? '');
      const isConfigError = /\bgemini_config_error\b/i.test(result.message ?? '');
      // Image-specific config error: name GEMINI_API_KEY (NOT ANTHROPIC).
      if (isMissingKey || isConfigError) {
        const userMessage = {
          what: '이미지 생성 실패',
          why: 'Gemini API 키가 설정되지 않았거나 유효하지 않습니다.',
          next: 'GEMINI_API_KEY를 환경변수에 추가한 뒤 다시 시도해 주세요.',
          recovery: '설정 완료 후 즉시 사용 가능합니다. 직접 이미지 업로드 모드도 가능합니다.',
        };
        return c.json({ ...result, message: safeMsg, userMessage }, 503);
      }
      // Phase 6 contract: route every other gemini failure through the single
      // Korean funnel so the error code/status/userMessage shape is uniform.
      return respondWithKoreanError(c, new Error(safeMsg), '이미지 생성 실패', 'IMAGE_GEN_FAILED', {
        ...result,
        message: safeMsg,
      });
    }
    return c.json(result, 200);
  } catch (err) {
    const cls = classifyError(err);
    logger.error(
      { errorClass: cls, errorCode: errorCodeFor(cls, 'IMAGE_GEN_FAILED') },
      'image_generate_failed',
    );
    return respondWithKoreanError(c, err, '이미지 생성 실패', 'IMAGE_GEN_FAILED');
  }
});
