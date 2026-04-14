FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/ apps/api/
COPY packages/shared/ packages/shared/

RUN npm ci --workspace=apps/api --workspace=packages/shared --include-workspace-root
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma && \
    npm run build --workspace=apps/api

EXPOSE 3000
CMD ["node", "apps/api/dist/main"]
