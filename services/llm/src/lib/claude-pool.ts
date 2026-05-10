// src/lib/claude-pool.ts — Claude CLI subprocess pool (size 1) + drain on shutdown.
// SPEC: SERVICE-llm.md §6, §7 (Bulkhead + CB).

import { execa } from 'execa';
import pLimit from 'p-limit';
import { loadEnv } from './env.js';
import { logger } from './logger.js';

const POOL_SIZE = 1;
const limit = pLimit(POOL_SIZE);

let detectedCliPath: string | null | undefined;

/** Returns the resolved Claude CLI path, or null if not found. Cached. */
export async function detectClaudeCli(): Promise<string | null> {
  if (detectedCliPath !== undefined) return detectedCliPath;
  const env = loadEnv();
  if (env.CLAUDE_CLI_PATH) {
    detectedCliPath = env.CLAUDE_CLI_PATH;
    return detectedCliPath;
  }
  try {
    const { stdout } = await execa('which', ['claude']);
    detectedCliPath = stdout.trim() || null;
  } catch {
    detectedCliPath = null;
    logger.warn('Claude CLI not found on PATH; SDK fallback will be required.');
  }
  return detectedCliPath;
}

export async function getPoolStatus(): Promise<{ size: number; pending: number; active: number }> {
  return { size: POOL_SIZE, pending: limit.pendingCount, active: limit.activeCount };
}

/** Bulkhead slot for Claude CLI. Use withBreaker around this for full failure boundary. */
export function withClaudeBoundary<T>(fn: () => Promise<T>): Promise<T> {
  return limit(fn);
}

/** Wait for in-flight tasks to complete on shutdown. */
export async function drainClaudePool(): Promise<void> {
  // p-limit has no native drain; poll until both counts hit zero.
  const start = Date.now();
  while ((limit.pendingCount > 0 || limit.activeCount > 0) && Date.now() - start < 5000) {
    await new Promise((r) => setTimeout(r, 50));
  }
}

/** Test-only hook to reset detection cache. */
export function _resetClaudeDetectionForTests(): void {
  detectedCliPath = undefined;
}

export const _internal = { limit };
