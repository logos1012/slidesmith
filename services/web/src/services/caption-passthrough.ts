// services/caption-passthrough.ts — Cycle 3 A3 — Caption 70% Passthrough.
// SERVICE-web.md §1 caption.service.ts: brand voice 보존 5 rules.
//   1) 슬라이드 제목/본문 핵심 키워드 70% 이상 caption 안에 등장.
//   2) 사용자 톤 어미 (예: "~해요", "~합니다") 보존.
//   3) 첫 줄 ≤ 25자 (Instagram preview 절단 방지).
//   4) 5줄 이하 (스크롤 stress 방지).
//   5) 해시태그 3~7개 (instagram norm).
import type { ContentSlide } from '@/repositories/interfaces/ILlmGateway';

export interface CaptionGuardInput {
  caption: string;
  hashtags: string[];
  slides: ContentSlide[];
}

export interface CaptionGuardResult {
  ok: boolean;
  caption: string;
  hashtags: string[];
  warnings: string[];
}

export function applyCaptionRules(input: CaptionGuardInput): CaptionGuardResult {
  const warnings: string[] = [];
  let caption = input.caption.trim();
  const tokens = collectKeywordsFromSlides(input.slides);
  // Rule 1 — keyword passthrough ratio ≥ 0.7
  const passthroughRatio = computePassthroughRatio(caption, tokens);
  if (passthroughRatio < 0.7) warnings.push(`passthrough ${(passthroughRatio * 100).toFixed(0)}% < 70%`);
  // Rule 3 — 첫 줄 25자 이하
  const lines = caption.split('\n');
  const firstLine = (lines[0] ?? '');
  if (firstLine.length > 25) {
    warnings.push(`first line ${firstLine.length} > 25 — trimmed`);
    lines[0] = firstLine.slice(0, 25);
    caption = lines.join('\n');
  }
  // Rule 4 — 5줄 이하 (빈 줄 포함)
  const allLines = caption.split('\n');
  if (allLines.length > 5) {
    warnings.push(`${allLines.length} lines > 5 — clipped`);
    caption = allLines.slice(0, 5).join('\n');
  }
  // Rule 5 — 해시태그 3~7개
  let hashtags = (input.hashtags ?? []).filter((h) => /^#?\S+$/.test(h)).map((h) => h.startsWith('#') ? h : '#' + h);
  if (hashtags.length < 3) warnings.push(`hashtags ${hashtags.length} < 3`);
  if (hashtags.length > 7) { warnings.push(`hashtags ${hashtags.length} > 7 — clipped`); hashtags = hashtags.slice(0, 7); }
  return { ok: warnings.length === 0, caption, hashtags, warnings };
}

function collectKeywordsFromSlides(slides: ContentSlide[]): string[] {
  const text = slides.map((s) => `${s.title} ${s.body}`).join(' ');
  // 한국어 + 영문 단어 (>= 2자) 추출. 단순 토큰화.
  const matches = text.match(/[가-힣A-Za-z0-9]{2,}/g) ?? [];
  return Array.from(new Set(matches));
}

function computePassthroughRatio(caption: string, tokens: string[]): number {
  if (tokens.length === 0) return 1;
  let hits = 0;
  for (const t of tokens) if (caption.includes(t)) hits++;
  return hits / tokens.length;
}
