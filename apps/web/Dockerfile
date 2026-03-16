FROM node:22-alpine

WORKDIR /app

# Copy root workspace files
COPY package.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

# Install dependencies
RUN npm install --workspace=apps/web --workspace=packages/shared --include-workspace-root

# Copy source
COPY apps/web/ apps/web/
COPY packages/shared/ packages/shared/

EXPOSE 5173

CMD ["npm", "run", "dev", "--workspace=apps/web", "--", "--host", "0.0.0.0"]
