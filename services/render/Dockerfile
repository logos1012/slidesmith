# slidesmith-render — SPEC §2
# Strategy: debian-slim + system Chromium + Pretendard variable font.
# Multi-stage: deps → dev (HMR) | prod-build → prod (slim runtime)
#
# Cycle 1 Fix R-render-1: bumped node:20.18 → node:22 (corepack 0.32+) AND
# package.json now pins `packageManager: pnpm@11.0.9` so corepack uses the
# explicit version's bundled signing key instead of fetching "latest stable".

FROM node:26-bullseye-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
      wget gnupg ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-lock.yaml* .npmrc ./
# corepack reads packageManager from package.json → no online "latest" fetch.
# `--ignore-scripts` is the portable way to skip pnpm 11's strict
# `[ERR_PNPM_IGNORED_BUILDS]` gate inside CI/Docker. sharp ships prebuilt
# native bindings via optional dependencies (@img/sharp-linux-arm64 etc.),
# so we DON'T need any postinstall script to get a working sharp at runtime.
# esbuild's postinstall is also a no-op when the prebuilt binary is present.
RUN corepack enable && pnpm install --frozen-lockfile --ignore-scripts

# ─── DEV stage (docker compose target: dev) ──────────────────────────────
# Cycle 2 Fix T10-N1 — dev stage now drops privileges to `app` (uid 1001).
# Combined with R1 (no SOP bypass + no JS in slide page), the renderer is no
# longer a root-privileged code-exec surface inside its container.
FROM node:26-bullseye-slim AS dev
WORKDIR /app
# Puppeteer Chromium runtime deps + Korean fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium \
      ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 \
      libcairo2 libcups2 libdbus-1-3 libdrm2 libexpat1 libfontconfig1 libgbm1 \
      libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 \
      libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 \
      libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 \
      libxss1 libxtst6 lsb-release wget xdg-utils tini fontconfig fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /usr/share/fonts/truetype/pretendard /usr/share/fonts/truetype/noto-serif-kr \
    && wget -q https://github.com/orioncactus/pretendard/raw/main/packages/pretendard/dist/web/variable/woff2/PretendardVariable.woff2 \
         -O /usr/share/fonts/truetype/pretendard/PretendardVariable.woff2 \
    # Cycle 3 — Noto Serif KR Bold (DESIGN-v3 §2-1 Editorial heading).
    # fonts-noto-cjk above ships the broader CJK family; this explicit
    # Bold OTF guarantees the Editorial heading weight (700) is available
    # on the slide page even after Chromium picks the narrowest match.
    && wget -q https://github.com/notofonts/noto-cjk/raw/main/Serif/OTF/Korean/NotoSerifCJKkr-Bold.otf \
         -O /usr/share/fonts/truetype/noto-serif-kr/NotoSerifKR-Bold.otf \
    && fc-cache -f -v \
    && addgroup --gid 1001 nodejs \
    && adduser --uid 1001 --ingroup nodejs --system app \
    && mkdir -p /app/.cache /tmp/render-out \
    && chown -R app:nodejs /app /tmp/render-out
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=development \
    CI=true
RUN corepack enable
COPY --from=deps --chown=app:nodejs /app/node_modules ./node_modules
COPY --chown=app:nodejs . .
USER app
EXPOSE 3002
ENTRYPOINT ["/usr/bin/tini", "--"]
# Run tsx directly (avoids pnpm's deps-status re-check on `pnpm dev`, which
# under non-TTY + non-root flips to "purge node_modules" mode and crashes the
# container — see Cycle 2 Fix T10-N1). The shell shim under .bin is bash;
# resolve the JS entry directly so node executes it cleanly.
CMD ["node", "node_modules/tsx/dist/cli.mjs", "watch", "src/server.ts"]

# ─── PROD-BUILD stage ────────────────────────────────────────────────────
FROM node:26-bullseye-slim AS prod-build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ─── PROD stage ──────────────────────────────────────────────────────────
FROM node:26-bullseye-slim AS prod
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 \
      libatk1.0-0 libcairo2 libcups2 libdbus-1-3 libdrm2 libexpat1 libfontconfig1 \
      libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 \
      libpangocairo-1.0-0 libstdc++6 libx11-6 libxcomposite1 libxdamage1 libxext6 \
      libxfixes3 libxrandr2 libxrender1 libxss1 libxtst6 wget tini fontconfig \
      fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /usr/share/fonts/truetype/pretendard /usr/share/fonts/truetype/noto-serif-kr \
    && wget -q https://github.com/orioncactus/pretendard/raw/main/packages/pretendard/dist/web/variable/woff2/PretendardVariable.woff2 \
         -O /usr/share/fonts/truetype/pretendard/PretendardVariable.woff2 \
    # Cycle 3 — Noto Serif KR Bold (DESIGN-v3 §2-1 Editorial heading).
    # fonts-noto-cjk above ships the broader CJK family; this explicit
    # Bold OTF guarantees the Editorial heading weight (700) is available
    # on the slide page even after Chromium picks the narrowest match.
    && wget -q https://github.com/notofonts/noto-cjk/raw/main/Serif/OTF/Korean/NotoSerifCJKkr-Bold.otf \
         -O /usr/share/fonts/truetype/noto-serif-kr/NotoSerifKR-Bold.otf \
    && fc-cache -f -v \
    && addgroup --gid 1001 nodejs \
    && adduser --uid 1001 --ingroup nodejs --system app
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production
COPY --from=prod-build --chown=app:nodejs /app/dist ./dist
COPY --from=prod-build --chown=app:nodejs /app/node_modules ./node_modules
# Copy templates next to compiled JS so runtime resolution from dist/ is consistent.
# Loader path: dist/server.js → ../templates/<file>.html (resolved at /app/templates).
COPY --from=prod-build --chown=app:nodejs /app/src/templates ./templates
USER app
EXPOSE 3002
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=5 \
  CMD wget -qO- http://localhost:3002/health || exit 1
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/server.js"]
