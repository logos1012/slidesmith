# slidesmith-llm — multi-stage (node + python)
# SPEC: docs/services/SERVICE-llm.md §2

FROM node:22-alpine AS deps
WORKDIR /app
# packageManager field in package.json pins pnpm@11.0.9 → corepack avoids
# fetching latest metadata (which fails on older alpine corepack signatures).
# .npmrc + pnpm-workspace.yaml carry the esbuild build-script approval that
# pnpm 11 demands; without them the install fails with ERR_PNPM_IGNORED_BUILDS.
COPY package.json pnpm-lock.yaml* .npmrc pnpm-workspace.yaml ./
RUN corepack enable && corepack prepare pnpm@11.0.9 --activate && \
    pnpm install --frozen-lockfile

FROM node:22-alpine AS dev
WORKDIR /app
RUN apk add --no-cache python3 py3-pip wget tini curl && \
    python3 -m venv /opt/venv && \
    /opt/venv/bin/pip install --upgrade pip uv && \
    corepack enable && corepack prepare pnpm@11.0.9 --activate
ENV PATH="/opt/venv/bin:$PATH"
COPY pyproject.toml ./
RUN uv pip install --system --break-system-packages google-genai pillow python-dotenv
# Install Claude CLI globally so the subprocess pool can find it.
# SPEC: SERVICE-llm.md §6 — Claude CLI is the primary streaming path.
RUN npm i -g @anthropic-ai/claude-code@2.1.138
ENV CLAUDE_CLI_PATH=/usr/local/bin/claude
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=development PORT=3001
EXPOSE 3001
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["pnpm", "dev"]

FROM node:22-alpine AS prod-build
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && corepack prepare pnpm@11.0.9 --activate && pnpm build

FROM node:22-alpine AS prod
WORKDIR /app
RUN apk add --no-cache python3 py3-pip wget tini && \
    python3 -m venv /opt/venv && /opt/venv/bin/pip install --upgrade pip uv && \
    addgroup -g 1001 nodejs && adduser -u 1001 -G nodejs -S app
ENV PATH="/opt/venv/bin:$PATH"
COPY pyproject.toml ./
RUN uv pip install --system --break-system-packages google-genai pillow python-dotenv
# Install Claude CLI globally (root) before dropping privileges.
RUN npm i -g @anthropic-ai/claude-code@2.1.138 && npm cache clean --force
ENV CLAUDE_CLI_PATH=/usr/local/bin/claude
COPY --from=prod-build --chown=app:nodejs /app/dist ./dist
COPY --from=prod-build --chown=app:nodejs /app/node_modules ./node_modules
COPY --from=prod-build --chown=app:nodejs /app/src/scripts ./src/scripts
USER app
ENV NODE_ENV=production PORT=3001
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD wget -qO- http://localhost:3001/health || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
