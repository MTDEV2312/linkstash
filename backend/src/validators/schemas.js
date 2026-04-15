import Joi from 'joi';

// ==================== AUTH VALIDATORS ====================
export const authSchemas = {
  // Registro de usuario
  register: Joi.object({
    username: Joi.string()
      .alphanum()
      .min(3)
      .max(20)
      .required()
      .messages({
        'string.alphanum': 'El nombre de usuario solo puede contener letras y números',
        'string.min': 'El nombre de usuario debe tener al menos 3 caracteres',
        'string.max': 'El nombre de usuario no puede exceder 20 caracteres',
        'any.required': 'El nombre de usuario es obligatorio'
      }),
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Debes proporcionar un email válido',
        'any.required': 'El email es obligatorio'
      }),
    password: Joi.string()
      .min(6)
      .max(50)
      .required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/)
      .messages({
        'string.min': 'La contraseña debe tener al menos 6 caracteres',
        'string.pattern.base': 'La contraseña debe contener mayúsculas, minúsculas, números y caracteres especiales',
        'any.required': 'La contraseña es obligatoria'
      })
  }).strict(),

  // Login
  login: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Debes proporcionar un email válido',
        'any.required': 'El email es obligatorio'
      }),
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'La contraseña es obligatoria'
      })
  }).strict(),

  // Actualizar perfil
  updateProfile: Joi.object({
    username: Joi.string()
      .alphanum()
      .min(3)
      .max(20)
      .optional()
      .messages({
        'string.alphanum': 'El nombre de usuario solo puede contener letras y números',
        'string.min': 'El nombre de usuario debe tener al menos 3 caracteres',
        'string.max': 'El nombre de usuario no puede exceder 20 caracteres'
      }),
    email: Joi.string()
      .email()
      .optional()
      .messages({
        'string.email': 'Debes proporcionar un email válido'
      })
  }).strict(),

  // Cambiar contraseña
  changePassword: Joi.object({
    currentPassword: Joi.string()
      .required()
      .messages({
        'any.required': 'La contraseña actual es obligatoria'
      }),
    newPassword: Joi.string()
      .min(6)
      .max(50)
      .required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/)
      .invalid(Joi.ref('currentPassword'))
      .messages({
        'string.min': 'La nueva contraseña debe tener al menos 6 caracteres',
        'string.pattern.base': 'La contraseña debe contener mayúsculas, minúsculas, números y caracteres especiales',
        'any.invalid': 'La nueva contraseña no puede ser igual a la actual',
        'any.required': 'La nueva contraseña es obligatoria'
      })
  }).strict()
};

