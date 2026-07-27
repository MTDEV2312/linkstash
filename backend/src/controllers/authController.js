import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { AuthenticationError, ConflictError, NotFoundError, asyncHandler, ValidationError } from '../utils/customErrors.js';
import { getLogger } from '../utils/logger.js';
import { UserDTO, AuthResponseDTO, ApiResponseDTO } from '../dtos/index.js';

const logger = getLogger('AuthController');

// Generar JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

// @desc    Registrar nuevo usuario
// @route   POST /api/auth/register
// @access  Public
export const register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  // Verificar si el usuario ya existe
  const existingUser = await User.findOne({
    $or: [{ email: { $eq: email.toLowerCase() } }, { username: { $eq: username.toLowerCase() } }]
  });

  if (existingUser) {
    const field = existingUser.email === email.toLowerCase() ? 'email' : 'username';
    throw new ConflictError(`Ya existe un usuario con este ${field}`);
  }

  // Crear nuevo usuario
  const user = new User({
    username: username.trim(),
    email: email.toLowerCase(),
    password
  });

  await user.save();

  // Generar token
  const token = generateToken(user._id);

  logger.info(`Usuario registrado exitosamente: ${username}`);

  const authResponse = new AuthResponseDTO(token, user);

  res.status(201).json(
    new ApiResponseDTO(true, 'Usuario registrado exitosamente', authResponse.toJSON())
  );
});

// @desc    Iniciar sesión
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Buscar usuario por email (case-insensitive)
  const user = await User.findOne({ email: { $eq: email.toLowerCase() } });
  
  if (!user) {
    // No revelar si el usuario existe o no (por seguridad)
    throw new AuthenticationError('Credenciales inválidas');
  }

  // Verificar contraseña
  const isPasswordValid = await user.comparePassword(password);
  
  if (!isPasswordValid) {
    logger.warn('Intento de login fallido', { email, ip: req.ip });
    throw new AuthenticationError('Credenciales inválidas');
  }

  // Generar token
  const token = generateToken(user._id);

  logger.info(`Usuario autenticado: ${user.username}`);

  const authResponse = new AuthResponseDTO(token, user);

  res.json(
    new ApiResponseDTO(true, 'Inicio de sesión exitoso', authResponse.toJSON())
  );
});

// @desc    Obtener perfil del usuario actual
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req, res) => {
  const user = req.user;

  res.json(
    new ApiResponseDTO(true, 'Perfil obtenido', {
      user: new UserDTO(user)
    })
  );
});

// @desc    Actualizar perfil del usuario
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = asyncHandler(async (req, res) => {
  const { username, email } = req.body;
  const userId = req.user._id;

  // Buscar el usuario
  const user = await User.findById(userId);
  
  if (!user) {
    throw new NotFoundError('Usuario no encontrado');
  }

  const updates = {};

  // Verificar si el nuevo username ya está en uso
  if (username && username !== user.username) {
    const existingUsername = await User.findOne({ 
      username: { $eq: username.toLowerCase() },
      _id: { $ne: userId }
    });
    if (existingUsername) {
      throw new ConflictError('Este nombre de usuario ya está en uso');
    }
    updates.username = username.trim();
  }

  // Verificar si el nuevo email ya está en uso
  if (email && email.toLowerCase() !== user.email) {
    const existingEmail = await User.findOne({ 
      email: { $eq: email.toLowerCase() },
      _id: { $ne: userId }
    });
    if (existingEmail) {
      throw new ConflictError('Este email ya está en uso');
    }
    updates.email = email.toLowerCase();
  }

  // Actualizar usuario
  const updatedUser = await User.findByIdAndUpdate(userId, updates, { 
    new: true,
    runValidators: true 
  });

  logger.info(`Perfil actualizado: ${updatedUser.username}`);

  res.json(
    new ApiResponseDTO(true, 'Perfil actualizado exitosamente', {
      user: new UserDTO(updatedUser)
    })
  );
});

// @desc    Cambiar contraseña
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user._id;

  // Buscar el usuario con la contraseña
  const user = await User.findById(userId).select('+password');
  
  if (!user) {
    throw new NotFoundError('Usuario no encontrado');
  }

  // Verificar contraseña actual
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  
  if (!isCurrentPasswordValid) {
    logger.warn('Intento de cambio de password fallido - contraseña incorrecta', { userId });
    throw new AuthenticationError('La contraseña actual es incorrecta');
  }

  // Actualizar contraseña
  user.password = newPassword;
  await user.save();

  logger.info(`Contraseña cambiada: ${user.username}`);

  res.json(
    new ApiResponseDTO(true, 'Contraseña actualizada exitosamente')
  );
});
