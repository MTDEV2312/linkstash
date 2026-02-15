import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crear el logger con Winston
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
      return `[${timestamp}] ${level.toUpperCase()}: ${message} ${metaStr}`.trim();
    })
  ),
  defaultMeta: { service: 'linkstash-api' },
  transports: [
    // Console transport (siempre activo)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // File transport - errores
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // File transport - combinado
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10
    })
  ]
});

// Crear un logger con contexto
export const getLogger = (context = '') => {
  return {
    info: (message, meta = {}) => logger.info(message, { context, ...meta }),
    error: (message, error = null, meta = {}) => {
      const errorMeta = {
        context,
        ...meta
      };
      if (error instanceof Error) {
        errorMeta.errorMessage = error.message;
        errorMeta.stack = error.stack;
      }
      logger.error(message, errorMeta);
    },
    warn: (message, meta = {}) => logger.warn(message, { context, ...meta }),
    debug: (message, meta = {}) => logger.debug(message, { context, ...meta })
  };
};

export default logger;
