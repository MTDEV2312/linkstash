import { getLogger } from '../utils/logger.js';

const logger = getLogger('ErrorHandler');

export class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_SERVER_ERROR', errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.errors = errors;
    this.timestamp = new Date().toISOString();
  }
}

export class ValidationError extends AppError {
  constructor(message, errors = []) { super(message, 400, 'VALIDATION_ERROR', errors); }
}
export class AuthenticationError extends AppError {
  constructor(message = 'Autenticación fallida') { super(message, 401, 'AUTHENTICATION_ERROR'); }
}
export class AuthorizationError extends AppError {
  constructor(message = 'No tienes permiso para acceder a este recurso') { super(message, 403, 'AUTHORIZATION_ERROR'); }
}
export class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado') { super(message, 404, 'NOT_FOUND'); }
}
export class ConflictError extends AppError {
  constructor(message = 'El recurso ya existe') { super(message, 409, 'CONFLICT'); }
}

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';

  if (statusCode >= 500) {
    logger.error(err.message || 'Error del servidor', err, { path: req.path, method: req.method });
  } else {
    logger.warn(err.message || 'Error de cliente', { path: req.path, method: req.method, statusCode });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'ID inválido', errorCode: 'INVALID_ID' });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'campo';
    return res.status(409).json({ success: false, message: `Ya existe un registro con este ${field}`, errorCode: 'DUPLICATE_ENTRY', field });
  }

  if (err.name === 'ValidationError' && !err.statusCode) {
    const errors = Object.values(err.errors || {}).map(e => ({ field: e.path, message: e.message }));
    return res.status(400).json({ success: false, message: 'Error de validación', errorCode: 'VALIDATION_ERROR', errors });
  }

  const response = {
    success: false,
    message: err.message || (statusCode === 500 ? 'Error interno del servidor' : 'Error'),
    errorCode
  };

  if (err.errors?.length > 0) {
    response.errors = err.errors;
  }

  res.status(statusCode).json(response);
};

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
