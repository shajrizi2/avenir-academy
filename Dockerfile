# syntax=docker/dockerfile:1
# One Dockerfile, three targets (see deploy/docker-compose.yml):
#   api      the NestJS API (production dependencies only)
#   web      the Next.js app (standalone server)
#   migrate  the build stage with every dependency, for `prisma migrate deploy` and admin scripts

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=1 \
    NEXT_TELEMETRY_DISABLED=1 \
    TURBO_TELEMETRY_DISABLED=1
# pnpm comes from the "packageManager" field in package.json.
RUN npm install --global corepack@latest && corepack enable

FROM base AS build
WORKDIR /repo
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile
# The web app bakes these into the build (rewrites, canonical URLs, analytics).
ARG SITE_URL
ARG API_INTERNAL_URL=http://api:4000/api/v1
ARG NEXT_PUBLIC_GA_ID=
ENV SITE_URL=$SITE_URL \
    API_INTERNAL_URL=$API_INTERNAL_URL \
    NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID \
    BUILD_STANDALONE=1
RUN pnpm build

# Binaries are called directly: at runtime pnpm would re-check (and try to reinstall) deps.
FROM build AS migrate
WORKDIR /repo/apps/api
CMD ["node_modules/.bin/prisma", "migrate", "deploy"]

# A self-contained copy of the API with production dependencies only.
FROM build AS api-bundle
RUN pnpm --filter @ai-academy/api deploy --prod --legacy /out/api

FROM node:22-alpine AS api
ENV NODE_ENV=production \
    PORT=4000 \
    UPLOAD_DIR=/data/uploads
WORKDIR /app
COPY --from=api-bundle --chown=node:node /out/api ./
RUN mkdir -p /data/uploads && chown node:node /data/uploads
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:4000/api/v1/health || exit 1
CMD ["node", "dist/src/main.js"]

FROM node:22-alpine AS web
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:3000/robots.txt >/dev/null || exit 1
CMD ["node", "apps/web/server.js"]
