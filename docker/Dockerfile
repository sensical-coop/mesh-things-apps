# Frontend via Nitro Node server. From repo root:
#   docker build -f docker/Dockerfile --build-arg VITE_API_URL=http://127.0.0.1:8787 -t mtt-web .
#   docker run --rm -p 8080:80 mtt-web
FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
ENV NODE_OPTIONS=--max-old-space-size=2048
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web ./apps/web
COPY packages ./packages
RUN corepack prepare pnpm@10.6.1 --activate && pnpm install --frozen-lockfile
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter web build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/apps/web/.output ./.output
ENV NODE_ENV=production
ENV PORT=80
ENV HOST=0.0.0.0
EXPOSE 80
CMD ["node", ".output/server/index.mjs"]
