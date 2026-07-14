# Guía de Despliegue en Producción (Backend & Base de Datos)

Esta guía describe el paso a paso para desplegar la API y el servicio de cola (Redis) en un VPS de producción utilizando **Docker Compose** y **Cloudflare Tunnel (cloudflared)** para exponer el servicio de forma segura sin abrir puertos públicos.

---

## 📋 Requisitos Previos

Asegúrate de tener instalado lo siguiente en tu VPS:
1. **Docker** (versión 20.10 o superior)
2. **Docker Compose** (versión v2.0 o superior)
3. **cloudflared** (cliente de Cloudflare Tunnel instalado y autenticado)

---

## 🚀 Paso 1: Configurar Variables de Entorno (`.env`)

Crea un archivo `.env` en la raíz del proyecto del VPS (`/LinkStash/.env`). Este archivo definirá la configuración de producción para los contenedores Docker.

```bash
# ==========================================
# Configuración del Entorno y Puertos
# ==========================================
NODE_ENV=production
PORT=5000

# ==========================================
# Base de Datos y Seguridad
# ==========================================
# URI de conexión a tu clúster de MongoDB Atlas
MONGODB_URI=mongodb+srv://<usuario>:<password>@<host>/<database>

# Genera una clave segura de al menos 32 caracteres (ej: openssl rand -base64 32)
JWT_SECRET=tu_clave_secreta_super_segura_de_produccion

# ==========================================
# Integración con el Frontend (Vercel)
# ==========================================
# Dominios permitidos para CORS (separa por comas si tienes múltiples entornos)
ALLOWED_ORIGINS=https://linkstash-frontend.vercel.app,https://tudominio.com

# URL pública de este backend exposed por Cloudflare Tunnel
BACKEND_BASE_URL=https://api.tudominio.com

# ==========================================
# Redis y Cola de Trabajos (BullMQ)
# ==========================================
# Contraseña para asegurar la base de datos interna de Redis en el contenedor
REDIS_PASSWORD=contrasenia_muy_segura_para_redis_interno

# ==========================================
# Integraciones de Terceros (InsForge)
# ==========================================
INSFORGE_URL=https://<id-app>.region.insforge.app
INSFORGE_ANON_KEY=ik_tu_anon_key_de_insforge
INSFORGE_STORAGE_BUCKET=images
INSFORGE_STORAGE_FOLDER=linkstash

# ==========================================
# Configuración del Scraper
# ==========================================
USER_AGENT=LinkStash-Bot/1.0
SCRAPER_TIMEOUT_MS=10000
SCRAPER_STORE_EXTERNAL_IMAGES=false
SCRAPER_QUEUE_CONCURRENCY=3
```

---

## 📦 Paso 2: Levantar el Backend y Redis con Docker

Ejecuta el siguiente comando en la raíz del proyecto para descargar, compilar y levantar los contenedores en segundo plano:

```bash
docker compose up -d --build
```

Esto iniciará:
- Un contenedor de **Redis** aislado con autenticación requerida.
- Un contenedor de **Node.js** ejecutando el backend de LinkStash en puerto `5000`.

Para comprobar que los contenedores están activos:
```bash
docker compose ps
```

Para revisar los logs en tiempo real:
```bash
docker compose logs -f backend
```

---

## 🔒 Paso 3: Configurar Cloudflare Tunnel (cloudflared)

Al utilizar Cloudflare Tunnel, no es necesario abrir puertos públicos en el firewall del VPS (como el 80, 443 o 5000), mejorando radicalmente la seguridad del servidor.

### Opción A: A través de Cloudflare Zero Trust Dashboard (Recomendado)
1. Ve a tu consola de [Cloudflare Zero Trust](https://one.dash.cloudflare.com/).
2. Ve a **Access** -> **Tunnels** y edita tu túnel activo en el VPS.
3. Añade un nuevo **Public Hostname**:
   - **Subdomain:** `api`
   - **Domain:** `tudominio.com`
   - **Service Type:** `HTTP`
   - **URL:** `localhost:5000` (puerto expuesto por Docker en la máquina local).
4. Guarda los cambios.

### Opción B: A través de archivo de configuración local (`config.yml`)
Si administras tu túnel de forma local en el servidor, añade las siguientes líneas a tu archivo de configuración:

```yaml
ingress:
  - hostname: api.tudominio.com
    service: http://localhost:5000
  - service: http_status:404
```
Y reinicia el servicio del túnel:
```bash
sudo systemctl restart cloudflared
```

---

## ⚡ Paso 4: Configurar el Frontend en Vercel

Dado que tu frontend estará alojado en Vercel, asegúrate de configurar las siguientes variables de entorno en la configuración de tu proyecto en Vercel antes de desplegar:

* **Key:** `VITE_API_URL`
* **Value:** `https://api.tudominio.com/api`

*Nota: Asegúrate de incluir el sufijo `/api` al final del subdominio de tu API pública.*

---

## 🛡️ Consideraciones de Seguridad y Buenas Prácticas

1. **Firewall del VPS (UFW):**
   Asegúrate de mantener cerrados los puertos públicos. Al utilizar Cloudflare Tunnel, tu firewall solo debería permitir conexiones entrantes SSH (puerto 22 u otro personalizado). Los puertos 80, 443 y 5000 deben permanecer bloqueados para la red externa.
   ```bash
   sudo ufw default deny incoming
   sudo ufw default allow outgoing
   sudo ufw allow 22/tcp # o tu puerto SSH alternativo
   sudo ufw enable
   ```

2. **Permisos del archivo `.env`:**
   Protege el archivo `.env` para que solo el propietario del sistema tenga permisos de lectura/escritura:
   ```bash
   chmod 600 .env
   ```

3. **Secretos seguros:**
   Nunca utilices contraseñas por defecto en producción. Genera un `JWT_SECRET` fuerte para evitar la falsificación de tokens de sesión. Puedes generarlo rápidamente en tu terminal:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. **Monitoreo de Procesos:**
   Puedes configurar políticas de reinicio automático ante fallos del contenedor utilizando la directiva `restart: unless-stopped` que ya viene configurada en el archivo `docker-compose.yml`.