// ==================== LINKS VALIDATORS ====================
export const linkSchemas = {
  // Guardar enlace
  saveLink: Joi.object({
    url: Joi.string()
      .uri()
      .required()
      .messages({
        'string.uri': 'La URL debe ser válida',
        'any.required': 'La URL es obligatoria'
      }),
    title: Joi.string()
      .trim()
      .max(200)
      .optional()
      .messages({
        'string.max': 'El título no puede exceder 200 caracteres'
      }),
    description: Joi.string()
      .trim()
      .max(500)
      .optional()
      .messages({
        'string.max': 'La descripción no puede exceder 500 caracteres'
      }),
    tags: Joi.array()
      .items(
        Joi.string()
          .trim()
          .lowercase()
          .max(30)
          .pattern(/^[a-záéíóúñüa-z0-9\-_]+$/)
          .messages({
            'string.pattern.base': 'Las etiquetas solo pueden contener letras, números, guiones y guiones bajos',
            'string.max': 'Cada etiqueta no puede exceder 30 caracteres'
          })
      )
      .max(10)
      .default([])
      .messages({
        'array.max': 'No puedes tener más de 10 etiquetas por enlace'
      })
  }).strict(),

  // Actualizar enlace
  updateLink: Joi.object({
    title: Joi.string()
      .trim()
      .max(200)
      .optional()
      .messages({
        'string.max': 'El título no puede exceder 200 caracteres'
      }),
    description: Joi.string()
      .trim()
      .max(500)
      .optional()
      .messages({
        'string.max': 'La descripción no puede exceder 500 caracteres'
      }),
    tags: Joi.array()
      .items(
        Joi.string()
          .trim()
          .lowercase()
          .max(30)
      )
      .max(10)
      .optional()
      .messages({
        'array.max': 'No puedes tener más de 10 etiquetas por enlace'
      }),
    isFavorite: Joi.boolean().optional(),
    isArchived: Joi.boolean().optional()
  }).strict(),

  // Parámetros de búsqueda
  getLinks: Joi.object({
    page: Joi.number()
      .integer()
      .min(1)
      .default(1)
      .messages({
        'number.min': 'El número de página debe ser al menos 1'
      }),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(5)
      .default(5)
      .messages({
        'number.max': 'El límite no puede exceder 5 elementos'
      }),
    search: Joi.string()
      .trim()
      .max(100)
      .optional(),
    tags: Joi.string()
      .trim()
      .optional(),
    archived: Joi.string()
      .valid('true', 'false')
      .default('false'),
    favorite: Joi.string()
      .valid('true', 'false', '')
      .default(''),
    sortBy: Joi.string()
      .valid('createdAt', 'title', 'lastVisited', 'clickCount')
      .default('createdAt')
      .messages({
        'any.only': 'El campo de orden debe ser: createdAt, title, lastVisited o clickCount'
      }),
    sortOrder: Joi.string()
      .valid('asc', 'desc')
      .default('desc')
  }).strict()
};

// ==================== TAGS VALIDATORS ====================
export const tagSchemas = {
  // Crear etiqueta
  createTag: Joi.object({
    name: Joi.string()
      .trim()
      .lowercase()
      .min(2)
      .max(30)
      .required()
      .pattern(/^[a-záéíóúñüa-z0-9\s\-_.]+$/)
      .messages({
        'string.pattern.base': 'La etiqueta contiene caracteres no permitidos',
        'string.min': 'El nombre de la etiqueta debe tener al menos 2 caracteres',
        'string.max': 'El nombre de la etiqueta no puede exceder 30 caracteres',
        'any.required': 'El nombre de la etiqueta es obligatorio'
      }),
    color: Joi.string()
      .pattern(/^#[0-9A-Fa-f]{6}$/)
      .optional()
      .default('#3B82F6')
      .messages({
        'string.pattern.base': 'El color debe ser un código hexadecimal válido (#RRGGBB)'
      }),
    description: Joi.string()
      .trim()
      .max(100)
      .optional()
      .messages({
        'string.max': 'La descripción no puede exceder 100 caracteres'
      })
  }).strict(),

  // Actualizar etiqueta
  updateTag: Joi.object({
    name: Joi.string()
      .trim()
      .lowercase()
      .min(2)
      .max(30)
      .optional()
      .pattern(/^[a-záéíóúñüa-z0-9\s\-_.]+$/)
      .messages({
        'string.pattern.base': 'La etiqueta contiene caracteres no permitidos'
      }),
    color: Joi.string()
      .pattern(/^#[0-9A-Fa-f]{6}$/)
      .optional()
      .messages({
        'string.pattern.base': 'El color debe ser un código hexadecimal válido'
      }),
    description: Joi.string()
      .trim()
      .max(100)
      .optional()
  }).strict()
};

// ==================== VALIDATION HELPER ====================
export const validateSchema = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const messages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Validación fallida',
        errors: messages
      });
    }

    // Reemplazar el body con los valores validados y sanitizados
    req.body = value;
    next();
  };
};

// Validador para query parameters
export const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const messages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Parámetros de consulta inválidos',
        errors: messages
      });
    }

    // Reemplazar los query params con los valores validados
    req.query = value;
    next();
  };
};
