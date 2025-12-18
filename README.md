# 🔗 LinkStash

**LinkStash** es una aplicación full-stack para organizar y gestionar enlaces de manera inteligente y segura. Guarda, categoriza y busca tus enlaces favoritos con metadata automática extraída mediante web scraping.

## 📁 Estructura del Proyecto

```
LinkStash/
├── backend/          # API REST con Node.js y Express
├── frontend/         # Aplicación React con Vite
├── .gitignore       # Archivos ignorados por Git
└── README.md        # Este archivo
```
### 🔧 Configuración de Seguridad

Cada sub-proyecto (backend y frontend) incluye:

- **`.npmrc`**: Configuración de seguridad npm
- **`package.json`**: Versiones fijas y overrides
- **`package-lock.json`**: Lockfiles para reproducibilidad

## 📋 Características

- 🔐 **Autenticación completa** con JWT
- 🕷️ **Web scraping automático** para extraer título, descripción e imágenes
- 🏷️ **Sistema de etiquetas** para organizar enlaces
- 🔍 **Búsqueda y filtrado** avanzado
- 📱 **Interfaz responsive** con React y Tailwind CSS
- 🗄️ **Base de datos MongoDB** para almacenamiento
- ⚡ **Sistema de caché** con stale-while-revalidate
- 🌙 **Dark mode** con persistencia
- 📴 **Modo offline** con Service Worker
- 🎯 **Error tracking** con Sentry
- 🔄 **Redis + BullMQ** para procesamiento en background
- 📊 **Dashboard** con métricas en tiempo real

## 🛠️ Tecnologías

### Backend
- Node.js + Express
- MongoDB + Mongoose
- Redis + BullMQ (colas de trabajo)
- JWT para autenticación
- Cheerio para web scraping
- Bcrypt para hash de contraseñas
- Cloudinary para almacenamiento de imágenes
- Docker + Docker Compose

### Frontend
- React 18.2.0 + Vite 7.1.7
- React Router DOM 6.15.0
- Tailwind CSS 3.3.3
- Axios 1.12.2 para HTTP requests
- Zustand 4.4.1 para gestión de estado
- Sentry para error tracking
- Playwright para tests E2E
- Vitest para tests unitarios

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js (v16 o superior)
- MongoDB (local o Atlas)
- Git

### 1. Clonar el repositorio
```bash
git clone <tu-repositorio>
cd LinkStash
```

### 2. Configurar Backend
```bash
# Navegar al directorio del backend
cd backend

# Instalar dependencias del backend
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# Iniciar con Docker Compose (recomendado)
docker-compose up -d

# O iniciar servidor de desarrollo directamente
npm run dev
```

### 3. Configurar Frontend
```bash
# Navegar al directorio del frontend
cd frontend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus configuraciones

# Iniciar servidor de desarrollo (puerto 5173)
npm run dev

# Ejecutar tests
npm test              # Tests unitarios
npm run test:e2e      # Tests E2E con Playwright

# Build de producción
npm run build
npm run preview
```

### 4. Configurar MongoDB y Redis
- MongoDB y Redis se inician automáticamente con `docker-compose up -d`
- O configura tus propias instancias en el archivo `.env`
- Actualiza `MONGODB_URI` y `REDIS_URL` en el archivo `.env`

## 📁 Estructura del Proyecto

```
LinkStash/
├── backend/
│   ├── app.js                    # Servidor principal
│   ├── docker-compose.yml        # Docker Compose
│   ├── Dockerfile               # Dockerfile backend
│   ├── package.json
│   ├── .env
│   └── src/
│       ├── config/
│       │   ├── database.js      # Configuración MongoDB
│       │   └── queue.js         # Configuración BullMQ
│       ├── controllers/         # Lógica de negocio
│       ├── middlewares/         # Middlewares personalizados
│       ├── models/             # Modelos de MongoDB
│       ├── routes/             # Rutas de la API
│       ├── services/           # Servicios (scraping, workers)
│       └── utils/              # Utilidades
│
└── frontend/
    ├── src/
    │   ├── components/         # Componentes React
    │   ├── pages/              # Páginas principales
    │   ├── services/           # Servicios API
    │   ├── stores/             # Stores de Zustand
    │   ├── hooks/              # Custom hooks
    │   └── utils/              # Utilidades
    ├── tests/
    │   ├── e2e/                # Tests E2E (Playwright)
    │   └── unit/               # Tests unitarios (Vitest)
    ├── public/
    │   ├── sw.js               # Service Worker
    │   └── offline.html        # Página offline
    ├── package.json
    ├── vite.config.js
    ├── vitest.config.js
    └── playwright.config.js
```

## 🔌 API Endpoints

### Autenticación
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Obtener perfil de usuario
- `PUT /api/auth/profile` - Actualizar perfil

### Enlaces
- `GET /api/links` - Obtener todos los enlaces del usuario
- `POST /api/links/save-link` - Guardar nuevo enlace
- `GET /api/links/:id` - Obtener enlace específico
- `PUT /api/links/:id` - Actualizar enlace
- `DELETE /api/links/:id` - Eliminar enlace

### Etiquetas
- `GET /api/tags` - Obtener todas las etiquetas
- `POST /api/tags` - Crear nueva etiqueta
- `PUT /api/tags/:id` - Actualizar etiqueta
- `DELETE /api/tags/:id` - Eliminar etiqueta

### Dashboard
- `GET /api/dashboard/stats` - Obtener estadísticas del usuario

### Métricas
- `GET /api/metrics` - Obtener métricas del sistema

## 🧠 Modelos de Datos

### Usuario
```javascript
{
  username: String,
  email: String,
  password: String, // Hasheada
  createdAt: Date
}
```

### Enlace
```javascript
{
  userId: ObjectId,
  url: String,
  title: String,
  description: String,
  image: String,
  tags: [String],
  createdAt: Date
}
```

### Etiqueta
```javascript
{
  userId: ObjectId,
  name: String,
  createdAt: Date
}
```


## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

---

⭐ ¡Dale una estrella si este proyecto te ha ayudado!

