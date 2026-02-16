import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { AuthenticationError, asyncHandler } from '../utils/customErrors.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('AuthMiddleware');

const parseList = (value) => {
  if (!value) return [];
  return value.split(',').map(v => v.trim()).filter(Boolean);
};

export const authMiddleware = asyncHandler(async (req, res, next) => {
  // Obtener el token del header
  const authHeader = req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('Acceso denegado. Token no proporcionado.');
  }

  // Extraer el token (quitar "Bearer ")
  const token = authHeader.slice(7);

  if (!token) {
    throw new AuthenticationError('Acceso denegado. Token no válido.');
  }

  try {
    // Verificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar el usuario en la base de datos
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      logger.warn('Usuario no encontrado para token', { userId: decoded.userId });
      throw new AuthenticationError('Token no válido. Usuario no encontrado.');
    }

    // Agregar el usuario al objeto request
    req.user = user;
    next();

  } catch (jwtError) {
    logger.warn('Error de JWT', { code: jwtError.name, message: jwtError.message });
    
    if (jwtError.name === 'TokenExpiredError') {
      throw new AuthenticationError('Token expirado. Por favor, inicia sesión nuevamente.');
    }
    
    if (jwtError.name === 'JsonWebTokenError') {
      throw new AuthenticationError('Token no válido.');
    }

    throw jwtError;
  }
});

// Middleware opcional - no falla si no hay token
export const optionalAuth = asyncHandler(async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const user = await User.findById(decoded.userId).select('-password');
          
          if (user) {
            req.user = user;
          }
        } catch (jwtError) {
          logger.debug('Token opcional no válido', { message: jwtError.message });
        }
      }
    }
    
    next();
  } catch (error) {
    // En modo opcional, ignorar errores
    next();
  }
});

export const adminMiddleware = (req, res, next) => {
  const adminEmails = parseList(process.env.ADMIN_EMAILS).map(v => v.toLowerCase());
  const adminUserIds = parseList(process.env.ADMIN_USER_IDS);
  const userEmail = req.user?.email?.toLowerCase();
  const userId = req.user?._id?.toString();

  const isAdminByEmail = userEmail && adminEmails.includes(userEmail);
  const isAdminById = userId && adminUserIds.includes(userId);

  if (isAdminByEmail || isAdminById) {
    return next();
  }

  logger.warn('Acceso admin denegado', {
    userId,
    email: userEmail
  });

  return res.status(403).json({
    success: false,
    message: 'Acceso denegado. Requiere permisos de administrador.',
    errorCode: 'ADMIN_ONLY',
    requestId: req.requestId
  });
};

export default authMiddleware;
