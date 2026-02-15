import express from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
  changePassword
} from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { validateSchema, validateQuery, authSchemas } from '../validators/schemas.js';

const router = express.Router();

// Rutas públicas
router.post('/register', validateSchema(authSchemas.register), register);
router.post('/login', validateSchema(authSchemas.login), login);

// Rutas protegidas
router.get('/me', authMiddleware, getMe);
router.put('/profile', authMiddleware, validateSchema(authSchemas.updateProfile), updateProfile);
router.put('/change-password', authMiddleware, validateSchema(authSchemas.changePassword), changePassword);

export default router;
