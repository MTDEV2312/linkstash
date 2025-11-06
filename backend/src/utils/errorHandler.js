// Middleware de manejo de errores centralizado
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log del error
  console.error('🚨 Error:', err);

  // Error de Cast de MongoDB (ID inválido)
  if (err.name === 'CastError') {
    const message = 'Recurso no encontrado';
    error = { message, statusCode: 404 };
  }

  // Error de duplicado de MongoDB
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `Ya existe un registro con este ${field}`;
    error = { message, statusCode: 400 };
  }

  // Error de validación de MongoDB
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // Error de JWT
  if (err.name === 'JsonWebTokenError') {
    const message = 'Token no válido';
    error = { message, statusCode: 401 };
  }

  // Error de JWT expirado
  if (err.name === 'TokenExpiredError') {
    const message = 'Token expirado';
    error = { message, statusCode: 401 };
  }

  // Error de conexión a la base de datos
  if (err.name === 'MongoNetworkError') {
    const message = 'Error de conexión a la base de datos';
    error = { message, statusCode: 503 };
  }

  // Error de límite de tamaño de payload
  if (err.type === 'entity.too.large') {
    const message = 'El archivo es demasiado grande';
    error = { message, statusCode: 413 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

export default errorHandler;
