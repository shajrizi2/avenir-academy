# syntax=docker/dockerfile:1
# Next.js web image (standalone server). Build from the repository root:
#   docker build -f apps/web/Dockerfile -t avenir-web \
#     --build-arg SITE_URL=https://avenir.academy \
#     --build-arg NEXT_PUBLIC_API_URL=https://api.avenir.academy/api/v1 .
#
# Build time vs run time:
#   - NEXT_PUBLIC_* are inlined into the browser bundle, so they are build args.
#   - SITE_URL is baked into prerendered metadata (canonical links, Open Graph), and
#     API_INTERNAL_URL into the /api/v1 rewrite, so both are build args too.
#   - API_INTERNAL_URL is also read at run time by server components (serverGet).

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-alpine AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=1 \
    NEXT_TELEMETRY_DISABLED=1 \
    TURBO_TELEMETRY_DISABLED=1 \
    npm_config_fetch_timeout=300000
RUN npm install --global corepack@latest && corepack enable

FROM base AS prune
WORKDIR /repo
# Keep in step with "turbo" in the root package.json.
RUN npm install --global turbo@2.11.7
COPY . .
RUN turbo prune @ai-academy/web --docker

FROM base AS build
WORKDIR /repo
COPY --from=prune /repo/out/json/ ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile
COPY --from=prune /repo/out/full/ ./
ARG SITE_URL=https://avenir.academy
ARG API_INTERNAL_URL=http://api:4000/api/v1
ARG NEXT_PUBLIC_API_URL=
ARG NEXT_PUBLIC_GA_ID=
ENV SITE_URL=$SITE_URL \
    API_INTERNAL_URL=$API_INTERNAL_URL \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID \
    BUILD_STANDALONE=1
RUN pnpm turbo run build --filter=@ai-academy/web

FROM node:${NODE_VERSION}-alpine AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/robots.txt >/dev/null || exit 1
CMD ["node", "apps/web/server.js"]
