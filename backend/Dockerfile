# ===========================
# Imagen base de Node.js 18 LTS (Alpine para reducir tamaño)
# ===========================
FROM node:18-alpine

# Instalar dependencias del sistema necesarias para algunas librerías npm
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat \
    curl

# Establecer directorio de trabajo
WORKDIR /app

# Variables de entorno para producción
ENV NODE_ENV=production \
    NPM_CONFIG_LOGLEVEL=error

# Copiar archivos de dependencias primero (mejor cache de Docker)
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

# Exponer puerto (Render usa la variable PORT automáticamente)
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "const port=process.env.PORT||5000;require('http').get('http://localhost:'+port+'/', (r) => {if(r.statusCode === 200) process.exit(0); else process.exit(1)}).on('error', () => process.exit(1))" || exit 1

# Comando para producción (Render ejecutará esto automáticamente)
CMD ["node", "app.js"]
