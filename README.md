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

## 🔒 Seguridad

Este proyecto implementa las **mejores prácticas de seguridad npm** según el repositorio [npm-security-best-practices](https://github.com/bodadotsh/npm-security-best-practices):

### ✅ Prácticas de Seguridad Implementadas

1. **📌 Versiones de dependencias fijadas**: Sin operadores `^` o `~`
2. **🚫 Scripts de ciclo de vida deshabilitados**: Previene ejecución de código malicioso
3. **🔒 Archivos lockfiles incluidos**: Para builds reproducibles
4. **⚖️ Overrides de dependencias**: Control sobre dependencias transitivas
5. **🛡️ Provenance statements**: Para paquetes publicados
6. **🔍 Auditorías regulares**: Escaneo de vulnerabilidades

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

## 🛠️ Tecnologías

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT para autenticación
- Cheerio para web scraping
- Bcrypt para hash de contraseñas

### Frontend
- React 18 + Vite
- React Router DOM
- Tailwind CSS
- Axios para HTTP requests
- Zustand para gestión de estado

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

# Iniciar servidor de desarrollo
npm run dev
```

### 3. Configurar Frontend
```bash
# Navegar al directorio del cliente
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

### 4. Configurar MongoDB
- Asegúrate de que MongoDB esté corriendo
- Actualiza `MONGODB_URI` en el archivo `.env`

## 📁 Estructura del Proyecto

```
LinkStash/
├── app.js                 # Servidor principal
├── package.json
├── .env
├── .gitignore
├── README.md
│
├── src/
│   ├── config/
│   │   └── database.js    # Configuración MongoDB
│   ├── controllers/       # Lógica de negocio
│   ├── middlewares/       # Middlewares personalizados
│   ├── models/           # Modelos de MongoDB
│   ├── routes/           # Rutas de la API
│   ├── services/         # Servicios (scraping, etc.)
│   └── utils/            # Utilidades
│
└── client/               # Frontend React
    ├── src/
    │   ├── components/   # Componentes reutilizables
    │   ├── pages/        # Páginas principales
    │   ├── services/     # Servicios API
    │   └── utils/        # Utilidades frontend
    ├── package.json
    └── vite.config.js
```

## 🔌 API Endpoints

### Autenticación
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Obtener perfil de usuario

### Enlaces
- `GET /api/links` - Obtener todos los enlaces del usuario
- `POST /api/links/save-link` - Guardar nuevo enlace
- `GET /api/links/:id` - Obtener enlace específico
- `PUT /api/links/:id` - Actualizar enlace
- `DELETE /api/links/:id` - Eliminar enlace

### Etiquetas
- `GET /api/tags` - Obtener todas las etiquetas
- `POST /api/tags` - Crear nueva etiqueta
- `DELETE /api/tags/:id` - Eliminar etiqueta

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

## 🎯 Roadmap

- [ ] Implementar búsqueda full-text
- [ ] Agregar categorías predefinidas
- [ ] Exportar/importar enlaces
- [ ] Modo oscuro
- [ ] Favoritos y archivado
- [ ] API pública con rate limiting

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
