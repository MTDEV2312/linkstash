import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { AuthenticationError, asyncHandler } from '../utils/customErrors.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('AuthMiddleware');

const parseList = (value) => {
  if (!value) return [];
  return value.split(',').map(v => v.trim()).filter(Boolean);
};

const getJwtSecret = () => {
  return process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET;
};

export const authMiddleware = asyncHandler(async (req, res, next) => {
  // Extract token from header
  const authHeader = req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('Acceso denegado. Token no proporcionado.');
  }

  // Extract token string
  const token = authHeader.slice(7);

  if (!token) {
    throw new AuthenticationError('Acceso denegado. Token no válido.');
  }

  try {
    // Verify token locally
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret);
    
    const supabaseId = decoded.sub || decoded.userId || decoded.id;
    const email = decoded.email;

    let user = null;
    if (supabaseId) {
      user = await User.findOne({ supabaseId }).select('-password');
    }

    if (!user && supabaseId && mongoose.Types.ObjectId.isValid(supabaseId)) {
      user = await User.findById(supabaseId).select('-password');
    }

    if (!user && email) {
      user = await User.findOne({ email: email.toLowerCase() }).select('-password');
      if (user && supabaseId && !user.supabaseId) {
        user.supabaseId = supabaseId;
        await user.save();
      }
    }
    
    if (!user) {
      logger.warn('Usuario no encontrado para token', { supabaseId, email });
      throw new AuthenticationError('Token no válido. Usuario no encontrado.');
    }

    // Attach user to request object
    req.user = user;
    next();

  } catch (jwtError) {
    if (jwtError instanceof AuthenticationError) {
      throw jwtError;
    }

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

// Optional auth middleware - does not fail if no token provided
export const optionalAuth = asyncHandler(async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      
      if (token) {
        try {
          const secret = getJwtSecret();
          const decoded = jwt.verify(token, secret);
          const supabaseId = decoded.sub || decoded.userId || decoded.id;
          const email = decoded.email;

          let user = null;
          if (supabaseId) {
            user = await User.findOne({ supabaseId }).select('-password');
          }
          if (!user && supabaseId && mongoose.Types.ObjectId.isValid(supabaseId)) {
            user = await User.findById(supabaseId).select('-password');
          }
          if (!user && email) {
            user = await User.findOne({ email: email.toLowerCase() }).select('-password');
          }
          
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
    // In optional mode, ignore errors
    next();
  }
});

export const adminMiddleware = (req, res, next) => {
  const adminEmails = parseList(process.env.ADMIN_EMAILS).map(v => v.toLowerCase());
  const adminUserIds = parseList(process.env.ADMIN_USER_IDS);
  const userEmail = req.user?.email?.toLowerCase();
  const userId = req.user?.supabaseId || req.user?._id?.toString();

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

