// lib/schemas/common.ts — 공통 Zod 1차 시민 (BFF route + HTTP repo upstream 검증 공유)
// Cycle 2 Fix (F2): SERVICE-web.md §8 "모든 외부 응답을 Zod 검증" 본질 박제.
// 모든 BFF route 입력 + 모든 upstream 응답이 이 schema 거치도록.
import { z } from 'zod';

export const AspectRatioSchema = z.enum(['1:1', '4:5', '9:16']);
export const PlatformSchema = z.enum(['instagram', 'threads', 'twitter']);
export const ServiceStatusSchema = z.enum(['ok', 'degraded', 'down', 'unknown']);

// idempotencyKey: `${sessionId}:${ms}` 같은 형식. 길이 제약으로 DoS 방지.
export const IdempotencyKeySchema = z.string().min(8).max(128);

// UUID v4 또는 짧은 식별자 모두 수용 (브랜드 타입은 string).
export const SessionIdSchema = z.string().min(1).max(128);

// ContentSlide — 사용자 입력 + render 입력 양쪽에서 사용. body 길이로 50KB 폭주 방지.
export const ContentSlideSchema = z.object({
  index: z.number().int().min(0).max(20),
  title: z.string().min(1).max(500),
  body: z.string().min(0).max(5000),
  imageHint: z.string().max(1000).optional(),
});

// Brand DSL — CSS color hex/rgb/var(...) 1차 형식 검증 (보수적 패턴).
const ColorPattern = /^(#[0-9a-fA-F]{3,8}|rgb\([^)]+\)|rgba\([^)]+\)|var\(--[\w-]+\))$/;
export const BrandDslSchema = z.object({
  primary: z.string().regex(ColorPattern, 'invalid color'),
  accent: z.string().regex(ColorPattern, 'invalid color'),
  surface: z.string().regex(ColorPattern, 'invalid color'),
  fontStack: z.string().min(1).max(500),
});
