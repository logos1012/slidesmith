// src/services/gemini.service.ts — Python script wrapper for Gemini image gen.
// SPEC: SERVICE-llm.md §5-6, §7. 60s timeout (extended for image), bulkhead 4.
// Cycle 3 B2:
//   - Validate aspect ratio against the canonical 4 (1:1, 4:5, 16:9, 9:16).
//   - Verify the produced PNG header before reporting ok=true (catch
//     placeholder-passthrough where script wrote a stub but exited 2).
//   - Always cleanup the temp file on every path.
//   - Distinguish exit codes 2 (recoverable) vs 3 (config) so the route layer
//     can pick 502 vs 503 via classifyError funnel.

import { execa } from 'execa';
import { mkdtemp, readFile, unlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { withBreaker, withBulkhead } from '../lib/failure-boundary.js';
import { loadEnv } from '../lib/env.js';
import { logger } from '../lib/logger.js';

export type AspectRatio = '1:1' | '4:5' | '16:9' | '9:16';
export const ALLOWED_RATIOS: ReadonlyArray<AspectRatio> = ['1:1', '4:5', '16:9', '9:16'];

export interface ImageInput {
  prompt: string;
  ratio?: AspectRatio | undefined;
  count?: number | undefined;
}
export interface ImageResult {
  ok: boolean;
  variants: Array<{ base64?: string; path?: string; aspectRatio: AspectRatio }>;
  via: 'gemini' | 'mock';
  message?: string;
}

const SCRIPT = 'src/scripts/generate_image.py';
const TIMEOUT_MS = 60_000;

// PNG magic header — RFC 2083: \x89PNG\r\n\x1a\n
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function isGeminiConfigured(): boolean {
  return Boolean(loadEnv().GEMINI_API_KEY);
}

function isPng(buf: Buffer): boolean {
  if (buf.length < PNG_MAGIC.length) return false;
  return buf.subarray(0, PNG_MAGIC.length).equals(PNG_MAGIC);
}

// Cycle 3 Fix F5 (P3-6): uv emits venv-init / package-install progress on
// stderr when the cache is cold. Drop those lines so user-facing messages
// only carry actual error content from the Python script.
const UV_NOISE_PREFIXES = [
  'using cpython',
  'using python',
  'creating virtual environment',
  'creating virtualenv',
  'downloading',
  'downloaded',
  'installed ',
  'installing',
  'resolved ',
  'resolving',
  'audited',
  'auditing',
  'building',
  'built ',
  'prepared',
  'preparing',
  'updated lockfile',
  'lockfile updated',
];

function stripUvVenvNoise(stderr: string): string {
  if (!stderr) return stderr;
  return stderr
    .split('\n')
    .filter((line) => {
      const l = line.trim().toLowerCase();
      if (!l) return false;
      return !UV_NOISE_PREFIXES.some((p) => l.startsWith(p));
    })
    .join('\n')
    .trim();
}

async function runScript(input: ImageInput, outDir: string): Promise<ImageResult> {
  const ratio: AspectRatio = input.ratio ?? '1:1';
  if (!ALLOWED_RATIOS.includes(ratio)) {
    return {
      ok: false,
      variants: [],
      via: 'mock',
      message: `invalid_aspect_ratio: ${ratio}`,
    };
  }
  const outPath = join(outDir, `out-${Date.now()}.png`);
  const args = [
    'run',
    SCRIPT,
    '--prompt',
    input.prompt,
    '--out',
    outPath,
    '--aspect-ratio',
    ratio,
    '--count',
    String(input.count ?? 1),
  ];
  const result = await execa('uv', args, { timeout: TIMEOUT_MS, reject: false });
  // Cycle 3 B2: distinguish exit 2 (recoverable) vs 3 (config error).
  if (result.exitCode !== 0) {
    logger.warn(
      { stderr: result.stderr, exitCode: result.exitCode },
      'gemini_script_nonzero_exit',
    );
    // Try to remove the placeholder if any.
    await unlink(outPath).catch(() => undefined);
    // Cycle 3 Fix F5 (P3-6): strip uv venv-init noise from stderr so the
    // userMessage doesn't echo install-progress lines on the first call after
    // a fresh container start. After filtering, fall back to a generic marker
    // if nothing meaningful is left — the route layer turns it into the
    // Korean 4-원칙 message.
    const filteredStderr = stripUvVenvNoise(result.stderr ?? '');
    const message =
      result.exitCode === 3
        ? 'gemini_config_error: GEMINI_API_KEY missing or invalid aspect ratio'
        : (filteredStderr || 'gemini_script_failed');
    return { ok: false, variants: [], via: 'mock', message };
  }
  // Validate the output: must exist, must be a PNG (not a placeholder stub).
  try {
    const buf = await readFile(outPath);
    await unlink(outPath).catch(() => undefined);
    if (!isPng(buf)) {
      return {
        ok: false,
        variants: [],
        via: 'mock',
        message: 'image_corrupt: not a valid PNG',
      };
    }
    // 1x1 placeholder is a valid PNG but only ~70 bytes; reject as suspicious.
    if (buf.length < 256) {
      return {
        ok: false,
        variants: [],
        via: 'mock',
        message: 'image_too_small: likely placeholder fallback',
      };
    }
    return {
      ok: true,
      variants: [{ base64: buf.toString('base64'), aspectRatio: ratio }],
      via: 'gemini',
    };
  } catch (err) {
    return { ok: false, variants: [], via: 'mock', message: `image_read_failed: ${String(err)}` };
  }
}

export async function generateImage(input: ImageInput): Promise<ImageResult> {
  if (!isGeminiConfigured()) {
    return { ok: false, variants: [], via: 'mock', message: 'GEMINI_API_KEY missing' };
  }
  const dir = await mkdtemp(join(tmpdir(), 'slidesmith-img-'));
  try {
    return await withBreaker('gemini-python', () =>
      withBulkhead('gemini-python', 4, () => runScript(input, dir)),
    );
  } finally {
    // Always best-effort cleanup the tmp dir.
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

/** Lightweight liveness check: confirm `uv` is available on PATH. */
export async function probeGemini(): Promise<boolean> {
  if (!isGeminiConfigured()) return false;
  try {
    const r = await execa('uv', ['--version'], { timeout: 2000, reject: false });
    return r.exitCode === 0;
  } catch {
    return false;
  }
}

export const _internal = { isPng, ALLOWED_RATIOS, stripUvVenvNoise };
