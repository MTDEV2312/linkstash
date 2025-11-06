import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const authMiddleware = async (req, res, next) => {
  try {
    // Obtener el token del header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Acceso denegado. Token no proporcionado.'
      });
    }

    // Extraer el token (quitar "Bearer ")
    const token = authHeader.slice(7);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Acceso denegado. Token no válido.'
      });
    }

    try {
      // Verificar el token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Buscar el usuario en la base de datos
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Token no válido. Usuario no encontrado.'
        });
      }

      // Agregar el usuario al objeto request
      req.user = user;
      next();

    } catch (jwtError) {
      console.error('Error de JWT:', jwtError.message);
      
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expirado. Por favor, inicia sesión nuevamente.'
        });
      }
      
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Token no válido.'
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Error de autenticación.'
      });
    }

  } catch (error) {
    console.error('Error en authMiddleware:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.'
    });
  }
};

// Middleware opcional - no falla si no hay token
const optionalAuth = async (req, res, next) => {
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
          // Silenciosamente ignorar errores de JWT en modo opcional
          console.log('Token opcional no válido:', jwtError.message);
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Error en optionalAuth:', error);
    next(); // Continuar sin autenticación
  }
};

export {
  authMiddleware,
  optionalAuth
};
