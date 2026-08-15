import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { supabaseAdmin } from '../config/supabase.js';
import { AuthenticationError, asyncHandler } from '../utils/customErrors.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('AuthMiddleware');

// Fast in-memory token cache (60s TTL) for microsecond auth lookup
const tokenCache = new Map();

const parseList = (value) => {
  if (!value) return [];
  return value.split(',').map(v => v.trim()).filter(Boolean);
};

const getJwtSecret = () => {
  return process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET;
};

export const authMiddleware = asyncHandler(async (req, res, next) => {
  const authHeader = req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('Acceso denegado. Token no proporcionado.');
  }

  const token = authHeader.slice(7);

  if (!token) {
    throw new AuthenticationError('Acceso denegado. Token no válido.');
  }

  const now = Date.now();

  // 1. Check in-memory fast token cache
  const cached = tokenCache.get(token);
  if (cached && cached.expiry > now && cached.user) {
    req.user = cached.user;
    return next();
  }

  let supabaseId = null;
  let email = null;

  // 2. Try local signature verification (for HS256 JWTs)
  try {
    const secret = getJwtSecret();
    if (secret) {
      const decoded = jwt.verify(token, secret);
      supabaseId = decoded.sub || decoded.userId || decoded.id;
      email = decoded.email;
    }
  } catch (_) {
    // Local verification failed or asymmetric RS256 algorithm, fall back to GoTrue Auth API
  }

  // 3. Fallback to Supabase GoTrue Auth API validation
  if (!supabaseId) {
    try {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && data?.user) {
        supabaseId = data.user.id;
        email = data.user.email;
      }
    } catch (apiError) {
      logger.warn('Supabase Auth getUser validation error', { error: apiError.message });
    }
  }

  if (!supabaseId) {
    throw new AuthenticationError('Token no válido o expirado. Inicia sesión nuevamente.');
  }

  // 4. Resolve user document in MongoDB
  let user = null;
  if (supabaseId) {
    user = await User.findOne({ supabaseId });
  }

  if (!user && supabaseId && mongoose.Types.ObjectId.isValid(supabaseId)) {
    user = await User.findById(supabaseId);
  }

  if (!user && email) {
    user = await User.findOne({ email: email.toLowerCase() });
    if (user && supabaseId && !user.supabaseId) {
      user.supabaseId = supabaseId;
      await user.save();
    }
  }
  
  if (!user) {
    logger.warn('Usuario no encontrado en MongoDB para token', { supabaseId, email });
    throw new AuthenticationError('Token no válido. Usuario no encontrado.');
  }

  // Cache user resolution for 60 seconds
  tokenCache.set(token, { user, expiry: now + 60000 });

  // Clean cache periodically
  if (tokenCache.size > 1000) {
    for (const [k, v] of tokenCache.entries()) {
      if (v.expiry <= now) tokenCache.delete(k);
    }
  }

  req.user = user;
  next();
});

// Optional auth middleware
export const optionalAuth = asyncHandler(async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      
      if (token) {
        const now = Date.now();
        const cached = tokenCache.get(token);
        if (cached && cached.expiry > now && cached.user) {
          req.user = cached.user;
          return next();
        }

        let supabaseId = null;
        let email = null;

        try {
          const secret = getJwtSecret();
          if (secret) {
            const decoded = jwt.verify(token, secret);
            supabaseId = decoded.sub || decoded.userId || decoded.id;
            email = decoded.email;
          }
        } catch (_) {}

        if (!supabaseId) {
          try {
            const { data } = await supabaseAdmin.auth.getUser(token);
            if (data?.user) {
              supabaseId = data.user.id;
              email = data.user.email;
            }
          } catch (_) {}
        }

        if (supabaseId) {
          let user = await User.findOne({ supabaseId });
          if (!user && email) {
            user = await User.findOne({ email: email.toLowerCase() });
          }
          if (user) {
            tokenCache.set(token, { user, expiry: now + 60000 });
            req.user = user;
          }
        }
      }
    }
  } catch (e) {
    logger.debug('optionalAuth error ignored', { error: e.message });
  }
  next();
});

// Admin-only middleware
export const adminMiddleware = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new AuthenticationError('Acceso denegado. Se requiere autenticación.');
  }

  const adminEmails = parseList(process.env.ADMIN_EMAILS);
  const adminUserIds = parseList(process.env.ADMIN_USER_IDS);

  const email = (req.user.email || '').toLowerCase();
  const userId = req.user._id ? req.user._id.toString() : '';
  const supabaseId = req.user.supabaseId || '';

  const isEmailAdmin = email && adminEmails.includes(email);
  const isIdAdmin = (userId && adminUserIds.includes(userId)) || (supabaseId && adminUserIds.includes(supabaseId));

  if (!isEmailAdmin && !isIdAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de administrador.'
    });
  }

  next();
});
