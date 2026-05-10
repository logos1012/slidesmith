// src/routes/health.ts — GET /health
// SPEC: SERVICE-llm.md §5-1, §7. Cycle 2: real ping + circuit-breaker state.

import { Hono } from 'hono';
import { getClaudeAvailability } from '../services/claude.service.js';
import { isAnthropicConfigured } from '../services/anthropic-sdk.service.js';
import { isGeminiConfigured, probeGemini } from '../services/gemini.service.js';
import { getBreakerState } from '../lib/failure-boundary.js';

const startedAt = Date.now();

export const healthRoute = new Hono();

healthRoute.get('/health', async (c) => {
  const claude = await getClaudeAvailability();
  const anthropicConfigured = isAnthropicConfigured();
  const geminiConfigured = isGeminiConfigured();
  const geminiReachable = geminiConfigured ? await probeGemini() : false;

  return c.json(
    {
      status: 'ok',
      service: 'slidesmith-llm',
      uptime: Math.floor((Date.now() - startedAt) / 1000),
      claude: {
        available: claude.available,
        cliPath: claude.cliPath,
        pool: claude.pool,
        lastSuccessAt: claude.lastSuccessAt,
        breaker: claude.breaker,
      },
      anthropic: {
        available: anthropicConfigured,
        breaker: getBreakerState('anthropic-sdk'),
      },
      gemini: {
        available: geminiReachable,
        configured: geminiConfigured,
        breaker: getBreakerState('gemini-python'),
      },
    },
    200,
  );
});
