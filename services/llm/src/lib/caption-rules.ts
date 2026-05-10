// src/lib/caption-rules.ts — Caption 70% Passthrough 5 rules (DESIGN §26).
// SPEC: SERVICE-llm.md §9. Pure functions only — fully unit testable.
//
// 5 rules — ALL pinned in Cycle 3 (A2):
//   #1 brandDSL voice/tone preserve   — buildCaption respects voice tag prefix.
//   #2 hashtag 30-distribution        — distributeHashtags 5/15/10.
//   #3 hook+summary+CTA shape         — buildCaption.
//   #4 platform-specific transform    — formatForPlatform (insta/linkedin/threads).
//   #5 forbidden retry + signature    — applyForbiddenAndSignature.

export interface SlideInput {
  title: string;
  body?: string | undefined;
  caption?: string | undefined;
}

export interface BrandDsl {
  /** Voice descriptor (e.g. '친근', '전문', '재치'). Used to bias hook prefix. */
  voice?: string | undefined;
  /** Tone descriptor (e.g. 'informal', 'formal'). Drives 존댓말 vs 반말. */
  tone?: 'formal' | 'informal' | undefined;
  /** Phrases that must NOT appear; #5 retry strips them. */
  forbiddenPhrases?: string[] | undefined;
  /** Phrases that SHOULD appear (at least one); #5 ensures presence. */
  signaturePhrases?: string[] | undefined;
}

export type Platform = 'instagram' | 'linkedin' | 'threads';

export interface CaptionRulesOutput {
  caption: string;
  hashtags: { highReach: string[]; medium: string[]; niche: string[] };
  passthroughEstimate: number;
  /** #4 — caption(s) shaped per platform (Insta=1, LinkedIn=1, Threads=array). */
  platformVariants: { instagram: string; linkedin: string; threads: string[] };
  /** #5 — diagnostic flags so callers can show "retry succeeded" etc. */
  forbiddenStripped: string[];
  signatureInjected: string | null;
}

const MAX_CAPTION_LEN = 2200;
const HOOK_PREFIX_EMOJIS = ['✨', '🔥', '💡', '👀', '🚀'];
const VOICE_EMOJI: Record<string, string> = {
  친근: '✨',
  전문: '💡',
  재치: '👀',
  대담: '🔥',
  영감: '🚀',
};

/** #1 — pick a hook prefix emoji that matches brand voice (deterministic). */
export function pickHookEmoji(voice: string | undefined): string {
  if (voice && VOICE_EMOJI[voice]) return VOICE_EMOJI[voice]!;
  // deterministic fallback: stable index based on voice hash
  if (voice) {
    let h = 0;
    for (let i = 0; i < voice.length; i++) h = (h * 31 + voice.charCodeAt(i)) >>> 0;
    return HOOK_PREFIX_EMOJIS[h % HOOK_PREFIX_EMOJIS.length] ?? '✨';
  }
  return '✨';
}

/** Build a caption from slides — hook + summary + CTA. ≤2200 chars. (#3) */
export function buildCaption(slides: SlideInput[], brand?: BrandDsl): string {
  if (slides.length === 0) return '';
  const hook = slides[0]?.title ?? '';
  const body = slides
    .slice(1, -1)
    .map((s, i) => `${i + 1}. ${s.title}${s.body ? ` — ${s.body}` : ''}`)
    .join('\n');
  const cta = slides[slides.length - 1]?.title ?? '저장 후 천천히 읽어보세요';
  // #1 — voice-aware hook emoji (deterministic, no Math.random non-purity).
  const emoji = pickHookEmoji(brand?.voice);
  // #1 — tone affects CTA register; informal allows ~요, formal uses ~십시오.
  const ctaText = brand?.tone === 'formal' ? `${cta}을(를) 확인해 주십시오` : `👉 ${cta}`;
  const text = [`${emoji} ${hook}`, '', body, '', ctaText].filter(Boolean).join('\n');
  return text.length > MAX_CAPTION_LEN ? text.slice(0, MAX_CAPTION_LEN - 1) + '…' : text;
}

