FROM node:22-alpine
WORKDIR /app

ARG VITE_API_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

COPY package.json package-lock.json ./
COPY apps/web/ apps/web/

RUN npm ci --workspace=apps/web --include-workspace-root
RUN VITE_API_URL=$VITE_API_URL VITE_SUPABASE_URL=$VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY npm run build --workspace=apps/web
RUN npm install -g serve

EXPOSE 80
CMD ["serve", "-s", "apps/web/dist", "-l", "80"]
