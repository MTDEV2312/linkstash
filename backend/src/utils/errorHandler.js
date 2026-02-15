// Este archivo se mantiene por compatibilidad, pero ahora debe usar customErrors.js
export { 
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  errorHandler,
  asyncHandler
} from './customErrors.js';
