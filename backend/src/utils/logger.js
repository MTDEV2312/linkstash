import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Formato detallado para archivos de log
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, context, errorMessage, errorName, errorCode, stack, cause, ...meta }) => {
    let line = `[${timestamp}] ${level.toUpperCase()}`;
    if (context) line += ` [${context}]`;
    line += `: ${message}`;
    if (errorMessage) line += ` | Error: ${errorMessage}`;
    if (errorName) line += ` (${errorName})`;
    if (errorCode) line += ` [code: ${errorCode}]`;
    // Incluir metadata relevante (excluyendo service y campos ya impresos)
    const { service, ...restMeta } = meta;
    const metaKeys = Object.keys(restMeta);
    if (metaKeys.length > 0) {
      line += ` | ${JSON.stringify(restMeta)}`;
    }
    if (stack) line += `\n${stack}`;
    if (cause) line += `\n  Caused by: ${typeof cause === 'object' ? JSON.stringify(cause) : cause}`;
    return line;
  })
);

// Formato legible para consola
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, context, errorMessage, stack, ...meta }) => {
    let line = `${timestamp} ${level}`;
    if (context) line += ` [${context}]`;
    line += ` ${message}`;
    if (errorMessage) line += ` → ${errorMessage}`;
    const { service, errorName, errorCode, cause, ...restMeta } = meta;
    const metaKeys = Object.keys(restMeta);
    if (metaKeys.length > 0) {
      line += ` ${JSON.stringify(restMeta)}`;
    }
    if (stack) line += `\n${stack}`;
    return line;
  })
);

// Crear el logger con Winston
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'linkstash-api' },
  transports: [
    // Console transport (siempre activo) - formato legible
    new winston.transports.Console({
      format: consoleFormat
    }),
    // File transport - errores - formato detallado
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: fileFormat
    }),
    // File transport - combinado - formato detallado
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10,
      format: fileFormat
    })
  ]
});

// Crear un logger con contexto
export const getLogger = (context = '') => {
  return {
    info: (message, meta = {}) => logger.info(message, { context, ...meta }),
    error: (message, errorOrMeta = null, meta = {}) => {
      const errorMeta = {
        context,
        ...meta
      };
      if (errorOrMeta instanceof Error) {
        errorMeta.errorMessage = errorOrMeta.message;
        errorMeta.stack = errorOrMeta.stack;
        if (errorOrMeta.code) errorMeta.errorCode = errorOrMeta.code;
        if (errorOrMeta.name) errorMeta.errorName = errorOrMeta.name;
        // Incluir causa encadenada si existe
        if (errorOrMeta.cause) {
          errorMeta.cause = errorOrMeta.cause instanceof Error
            ? { message: errorOrMeta.cause.message, stack: errorOrMeta.cause.stack }
            : errorOrMeta.cause;
        }
      } else if (errorOrMeta && typeof errorOrMeta === 'object') {
        // Si se pasa un objeto en vez de Error, incluirlo como metadata
        Object.assign(errorMeta, errorOrMeta);
      } else if (errorOrMeta) {
        // Si se pasa un string u otro primitivo
        errorMeta.errorDetail = errorOrMeta;
      }
      logger.error(message, errorMeta);
    },
    warn: (message, meta = {}) => logger.warn(message, { context, ...meta }),
    debug: (message, meta = {}) => logger.debug(message, { context, ...meta })
  };
};

export default logger;
