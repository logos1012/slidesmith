// src/services/moderation.service.ts — sensitive-topics regex check.
// SPEC: SERVICE-llm.md §5-5, §10. 4 컨테이너 흐름의 llm 단계.

export interface ModerationInput {
  text: string;
  sensitiveTopics?: SensitiveTopic[] | undefined;
}
export interface SensitiveTopic {
  category: string;
  keywords: string[];
}
export interface ModerationResult {
  blocked: boolean;
  warnings: string[];
  matchedKeywords: string[];
  reason?: string;
  userMessage?: { what: string; why: string; next: string; recovery: string };
}

const DEFAULT_TOPICS: SensitiveTopic[] = [
  { category: 'political', keywords: ['선거', '정당', '국회의원', '대통령'] },
  { category: 'medical', keywords: ['진단', '처방', '치료법'] },
  { category: 'financial', keywords: ['주식 추천', '투자 보장', '원금 보장'] },
  { category: 'adult', keywords: ['음란', '성인용', '도박'] },
];

const cache = new Map<string, RegExp>();
function compile(keywords: string[]): RegExp {
  const key = keywords.join('|');
  let re = cache.get(key);
  if (!re) {
    const escaped = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    re = new RegExp(escaped.join('|'), 'i');
    cache.set(key, re);
  }
  return re;
}

export function checkModeration(input: ModerationInput): ModerationResult {
  const topics = input.sensitiveTopics ?? DEFAULT_TOPICS;
  const text = input.text ?? '';
  for (const topic of topics) {
    const re = compile(topic.keywords);
    const match = text.match(re);
    if (match) {
      return {
        blocked: true,
        warnings: [],
        matchedKeywords: [match[0]],
        reason: topic.category,
        userMessage: {
          what: `${topic.category} 영역의 민감한 표현이 감지되었어요.`,
          why: `해당 카테고리는 플랫폼 정책상 자동 검수가 필요합니다.`,
          next: '주제를 다른 각도로 풀어보거나, 키워드를 완화해 다시 시도해 주세요.',
          recovery: '입력은 안전하게 보관되며, 제거 후 다시 작성하면 즉시 진행됩니다.',
        },
      };
    }
  }
  return { blocked: false, warnings: [], matchedKeywords: [] };
}

export function _resetModerationCache(): void {
  cache.clear();
}
