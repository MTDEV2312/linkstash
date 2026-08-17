FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

RUN addgroup -S nodejs && adduser -S nodejs -G nodejs

ENV NODE_ENV=production
ENV PORT=5000

COPY backend/package.json backend/pnpm-lock.yaml backend/pnpm-workspace.yaml* ./
RUN pnpm install --prod --frozen-lockfile

COPY backend/ .
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 5000
CMD ["node", "app.js"]
