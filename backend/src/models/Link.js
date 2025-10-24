import mongoose from 'mongoose';

const linkSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El ID del usuario es obligatorio']
  },
  url: {
    type: String,
    required: [true, 'La URL es obligatoria'],
    trim: true,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Por favor ingresa una URL válida (debe empezar con http:// o https://)'
    }
  },
  title: {
    type: String,
    required: [true, 'El título es obligatorio'],
    trim: true,
    maxlength: [200, 'El título no puede exceder 200 caracteres']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'La descripción no puede exceder 500 caracteres'],
    default: ''
  },
  image: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Campo opcional
        return /^https?:\/\/.+/i.test(v); // Solo valida que sea una URL
      },
      message: 'Debe ser una URL válida.'
    },
    default: ''
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [30, 'Cada etiqueta no puede exceder 30 caracteres']
  }],
  isArchived: {
    type: Boolean,
    default: false
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  clickCount: {
    type: Number,
    default: 0
  },
  lastVisited: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índices para mejorar el rendimiento
linkSchema.index({ userId: 1, createdAt: -1 });
linkSchema.index({ userId: 1, tags: 1 });
linkSchema.index({ userId: 1, title: 'text', description: 'text' });
linkSchema.index({ userId: 1, isFavorite: 1 });
linkSchema.index({ userId: 1, isArchived: 1 });

// Middleware para validar que no se dupliquen URLs por usuario
linkSchema.index({ userId: 1, url: 1 }, { unique: true });

// Método para incrementar el contador de clics
linkSchema.methods.incrementClickCount = function() {
  this.clickCount += 1;
  this.lastVisited = new Date();
  return this.save();
};

// Método para alternar favorito
linkSchema.methods.toggleFavorite = function() {
  this.isFavorite = !this.isFavorite;
  return this.save();
};

// Método para archivar/desarchivar
linkSchema.methods.toggleArchive = function() {
  this.isArchived = !this.isArchived;
  return this.save();
};

// Método estático para buscar enlaces
linkSchema.statics.searchLinks = function(userId, query, options = {}) {
  const {
    tags = [],
    isArchived = false,
    isFavorite = null,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = -1
  } = options;

  const searchCriteria = {
    userId,
    isArchived
  };

  // Filtro de texto en título y descripción
  if (query) {
    searchCriteria.$text = { $search: query };
  }

  // Filtro por etiquetas
  if (tags.length > 0) {
    searchCriteria.tags = { $in: tags };
  }

  // Filtro por favoritos
  if (isFavorite !== null) {
    searchCriteria.isFavorite = isFavorite;
  }

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder };

  return this.find(searchCriteria)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .exec();
};

export default mongoose.model('Link', linkSchema);
