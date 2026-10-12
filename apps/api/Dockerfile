# syntax=docker/dockerfile:1
# NestJS API images. Build from the repository root:
#   docker build -f apps/api/Dockerfile -t avenir-api .                        the API
#   docker build -f apps/api/Dockerfile --target migrate -t avenir-migrate .   migrations
# `migrate` is the API image plus the Prisma CLI (one extra layer): it runs
# `prisma migrate deploy` before the API starts (deploy/docker-compose.prod.yml). The API image
# also runs the first-admin seed: `node dist/src/cli/seed-admin.js`.

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-alpine AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=1 \
    TURBO_TELEMETRY_DISABLED=1 \
    npm_config_fetch_timeout=300000
# pnpm comes from the "packageManager" field in package.json.
RUN npm install --global corepack@latest && corepack enable

# Only the API and the workspace packages it depends on (turbo prune), so changes elsewhere
# (the web app) don't invalidate this image's layers.
FROM base AS prune
WORKDIR /repo
# Keep in step with "turbo" in the root package.json.
RUN npm install --global turbo@2.11.7
COPY . .
RUN turbo prune @ai-academy/api --docker

FROM base AS build
WORKDIR /repo
COPY --from=prune /repo/out/json/ ./
# postinstall runs `prisma generate`, which needs the schema and config.
COPY --from=prune /repo/out/full/apps/api/prisma ./apps/api/prisma
COPY --from=prune /repo/out/full/apps/api/prisma.config.ts ./apps/api/prisma.config.ts
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile
COPY --from=prune /repo/out/full/ ./
RUN pnpm turbo run build --filter=@ai-academy/api
# A clean production-only node_modules in /prod, from the same lockfile. It reuses the store
# the install above filled, but may still download: when that install comes from the layer
# cache, the store mount can be empty (e.g. a fresh CI runner). No install scripts: the Prisma client is already compiled
# into dist/, and bcrypt ships prebuilt binaries.
# Then drop what the API never loads (the Prisma CLI peer, other databases' query compilers;
# see docker/prune-node-modules.mjs).
COPY --from=prune /repo/out/json/ /prod/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    cd /prod && pnpm install --prod --frozen-lockfile --prefer-offline --ignore-scripts && \
    node /repo/apps/api/docker/prune-node-modules.mjs /prod /prod/apps/api /prod/packages/shared

FROM node:${NODE_VERSION}-alpine AS api
ENV NODE_ENV=production \
    PORT=4000
# The workspace layout is kept: pnpm links api → shared through node_modules.
WORKDIR /app
COPY --from=build --chown=node:node /prod/node_modules ./node_modules
COPY --from=build --chown=node:node /prod/packages/shared ./packages/shared
COPY --from=build --chown=node:node /repo/packages/shared/dist ./packages/shared/dist
WORKDIR /app/apps/api
COPY --from=build --chown=node:node /prod/apps/api ./
COPY --from=build --chown=node:node /repo/apps/api/dist ./dist
COPY --from=build --chown=node:node /repo/apps/api/prisma ./prisma
COPY --from=build --chown=node:node /repo/apps/api/prisma.config.ts ./
# Only used with STORAGE_DRIVER=local; production keeps materials in R2.
RUN mkdir -p /data/uploads && chown node:node /data/uploads
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/api/v1/health >/dev/null || exit 1
CMD ["node", "dist/src/main.js"]

# The API image plus the Prisma CLI (same version as the lockfile) for migrations.
FROM api AS migrate
USER root
RUN --mount=type=cache,target=/root/.npm \
    PRISMA_VERSION="$(node -p "require('./node_modules/@prisma/client/package.json').version")" && \
    mkdir -p /opt/prisma && cd /opt/prisma && \
    npm install --omit=dev --no-audit --no-fund --no-save "prisma@$PRISMA_VERSION" && \
    ln -s /opt/prisma/node_modules/prisma /app/apps/api/node_modules/prisma && \
    ln -s /opt/prisma/node_modules/.bin/prisma /usr/local/bin/prisma
USER node
HEALTHCHECK NONE
CMD ["prisma", "migrate", "deploy"]

# Last, so a plain `docker build` (no --target) produces the API image.
FROM api AS runner
