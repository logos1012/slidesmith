# Slidesmith v1.1.2 — Templates seed 정식 박제

**Release date**: 2026-05-10
**Tag**: `v1.1.2`
**Previous**: `v1.1.0` (2026-05-10, Aurora Redesign)

---

## Summary

v1.1.0까지 Aurora 3 templates (Aurora Light / Vibrant / Editorial)는 Airtable **수동 입력**으로만 존재했다 — PRD §5-2 v1.0 누락의 정직 회고. v1.1.2는 동일 3 records를 **코드로 박제**한다. fresh workspace, 새 Airtable base, CI 모두에서 같은 템플릿 셋이 자동 박제되도록 reproducibility 영구 박제.

**영향 범위: `services/storage` only — web / llm / render 코드 무수정.**

---

## Highlights

### 1. knowledge-seed 패턴 1:1 mirror

Templates seed는 knowledge-seed (`POST /knowledge/seed`, 51-item Zod bundle, `seedKnowledge()`)와 **행동 차이 0**으로 mirror된다.

| Knowledge | Templates |
|---|---|
| `seed/knowledge-51.json` | `seed/templates-default.json` |
| `loadKnowledge51()` | `loadTemplatesDefault()` |
| `seedKnowledge(repo)` | `seedTemplates(repo)` |
| `IKnowledgeRepo.findByNameCategory(name, cat)` | `ITemplateRepo.findByName(name)` |
| `POST /knowledge/seed` + Idempotency-Key | `POST /templates/seed` + Idempotency-Key |
| `acquireOrCreate('knowledge-seed', ...)` | `acquireOrCreate('templates-seed', ...)` |
| `sanitiseUpstream` 실패 보고 | `sanitiseUpstream` 실패 보고 |
| Korean userMessage 누락 시 400 | Korean userMessage 누락 시 400 |

같은 컨테이너 인프라 (LRU acquireOrCreate, in-flight 등록), 같은 보안 박제 (vendor 격리), 같은 wire shape (`{inserted, skipped, failed, total, failures[], durationMs}`).

### 2. Aurora 3 templates — reproducibility 영구 박제

`services/storage/src/seed/templates-default.json` 단일 파일에 3 records 박제:

| 이름 | 색상 | 서술 호 |
|---|---|---|
| **Aurora Light** | cream + violet | BeforeAfter |
| **Aurora Vibrant** | violet→pink + white | ProblemSolution |
| **Aurora Editorial** | white + serif | List |

fresh workspace에서 `POST /templates/seed -H 'Idempotency-Key: <any>'` 한 번으로 3 records 자동 박제. 수동 Airtable 입력 0.

### 3. POST /templates/seed — Idempotency-Key required

```bash
# 1) Idempotency-Key 누락 → 400
curl -X POST http://localhost:3003/templates/seed
# {"error":"missing_idempotency_key","userMessage":"템플릿 가져오기는 Idempotency-Key 헤더가 필요합니다. 마법사를 다시 시작해주세요."}

# 2) 1차 호출 → 201 (이미 박제된 경우 inserted:0 skipped:3)
curl -X POST http://localhost:3003/templates/seed -H 'Idempotency-Key: v1.1.2-final'
# {"inserted":0,"skipped":3,"failed":0,"total":3,"failures":[],"durationMs":2810}

# 3) 같은 키 재호출 → 200 + alreadyExists:true (LRU hit)
# 4) 다른 키 재호출 → 201 + inserted:0 skipped:3 (findByName 멱등)
```

멱등 보장 2중: LRU `acquireOrCreate` (동일 프로세스 내 경쟁) + `findByName` (name unique key 기반 DB 레벨 2차 방어).

### 4. CI regression check — templates step 박제 (3단계)

`.github/workflows/storage-ci.yml` `docker-e2e-vendor-leak-gate` job:

- **Step 1**: 헤더 누락 → 400 강제 박제 (계약 드리프트 차단)
- **Step 2**: 1차 호출 `total=3` 박제 (Aurora bundle 드리프트 감지)
- **Step 3**: 2차 호출 `inserted=0` 박제 (멱등성 회귀 감지)

knowledge seed CI step과 **symmetric** (Y2 해소 포함).

---

## Verification

| 영역 | v1.1.0 | v1.1.2 | Δ |
|---|---|---|---|
| 4 마이크로서비스 healthy | ✅ | ✅ | 0 |
| `/api/health` version | 1.1.0 | **1.1.2** | swap |
| storage unit tests | 205 | **218** | +13 |
| web / llm / render tests | 90 / 199 / 100 | 90 / 199 / 100 | 0 |
| **총 unit tests** | **594** | **607** | **+13** |
| POST /templates/seed | 없음 | **박제** | 신규 |
| CI Templates seed check | 없음 | **3단계** | 신규 |
| Aurora Light/Vibrant/Editorial records | Airtable 수동 | **코드 박제** | 영구화 |
| vendor 격리 14-pattern | 클린 | 클린 | 0 |

### 회귀 0 박제

- web/llm/render 코드 0줄 수정 — Aurora 박제 회귀 0
- knowledge-seed 패턴 15/15 mirror ✓
- vendor 격리 14-pattern 클린 ✓ (airtable/aws/amazonaws/s3/anthropic 등 응답 본문 0건)
- 5x concurrent same-key → 1 instance ✓
- dist/seed/templates-default.json 빌드 아티팩트 박제 ✓
- Saga 5-step (success/partial/orphan) 회귀 0

---

## Breaking Changes

**없음**. storage 내부 seed 추가 — API contract / 서비스 통신 / 사용자 carousel 결과물 모두 변화 0.

---

## Migration Guide

`v1.1.0` → `v1.1.2` 업그레이드:

```bash
git pull origin main
git checkout v1.1.2
docker compose down
docker compose up -d --build slidesmith-storage   # storage만 재빌드
# Wait for healthy (~15s)
curl http://localhost:3500/api/health              # version 1.1.2 박제

# Templates 자동 박제 (fresh base 또는 기존 base 모두)
curl -X POST http://localhost:3003/templates/seed \
  -H 'Idempotency-Key: v1.1.2-migration'
# {"inserted":3,"skipped":0,...} — fresh base
# {"inserted":0,"skipped":3,...} — 기존 base (이미 존재)
```

---

## Known Limits (v1.2 carry)

- **findByName name unique 전제** — v1.0은 Aurora 3개, name unique 보장. v1.2 multi-tenant 시 `findByNameTenant(name, tenantId)` 진화 필요 (Review Y2 권고).
- **CI Aurora 3 hardcode** — `.github/workflows/storage-ci.yml` `total=3` grep. 4번째 Aurora variant 추가 시 N으로 갱신 필요.
- **Pretendard self-host + `font-display: optional`** (v1.1.0 carry)
- **LLM slideCount 강제 prompt** (v1.1.0 carry)
- **aurora-2.jsx Brand DSL right panel** (v1.1.0 carry)
- **Integration 01-6 web /api/knowledge BFF schema mismatch** — pre-existing v1.0.0 이슈

---

## References

- **Build doc**: `docs/v1.1.2/build.md`
- **Review doc**: `docs/v1.1.2/review.md` (Y1 package.json version, Y2 CI symmetry)
- **knowledge-seed 패턴**: `services/storage/src/seed/seed-service.ts`
- **templates-seed 패턴**: `services/storage/src/seed/seed-templates-service.ts`
- **CI**: `.github/workflows/storage-ci.yml` — "Templates seed import regression check"

---

Templates seed 정식 박제 by Jake (logos1012)
