FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

RUN npm ci --workspace=apps/api --workspace=packages/shared --include-workspace-root

COPY apps/api/ apps/api/
COPY packages/shared/ packages/shared/

RUN npm run build --workspace=packages/shared && \
    npx prisma generate --schema=apps/api/prisma/schema.prisma && \
    npm run build --workspace=apps/api

FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json apps/api/
COPY --from=builder /app/apps/api/node_modules apps/api/node_modules
COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/packages/shared/package.json packages/shared/
COPY --from=builder /app/packages/shared/dist packages/shared/dist

EXPOSE 3000

CMD ["node", "apps/api/dist/main"]
