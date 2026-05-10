// src/lib/prompts/content.ts — slide content generation prompt.
// SPEC: SERVICE-llm.md §5-3.
// Cycle 3 C2 — system prompt hardened:
//   - 한국어 응답 default + 존댓말 (사용자 별도 지정 시 영어 허용).
//   - 출력은 strict JSON 한 덩어리 (마크다운/주석/설명 금지).
//   - 클릭베이트·과장 표현 금지.
//   - 길이 제약 (title 30 / body 120 / caption 60) 명시.

export interface ContentPromptInput {
  topic: string;
  slideCount: number;
  tone?: string | undefined;
  language?: 'ko' | 'en' | undefined;
}

export function buildContentSystemPrompt(language: 'ko' | 'en' = 'ko'): string {
  if (language === 'en') {
    return [
      'You write Instagram carousel slides.',
      'Each slide has title (≤30 chars), body (≤120 chars), caption (≤60 chars).',
      'Friendly-expert tone. No clickbait, no hyperbole.',
      'Output a single JSON object only. No markdown, no comments, no explanation.',
      'Format: {"slides":[{"title":"...","body":"...","caption":"..."}, ...]}',
    ].join('\n');
  }
  return [
    '너는 한국어 인스타 캐러셀 슬라이드 작가다.',
    '각 슬라이드는 title (≤30자), body (≤120자), caption (≤60자)을 가진다.',
    '존댓말을 기본으로 사용한다. 친근한 전문가 톤. 과장된 클릭베이트 금지.',
    '응답은 JSON 한 덩어리만 출력한다. 마크다운/주석/설명 일체 금지.',
    '형식: {"slides":[{"title":"...","body":"...","caption":"..."}, ...]}',
    '독자가 끝까지 읽고 저장하도록 첫 슬라이드는 강한 훅, 마지막 슬라이드는 명확한 CTA.',
  ].join('\n');
}

export function buildContentUserPrompt(input: ContentPromptInput): string {
  const tone = input.tone ?? '친근한 전문가';
  const lang = input.language ?? 'ko';
  if (lang === 'en') {
    return [
      `Topic: ${input.topic}`,
      `Slide count: ${input.slideCount}`,
      `Tone: ${tone}`,
      'Structure: slide 1 = hook, slides 2..N-1 = body, slide N = CTA.',
    ].join('\n');
  }
  return [
    `주제: ${input.topic}`,
    `슬라이드 수: ${input.slideCount}`,
    `톤: ${tone}`,
    `언어: 한국어`,
    '구성: 1번 슬라이드는 훅, 2~N-1은 본문 단계, N번은 CTA.',
    '본문 단계는 PAS(Problem-Agitate-Solution) 또는 AIDA 중 주제에 적합한 흐름을 자율 선택하라.',
  ].join('\n');
}
