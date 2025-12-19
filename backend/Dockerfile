# Imagen base de Node.js 18 LTS (Alpine para reducir tamaño)
FROM node:18-alpine AS base

# Instalar dependencias del sistema necesarias para algunas librerías npm
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat

WORKDIR /app

# ===========================
# Etapa de desarrollo
# ===========================
FROM base AS development

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar TODAS las dependencias (incluyendo devDependencies)
RUN npm install

# Copiar el resto del código fuente
COPY . .

# Exponer puerto (configurable via ENV)
EXPOSE 5000

# Comando para desarrollo con nodemon
CMD ["npm", "run", "dev"]

# ===========================
# Etapa de producción
# ===========================
FROM base AS production

# Variables de entorno para producción
ENV NODE_ENV=production \
    NPM_CONFIG_LOGLEVEL=error

# Copiar PRIMERO los archivos de dependencias
COPY package*.json ./

# Instalar SOLO dependencias de producción
RUN npm install --omit=dev --legacy-peer-deps && \
    npm cache clean --force

# Copiar el resto del código fuente
COPY . .

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Cambiar a usuario no-root
USER nodejs

# Exponer puerto
EXPOSE 5000

# Health check (simple para no-root user)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/', (r) => {if(r.statusCode === 200) process.exit(0); else process.exit(1)}).on('error', () => process.exit(1))" || exit 1

# Comando para producción
CMD ["node", "app.js"]
