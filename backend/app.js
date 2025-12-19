import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import connectDB from './src/config/database.js';
import errorHandler from './src/utils/errorHandler.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Importar rutas (las variables de entorno ya están cargadas gracias a import 'dotenv/config')
import authRoutes from './src/routes/authRoutes.js';
import linkRoutes from './src/routes/linkRoutes.js';
import tagRoutes from './src/routes/tagRoutes.js';
import dashboardRoutes from './src/routes/dashboardRoutes.js';
import metricsRoutes from './src/routes/metricsRoutes.js';

const app = express();
// Confiar en proxy en producción (Render) o si TRUST_PROXY=true
const trustProxyEnv = process.env.TRUST_PROXY && process.env.TRUST_PROXY.toLowerCase() === 'true';
if (trustProxyEnv || process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}
// Configurar rate limiter global usando variables de entorno
const rlWindow = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10); // ms
const rlMax = parseInt(process.env.RATE_LIMIT_MAX || '60', 10);
const limiter = rateLimit({
  windowMs: rlWindow,
  max: rlMax,
  standardHeaders: true, // Return rate limit info in the RateLimit-* headers
  legacyHeaders: false, // Disable the X-RateLimit-* headers
  message: { success: false, message: 'Demasiadas peticiones, inténtalo de nuevo más tarde.' }
});

// Aplicar rate limiter a todas las rutas
app.use(limiter);
const PORT = process.env.PORT || 5000;

// Conectar a la base de datos
connectDB();

// Iniciar worker de scraping in-process si está habilitado (por defecto enabled)
if ((process.env.ENABLE_SCRAPER_WORKER || 'true').toLowerCase() !== 'false') {
  // Si hay Redis configurado preferimos inicializar BullMQ (worker + queue)
  if (process.env.REDIS_HOST) {
    import('./src/config/queue.js')
      .then(() => console.log('BullMQ queue/worker inicializada (REDIS)'))
      .catch(e => console.error('No se pudo inicializar BullMQ, intentar fallback in-process:', e));
  } else {
    // Import dinámico del worker in-process
    import('./src/services/scraperWorker.js')
      .then(() => console.log('Scraper worker (in-process) cargado'))
      .catch(e => console.error('No se pudo cargar scraperWorker:', e));
  }
}

// Middlewares globales
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (p.ej. imagen predeterminada)
// __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carpeta pública para assets (por ejemplo: public/defaults/default-image.svg)
app.use('/defaults', express.static(path.join(__dirname, 'public', 'defaults')));

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/links', linkRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/metrics', metricsRoutes);

// Ruta de health check (para wake-up de Render)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    message: 'LinkStash API está funcionando',
    timestamp: new Date().toISOString()
  });
});

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ 
    message: 'LinkStash API funcionando correctamente!',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Middleware de manejo de errores (debe ir al final)
app.use(errorHandler);

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Ruta no encontrada' 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📡 API disponible en: http://localhost:${PORT}`);
});

export default app;
