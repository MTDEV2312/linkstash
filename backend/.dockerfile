FROM node:20-alpine

WORKDIR /app

RUN addgroup -S nodejs && adduser -S nodejs -G nodejs

ENV NODE_ENV=production
ENV PORT=5000

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ .
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 5000
CMD ["node", "app.js"]
