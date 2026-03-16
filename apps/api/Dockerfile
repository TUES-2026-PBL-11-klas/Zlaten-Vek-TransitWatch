# ---- Builder stage ----
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root workspace files
COPY package.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

# Install dependencies
RUN npm install --workspace=apps/api --workspace=packages/shared --include-workspace-root

# Copy source
COPY apps/api/ apps/api/
COPY packages/shared/ packages/shared/

# Build shared package first, then API
RUN npm run build --workspace=packages/shared && npm run build --workspace=apps/api

# ---- Runner stage ----
FROM node:22-alpine AS runner

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
