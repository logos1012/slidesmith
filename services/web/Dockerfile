# services/web/Dockerfile — Slidesmith Web (UI + BFF + Saga)
# multi-stage: deps / dev / prod-build / prod (SERVICE-web.md §2)
# Cycle 1 Fix (F1): Node 22-alpine — Node 20.18의 corepack ECDSA 키 회전 버그 회피.
# Phase 6 Fix (F4): packageManager pnpm@9.12.0 → pnpm@11.0.9 (4 서비스 정합화 회복).
# package.json `packageManager: pnpm@11.0.9`을 corepack이 직접 fetch.
ARG NODE_VERSION=22

# ─── deps ────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
# Cycle 3 (A1): better-sqlite3 native 빌드용 toolchain 포함.
#   alpine은 prebuilt binary가 없어 npm install 시 node-gyp으로 컴파일 필요.
#   build-essentials 대안 — alpine에서는 build-base + python3 + linux-headers.
#   Saga state persistence가 컨테이너 재시작 후 유지되어야 함 (메모리 fallback X).
RUN apk add --no-cache libc6-compat python3 make g++ linux-headers
# Phase 6 Fix (F4): pnpm 11은 build script 화이트리스트를 pnpm-workspace.yaml `allowBuilds:`
#   + .npmrc `verify-deps-before-run=false`로 박제 — 두 파일 모두 deps 단계에서 필요.
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml .npmrc ./
# corepack의 새 키스토어를 강제 사용 (Node 22+ 번들 corepack OK).
RUN corepack enable && corepack prepare pnpm@11.0.9 --activate && \
    pnpm install --frozen-lockfile

# ─── dev (HMR) ──────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS dev
WORKDIR /app
# Cycle 2 Fix (F7, N-1): dev stage도 비-root 사용자(nextjs) 실행으로 박제.
#   prod stage (USER nextjs)와 동일 권한 모델을 dev에서도 유지.
#   /app 소유권을 nextjs:nodejs로 부여해 hot reload + bind mount가 작동.
RUN apk add --no-cache wget tini && \
    addgroup -g 1001 nodejs && adduser -u 1001 -G nodejs -S nextjs
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --chown=nextjs:nodejs . .
# /app/data, /app/public/uploads volume mount용 디렉토리 (권한 박제).
RUN mkdir -p /app/data /app/public/uploads && \
    chown -R nextjs:nodejs /app
# Cycle 1 Fix (F1) + Phase 6 Fix (F4): corepack로 pnpm 11.0.9 활성화.
RUN corepack enable && corepack prepare pnpm@11.0.9 --activate
USER nextjs
ENV NODE_ENV=development
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["pnpm", "dev"]

# ─── prod-build ─────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS prod-build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# corepack은 deps stage에서 이미 활성화 + pnpm 11.0.9 prepare 완료.
# prod-build에서는 별도 corepack prepare 불필요 (node_modules 재사용).
RUN corepack enable && pnpm build

# ─── prod ───────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS prod
WORKDIR /app
RUN apk add --no-cache wget tini && \
    addgroup -g 1001 nodejs && adduser -u 1001 -G nodejs -S nextjs
COPY --from=prod-build --chown=nextjs:nodejs /app/.next ./.next
COPY --from=prod-build --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=prod-build --chown=nextjs:nodejs /app/package.json ./
COPY --from=prod-build --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
ENV NODE_ENV=production
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=5 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node_modules/.bin/next", "start"]
