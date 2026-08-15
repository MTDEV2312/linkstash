import { randomUUID } from 'crypto';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('Middlewares');

// Middleware para agregar request ID
export const requestIdMiddleware = (req, res, next) => {
  // Generar un ID único para el request
  req.requestId = req.headers['x-request-id'] || randomUUID().substring(0, 8);
  
  // Agregar al response header
  res.setHeader('X-Request-ID', req.requestId);
  
  // Agregar timing
  const startTime = Date.now();
  
  // Intercept response para log
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - startTime;
    res.setHeader('X-Response-Time', `${duration}ms`);
    
    // Log de request completado
    logger.info(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`, {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userId: req.user?._id,
      ip: req.ip
    });
    
    return originalJson.call(this, data);
  };
  
  next();
};

// Middleware para sanitizar headers
export const sanitizeHeadersMiddleware = (req, res, next) => {
  // Remover headers sensibles
  delete req.headers['x-powered-by'];
  delete req.headers['server'];
  
  // Agregar headers de seguridad
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
};

// Middleware para validar content-type en POST/PUT/PATCH
export const validateContentType = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentLength = req.headers['content-length'];
    const hasBody = (contentLength && contentLength !== '0') || req.headers['transfer-encoding'] === 'chunked';

    if (!hasBody) {
      return next();
    }

    const contentType = (req.get('content-type') || '').toLowerCase();
    const allowedTypes = [
      'application/json',
      'multipart/form-data',
      'application/x-www-form-urlencoded'
    ];
    const isAllowed = allowedTypes.some(type => contentType.includes(type));

    if (!isAllowed) {
      return res.status(400).json({
        success: false,
        message: 'Content-Type debe ser application/json, multipart/form-data o application/x-www-form-urlencoded',
        errorCode: 'INVALID_CONTENT_TYPE',
        requestId: req.requestId
      });
    }
  }
  
  next();
};

// Middleware para sanitizar input (prevenir inyecciones básicas)
export const sanitizeInput = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }
  
  if (req.query && typeof req.query === 'object') {
    sanitizeObject(req.query);
  }
  
  next();
};

// Función auxiliar para sanitizar objeto
function sanitizeObject(obj) {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      // Remover caracteres de control y espacios excesivos
      obj[key] = obj[key]
        .replace(/[\x00-\x1F\x7F]/g, '') // Caracteres de control
        .trim();
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}

// Middleware para validar tamaño de request
export const validateRequestSize = (maxBodySizeKB = 100) => {
  return (req, res, next) => {
    if (req.is('application/json')) {
      let dataSize = 0;
      req.on('data', chunk => {
        dataSize += chunk.length;
        if (dataSize > maxBodySizeKB * 1024) {
          res.status(413).json({
            success: false,
            message: `El cuerpo de la solicitud excede ${maxBodySizeKB}KB`,
            errorCode: 'PAYLOAD_TOO_LARGE',
            requestId: req.requestId
          });
          req.connection.destroy();
        }
      });
    }
    next();
  };
};

// Middleware para detectar patrones de ataque básicos
export const detectAttackPatterns = (req, res, next) => {
  const suspiciousPatterns = [
    /(\bunion\b|\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b)/i, // SQL injection
    /(<script|javascript:|onerror=|onload=)/i, // XSS
    /(\.\.(\/|\\)|\/\/(?!:))/i, // Path traversal (excluyendo http:// https://)
    /(\$where|\$ne|\$gt|\$lt)/i // MongoDB injection
  ];
  
  const checkString = (str) => {
    if (typeof str === 'string') {
      // Excluir URLs que contengan //
      if (str.includes('://')) return false;
      return suspiciousPatterns.some(pattern => pattern.test(str));
    }
    return false;
  };
  
  // Verificar body
  if (req.body && typeof req.body === 'object') {
    if (checkObjectForPatterns(req.body, checkString)) {
      logger.warn('Patrón de ataque detectado en body', {
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        ip: req.ip
      });
      
      return res.status(400).json({
        success: false,
        message: 'Solicitud sospechosa detectada',
        errorCode: 'SUSPICIOUS_REQUEST',
        requestId: req.requestId
      });
    }
  }
  
  next();
};

// Función auxiliar para verificar patrones en objeto
function checkObjectForPatterns(obj, checkFn) {
  for (const key in obj) {
    if (checkFn(obj[key])) {
      return true;
    }
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      if (checkObjectForPatterns(obj[key], checkFn)) {
        return true;
      }
    }
  }
  return false;
}