/** #2 — Distribute 30 hashtags into 5 highReach + 15 medium + 10 niche. */
export function distributeHashtags(seed: string[]): CaptionRulesOutput['hashtags'] {
  const trimmed = seed
    .map((h) => h.replace(/^#+/, '').trim())
    .filter((h) => h.length > 0)
    .slice(0, 30);
  while (trimmed.length < 30) trimmed.push(`tag${trimmed.length + 1}`);
  return {
    highReach: trimmed.slice(0, 5).map((h) => `#${h}`),
    medium: trimmed.slice(5, 20).map((h) => `#${h}`),
    niche: trimmed.slice(20, 30).map((h) => `#${h}`),
  };
}

/** Self-evaluation heuristic for the 70% passthrough estimate. */
export function estimatePassthrough(caption: string, signaturePhrases: string[] = []): number {
  let score = 0.5;
  if (caption.length >= 100) score += 0.1;
  if (caption.includes('👉')) score += 0.1;
  if (HOOK_PREFIX_EMOJIS.some((e) => caption.startsWith(e))) score += 0.1;
  for (const sig of signaturePhrases) if (sig && caption.includes(sig)) score += 0.05;
  return Math.min(0.95, Math.round(score * 100) / 100);
}

/**
 * #4 — Platform-specific transform.
 *   - instagram: keep newlines, ensure hashtag block at the end.
 *   - linkedin:  normalize to single-line paragraphs separated by blank lines,
 *                drop emoji-heavy CTA arrows, prepend "→" markers per item.
 *   - threads:   split into ≤500-char chunks (Threads post limit).
 */
export function formatForPlatform(
  caption: string,
  hashtags: CaptionRulesOutput['hashtags'],
  platform: Platform,
): { instagram: string; linkedin: string; threads: string[] } {
  const allTags = [...hashtags.highReach, ...hashtags.medium, ...hashtags.niche].join(' ');

  // Instagram — newlines preserved, hashtags appended at bottom.
  const instagram = `${caption}\n\n${allTags}`.slice(0, MAX_CAPTION_LEN);

  // LinkedIn — drop hook emoji, replace 👉 with →, paragraph-style.
  const linkedin = caption
    .replace(/^[✨🔥💡👀🚀]\s*/u, '')
    .replace(/👉/g, '→')
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .join('\n\n')
    .concat(`\n\n${allTags}`)
    .slice(0, 3000); // LinkedIn limit is ~3000 chars

  // Threads — 500-char chunk split, hashtags as final chunk.
  const threadChunks: string[] = [];
  let remaining = caption;
  while (remaining.length > 0) {
    threadChunks.push(remaining.slice(0, 480));
    remaining = remaining.slice(480);
  }
  if (allTags.length > 0) threadChunks.push(allTags.slice(0, 480));

  void platform; // platform param kept for future per-platform branching.
  return { instagram, linkedin, threads: threadChunks };
}

/**
 * #5 — Forbidden retry + signature injection.
 * Strip any forbidden phrase from `caption`. If `signaturePhrases` are given
 * and none appear in the result, inject the first one near the end.
 * Returns the new caption + diagnostic info.
 */
export function applyForbiddenAndSignature(
  caption: string,
  forbiddenPhrases: string[] = [],
  signaturePhrases: string[] = [],
): { caption: string; forbiddenStripped: string[]; signatureInjected: string | null } {
  let out = caption;
  const stripped: string[] = [];
  for (const phrase of forbiddenPhrases) {
    if (!phrase) continue;
    const re = new RegExp(escapeRegex(phrase), 'gi');
    if (re.test(out)) {
      stripped.push(phrase);
      out = out.replace(re, '');
    }
  }
  // collapse double-spaces / triple-newlines left behind by stripping
  out = out.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

  let injected: string | null = null;
  // Cycle 3 Fix F2 (P2-1): pick the first NON-EMPTY signature so we never
  // inject a bare "\n\n— " (dash only) and never report `signatureInjected: ''`
  // (falsy) when the caller passed [' ', 'real']. The Zod min(1) at the route
  // boundary blocks empty strings already, but tighten the function contract
  // for direct callers (programmatic / future endpoints).
  if (signaturePhrases.length > 0) {
    const usable = signaturePhrases.filter((s): s is string => Boolean(s && s.trim()));
    if (usable.length > 0) {
      const present = usable.some((s) => out.includes(s));
      if (!present) {
        const sig = usable[0]!;
        out = `${out}\n\n— ${sig}`;
        injected = sig;
      }
    }
  }
  if (out.length > MAX_CAPTION_LEN) out = out.slice(0, MAX_CAPTION_LEN - 1) + '…';
  return { caption: out, forbiddenStripped: stripped, signatureInjected: injected };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Apply all 5 rules in one shot. */
export function applyCaptionRules(
  slides: SlideInput[],
  hashtagSeed: string[] = [],
  signaturePhrases: string[] = [],
  brand?: BrandDsl,
  platform: Platform = 'instagram',
): CaptionRulesOutput {
  // #1 + #3
  const initialCaption = buildCaption(slides, brand);
  // #2
  const hashtags = distributeHashtags(hashtagSeed);
  // #5 (also takes brand.signaturePhrases when caller didn't pass one explicitly)
  const sigSeed =
    signaturePhrases.length > 0
      ? signaturePhrases
      : (brand?.signaturePhrases ?? []);
  const { caption, forbiddenStripped, signatureInjected } = applyForbiddenAndSignature(
    initialCaption,
    brand?.forbiddenPhrases ?? [],
    sigSeed,
  );
  // #4
  const platformVariants = formatForPlatform(caption, hashtags, platform);
  const passthroughEstimate = estimatePassthrough(caption, sigSeed);
  return {
    caption,
    hashtags,
    passthroughEstimate,
    platformVariants,
    forbiddenStripped,
    signatureInjected,
  };
}
