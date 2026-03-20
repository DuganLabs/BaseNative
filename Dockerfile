# Multi-stage production Dockerfile for BaseNative applications

# Stage 1: Build
FROM node:22-slim AS builder

RUN corepack enable pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ packages/
COPY examples/ examples/
COPY src/ src/
COPY scripts/ scripts/
COPY nx.json ./

RUN pnpm install --frozen-lockfile --prod=false
RUN pnpm exec nx run-many --target=bundle --parallel 2>/dev/null || true

# Stage 2: Production
FROM node:22-slim AS production

RUN corepack enable pnpm

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages/ packages/
COPY --from=builder /app/examples/ examples/
COPY --from=builder /app/src/ src/
COPY --from=builder /app/nx.json ./

RUN pnpm install --frozen-lockfile --prod

EXPOSE 3000

CMD ["node", "examples/express/server.js"]
