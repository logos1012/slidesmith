// src/services/caption.service.ts — Caption 70% Passthrough 5 rules entry.
// SPEC: SERVICE-llm.md §5-4, §9.
// Cycle 3 A2: brandDsl + platform inputs propagated; all 5 rules applied
// (voice/tone preserve #1, hashtag distribute #2, hook+summary+CTA #3,
//  platform-specific transform #4, forbidden retry + signature injection #5).

import {
  applyCaptionRules,
  type SlideInput,
  type CaptionRulesOutput,
  type BrandDsl,
  type Platform,
} from '../lib/caption-rules.js';

export interface CaptionInput {
  slides: SlideInput[];
  hashtagSeed?: string[] | undefined;
  /** Cycle 2 explicit signature list (overrides brandDsl.signaturePhrases). */
  signaturePhrases?: string[] | undefined;
  /** Cycle 3 — brand voice/tone + forbidden + signature unified. */
  brandDsl?: BrandDsl | undefined;
  platform?: Platform | undefined;
}

export interface CaptionResult extends CaptionRulesOutput {
  platform: Platform;
  editable: true;
}

export function generateCaption(input: CaptionInput): CaptionResult {
  const platform: Platform = input.platform ?? 'instagram';
  const rules = applyCaptionRules(
    input.slides,
    input.hashtagSeed ?? [],
    input.signaturePhrases ?? [],
    input.brandDsl,
    platform,
  );
  return {
    ...rules,
    platform,
    editable: true,
  };
}
