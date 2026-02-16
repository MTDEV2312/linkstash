import { getLogger } from '../utils/logger.js';

const logger = getLogger('ErrorHandler');

// Clase personalizada para errores de la aplicación
export class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.timestamp = new Date().toISOString();
  }
}

// Clase para errores de validación
export class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

// Clase para errores de autenticación
export class AuthenticationError extends AppError {
  constructor(message = 'Autenticación fallida') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

// Clase para errores de autorización
export class AuthorizationError extends AppError {
  constructor(message = 'No tienes permiso para acceder a este recurso') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

// Clase para recursos no encontrados
export class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado') {
    super(message, 404, 'NOT_FOUND');
  }
}

// Clase para conflictos (ej. duplicados)
export class ConflictError extends AppError {
  constructor(message = 'El recurso ya existe') {
    super(message, 409, 'CONFLICT');
  }
}

// Middleware de error handling centralizado
export const errorHandler = (err, req, res, next) => {
  // Asegurar que tenemos statusCode
  const statusCode = err.statusCode || 500;
  const errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';

  // Log del error
  const logMeta = {
    statusCode,
    errorCode,
    path: req.path,
    method: req.method,
    requestId: req.requestId,
    userId: req.user?._id
  };

  if (statusCode >= 500) {
    logger.error(err.message || 'Error del servidor', err, logMeta);
  } else {
    logger.warn(err.message || 'Error de cliente', logMeta);
  }

  // Manejo específico de tipos de errores Mongoose
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'ID inválido',
      errorCode: 'INVALID_ID',
      requestId: req.requestId
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `Ya existe un registro con este ${field}`,
      errorCode: 'DUPLICATE_ENTRY',
      field,
      requestId: req.requestId
    });
  }

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errorCode: 'VALIDATION_ERROR',
      errors,
      requestId: req.requestId
    });
  }

  // Manejo de errores JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token inválido',
      errorCode: 'INVALID_TOKEN',
      requestId: req.requestId
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expirado',
      errorCode: 'TOKEN_EXPIRED',
      requestId: req.requestId
    });
  }

  // Error de conexión a BD
  if (err.name === 'MongoNetworkError' || err.name === 'MongooseError') {
    return res.status(503).json({
      success: false,
      message: 'Error de base de datos',
      errorCode: 'DATABASE_ERROR',
      requestId: req.requestId
    });
  }

  // Error de payload muy grande
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'El archivo es demasiado grande',
      errorCode: 'PAYLOAD_TOO_LARGE',
      requestId: req.requestId
    });
  }

  // Manejo de AppError personalizado
  if (err instanceof AppError) {
    const response = {
      success: false,
      message: err.message,
      errorCode: err.errorCode || 'ERROR',
      requestId: req.requestId
    };

    if (err.errors && err.errors.length > 0) {
      response.errors = err.errors;
    }

    // Si es error de validación, incluir detalles
    if (err instanceof ValidationError) {
      response.errors = err.errors;
    }

    return res.status(statusCode).json(response);
  }

  // Error genérico
  const response = {
    success: false,
    message: statusCode === 500 ? 'Error interno del servidor' : err.message || 'Error desconocido',
    errorCode,
    requestId: req.requestId
  };

  // Incluir stack trace en desarrollo
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

// Wrapper para funciones async en rutas
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
