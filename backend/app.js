import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import dns from 'dns';
import connectDB from './src/config/database.js';
import { errorHandler } from './src/utils/customErrors.js';
import { getLogger } from './src/utils/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  requestIdMiddleware,
  sanitizeHeadersMiddleware,
  validateContentType,
  sanitizeInput,
  detectAttackPatterns
} from './src/middlewares/securityMiddleware.js';

// Definir __dirname y __filename en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Usar Google DNS solo en desarrollo para resolver registros SRV de MongoDB Atlas
// En producción, el DNS del servidor/proveedor hosting funciona correctamente
if (process.env.NODE_ENV === 'development') {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
}

// Importar rutas (las variables de entorno ya están cargadas gracias a import 'dotenv/config')
import authRoutes from './src/routes/authRoutes.js';
import linkRoutes from './src/routes/linkRoutes.js';
import tagRoutes from './src/routes/tagRoutes.js';
import dashboardRoutes from './src/routes/dashboardRoutes.js';
import metricsRoutes from './src/routes/metricsRoutes.js';

const logger = getLogger('AppServer');
const app = express();
// Confiar en proxy en producción (Render) o si TRUST_PROXY=true
const trustProxyEnv = process.env.TRUST_PROXY && process.env.TRUST_PROXY.toLowerCase() === 'true';
if (trustProxyEnv || process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Middlewares de seguridad y parsing (deben ir primero)
app.use(helmet()); // Headers de seguridad
app.use(compression()); // Compresión de respuestas
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middlewares personalizados de seguridad
app.use(requestIdMiddleware); // Agregar request ID
app.use(sanitizeHeadersMiddleware); // Sanitizar headers sensibles
app.use(validateContentType); // Validar content-type
app.use(sanitizeInput); // Sanitizar inputs
app.use(detectAttackPatterns); // Detectar patrones de ataque

// CORS mejorado
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'X-Response-Time', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge: 86400
};
app.use(cors(corsOptions));

// Configurar rate limiter global usando variables de entorno
const rlWindow = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10); // ms
const rlMax = parseInt(process.env.RATE_LIMIT_MAX || '60', 10);
const limiter = rateLimit({
  windowMs: rlWindow,
  max: rlMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiadas peticiones, inténtalo de nuevo más tarde.',
    errorCode: 'RATE_LIMIT_EXCEEDED'
  },
  skip: (req) => {
    // No aplicar rate limit a health check
    return req.path === '/health';
  },
  keyGenerator: (req) => {
    // Usar userId si está autenticado, sino IP
    return req.user?._id?.toString() || req.ip;
  }
});

// Aplicar rate limiter a todas las rutas (excepto health)
app.use(limiter);

// Conectar a la base de datos
connectDB()
  .then(() => logger.info('Base de datos conectada exitosamente'))
  .catch(err => logger.error('Error conectando a BD', err));

// Inicializar worker de scraping in-process si está habilitado (por defecto enabled)
if ((process.env.ENABLE_SCRAPER_WORKER || 'true').toLowerCase() !== 'false') {
  // Si hay Redis configurado preferimos inicializar BullMQ (worker + queue)
  if (process.env.REDIS_HOST) {
    import('./src/config/queue.js')
      .then(() => logger.info('BullMQ queue/worker inicializada (REDIS)'))
      .catch(e => logger.error('No se pudo inicializar BullMQ, intentar fallback in-process', e));
  } else {
    // Import dinámico del worker in-process
    import('./src/services/scraperWorker.js')
      .then(() => logger.info('Scraper worker (in-process) cargado'))
      .catch(e => logger.error('No se pudo cargar scraperWorker', e));
  }
}

const PORT = process.env.PORT || 5000;

// Carpeta pública para assets (por ejemplo: public/defaults/default-image.svg)
app.use('/defaults', express.static(path.join(__dirname, 'public', 'defaults')));
// Documentacion estatica estilo
app.use('/api-docs', express.static(path.join(__dirname, 'public', 'api-docs')));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/links', linkRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/metrics', metricsRoutes);

// Ruta de health check (para wake-up de Render)
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    message: 'LinkStash API está funcionando',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'LinkStash API funcionando correctamente',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    documentation: '/api-docs'
  });
});

// Middleware de manejo de errores (debe ir al final)
app.use(errorHandler);

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    errorCode: 'NOT_FOUND',
    path: req.path,
    method: req.method,
    requestId: req.requestId
  });
});

// Iniciar servidor
const server = app.listen(PORT, () => {
  logger.info(`🚀 Servidor corriendo en puerto ${PORT}`);
  logger.info(`📡 API disponible en: http://localhost:${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Manejo de excepciones no capturadas
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default app;
