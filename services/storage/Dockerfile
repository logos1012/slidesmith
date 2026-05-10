# services/storage/Dockerfile — Slidesmith Storage (Airtable + S3)
# multi-stage: deps / dev / prod-build / prod (SERVICE-storage.md §2)
# NODE_VERSION pinned to 22 (active LTS): node:20.18-alpine bundled corepack
# rejects pnpm@11 signing keys (Cycle 1 Test §2-2 Test-2 fix). Node 20 EOL 2026-04-30.
ARG NODE_VERSION=22

# ─── deps ────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
# pnpm 11 fails on ignored build scripts (e.g. esbuild postinstall) by default.
# We never run the binaries that need the native build (vitest is a host-side
# dev tool); --ignore-scripts is intentional and matches the prod runtime
# (tsc → node, no esbuild binary at runtime).
RUN corepack enable && pnpm install --frozen-lockfile --ignore-scripts

# ─── dev (HMR via tsx watch) ────────────────────────
FROM node:${NODE_VERSION}-alpine AS dev
WORKDIR /app
RUN apk add --no-cache wget tini && corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=development
EXPOSE 3003
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["pnpm", "dev"]

# ─── prod-build ─────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS prod-build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && pnpm build

# ─── prod ───────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS prod
WORKDIR /app
RUN apk add --no-cache wget tini && \
    addgroup -g 1001 nodejs && adduser -u 1001 -G nodejs -S app
COPY --from=prod-build --chown=app:nodejs /app/dist ./dist
COPY --from=prod-build --chown=app:nodejs /app/node_modules ./node_modules
COPY --from=prod-build --chown=app:nodejs /app/package.json ./
USER app
EXPOSE 3003
ENV NODE_ENV=production
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=5 \
  CMD wget -qO- http://localhost:3003/health || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.js"]
