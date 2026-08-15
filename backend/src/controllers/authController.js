import { supabase, supabaseAdmin } from '../config/supabase.js';
import User from '../models/User.js';
import { AuthenticationError, ConflictError, NotFoundError, asyncHandler, ValidationError } from '../utils/customErrors.js';
import { getLogger } from '../utils/logger.js';
import { UserDTO, AuthResponseDTO, ApiResponseDTO } from '../dtos/index.js';

const logger = getLogger('AuthController');

// @desc    Register new user via Supabase Auth and sync to MongoDB
// @route   POST /api/auth/register
// @access  Public
export const register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  // Check if user already exists in MongoDB
  const existingUser = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }]
  });

  if (existingUser) {
    const field = existingUser.email === email.toLowerCase() ? 'email' : 'username';
    throw new ConflictError(`Ya existe un usuario con este ${field}`);
  }

  // Register user in Supabase Auth (GoTrue)
  const { data, error } = await supabase.auth.signUp({
    email: email.toLowerCase(),
    password,
    options: {
      data: {
        username: username.trim()
      }
    }
  });

  if (error || !data.user) {
    logger.error('Error al registrar usuario en Supabase Auth', { error: error?.message, email });
    throw new ValidationError(error?.message || 'Error al registrar usuario en Supabase Auth');
  }

  const supabaseId = data.user.id;

  // Create corresponding user profile in MongoDB
  const user = new User({
    supabaseId,
    username: username.trim(),
    email: email.toLowerCase(),
    password
  });

  await user.save();

  // Retrieve session access token from sign up or sign in
  let token = data.session?.access_token;
  if (!token) {
    const signInRes = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password
    });
    token = signInRes.data?.session?.access_token || '';
  }

  logger.info(`Usuario registrado exitosamente: ${username}`, { supabaseId });

  const authResponse = new AuthResponseDTO(token, user);

  res.status(201).json(
    new ApiResponseDTO(true, 'Usuario registrado exitosamente', authResponse.toJSON())
  );
});

// @desc    User login via Supabase Auth
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Authenticate credentials via Supabase GoTrue
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase(),
    password
  });

  if (error || !data.session || !data.user) {
    logger.warn('Intento de login fallido en Supabase Auth', { email, ip: req.ip, error: error?.message });
    throw new AuthenticationError('Credenciales inválidas');
  }

  const token = data.session.access_token;
  const supabaseId = data.user.id;

  // Search user in MongoDB by supabaseId or email
  let user = await User.findOne({ supabaseId });

  if (!user) {
    user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      user.supabaseId = supabaseId;
      await user.save();
    } else {
      // Provision MongoDB user document if absent
      const username = data.user.user_metadata?.username || email.split('@')[0];
      user = new User({
        supabaseId,
        username,
        email: email.toLowerCase()
      });
      await user.save();
    }
  }

  logger.info(`Usuario autenticado: ${user.username}`, { supabaseId });

  const authResponse = new AuthResponseDTO(token, user);

  res.json(
    new ApiResponseDTO(true, 'Inicio de sesión exitoso', authResponse.toJSON())
  );
});

// @desc    Get current user profile
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

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = asyncHandler(async (req, res) => {
  const { username, email } = req.body;
  const mongoUserId = req.user._id;
  const supabaseId = req.user.supabaseId;

  const user = await User.findById(mongoUserId);
  
  if (!user) {
    throw new NotFoundError('Usuario no encontrado');
  }

  const updates = {};

  // Check if new username is taken
  if (username && username !== user.username) {
    const existingUsername = await User.findOne({ 
      username: username.toLowerCase(),
      _id: { $ne: mongoUserId }
    });
    if (existingUsername) {
      throw new ConflictError('Este nombre de usuario ya está en uso');
    }
    updates.username = username.trim();
  }

  // Check if new email is taken
  if (email && email.toLowerCase() !== user.email) {
    const existingEmail = await User.findOne({ 
      email: email.toLowerCase(),
      _id: { $ne: mongoUserId }
    });
    if (existingEmail) {
      throw new ConflictError('Este email ya está en uso');
    }
    updates.email = email.toLowerCase();

    // Update email in Supabase Auth if supabaseId is set
    if (supabaseId) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(supabaseId, {
          email: email.toLowerCase()
        });
      } catch (err) {
        logger.warn('No se pudo actualizar el email en Supabase Auth', { error: err.message, supabaseId });
      }
    }
  }

  // Update user in MongoDB
  const updatedUser = await User.findByIdAndUpdate(mongoUserId, updates, { 
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

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const mongoUserId = req.user._id;
  const supabaseId = req.user.supabaseId;

  const user = await User.findById(mongoUserId).select('+password');
  
  if (!user) {
    throw new NotFoundError('Usuario no encontrado');
  }

  // If password exists on MongoDB user, verify current password
  if (user.password) {
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      logger.warn('Intento de cambio de password fallido - contraseña incorrecta', { mongoUserId });
      throw new AuthenticationError('La contraseña actual es incorrecta');
    }
  } else {
    // Verify via Supabase Auth
    const { error: verifyErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword
    });
    if (verifyErr) {
      throw new AuthenticationError('La contraseña actual es incorrecta');
    }
  }

  // Update password in Supabase Auth if supabaseId is set
  if (supabaseId) {
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(supabaseId, {
      password: newPassword
    });
    if (updateErr) {
      logger.error('Error al actualizar contraseña en Supabase Auth', { error: updateErr.message, supabaseId });
      throw new ValidationError('Error al actualizar la contraseña en Supabase Auth');
    }
  }

  if (user.password) {
    user.password = newPassword;
    await user.save();
  }

  logger.info(`Contraseña cambiada: ${user.username}`);

  res.json(
    new ApiResponseDTO(true, 'Contraseña actualizada exitosamente')
  );
});

