import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import connectDB from './src/config/database.js';
import errorHandler from './src/utils/errorHandler.js';

// Importar rutas
import authRoutes from './src/routes/authRoutes.js';
import linkRoutes from './src/routes/linkRoutes.js';
import tagRoutes from './src/routes/tagRoutes.js';

// Configurar variables de entorno
dotenv.config();

const app = express();
// Si la app está detrás de un proxy (p.ej. Render), permite usar X-Forwarded-* para IP
if (process.env.TRUST_PROXY && process.env.TRUST_PROXY.toLowerCase() === 'true') {
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

// Middlewares globales
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/links', linkRoutes);
app.use('/api/tags', tagRoutes);

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
