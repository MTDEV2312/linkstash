import mongoose from 'mongoose';

const tagSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El ID del usuario es obligatorio']
  },
  name: {
    type: String,
    required: [true, 'El nombre de la etiqueta es obligatorio'],
    trim: true,
    lowercase: true,
    minlength: [2, 'El nombre de la etiqueta debe tener al menos 2 caracteres'],
    maxlength: [30, 'El nombre de la etiqueta no puede exceder 30 caracteres'],
    match: [/^[a-zA-Z0-9\s-_.]+$/, 'El nombre de la etiqueta solo puede contener letras, números, espacios, guiones y puntos']
  },
  color: {
    type: String,
    default: '#3B82F6', // Azul por defecto
    match: [/^#[0-9A-Fa-f]{6}$/, 'El color debe ser un código hexadecimal válido']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [100, 'La descripción no puede exceder 100 caracteres'],
    default: ''
  },
  linkCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índices para mejorar el rendimiento
tagSchema.index({ userId: 1, name: 1 }, { unique: true }); // No duplicar nombres por usuario
tagSchema.index({ userId: 1, createdAt: -1 });

// Middleware para normalizar el nombre antes de guardar
tagSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    // Normalizar espacios múltiples a uno solo
    this.name = this.name.replace(/\s+/g, ' ').trim();
  }
  next();
});

// Método para incrementar el contador de enlaces
tagSchema.methods.incrementLinkCount = function() {
  this.linkCount += 1;
  return this.save();
};

// Método para decrementar el contador de enlaces
tagSchema.methods.decrementLinkCount = function() {
  if (this.linkCount > 0) {
    this.linkCount -= 1;
  }
  return this.save();
};

// Método estático para obtener etiquetas populares
tagSchema.statics.getPopularTags = function(userId, limit = 10) {
  return this.find({ userId })
    .sort({ linkCount: -1 })
    .limit(limit)
    .exec();
};

// Método estático para buscar etiquetas
tagSchema.statics.searchTags = function(userId, query) {
  const searchCriteria = { userId };
  
  if (query) {
    searchCriteria.name = { $regex: query, $options: 'i' };
  }
  
  return this.find(searchCriteria)
    .sort({ name: 1 })
    .exec();
};

// Método para obtener información completa de la etiqueta
tagSchema.methods.getFullInfo = function() {
  return {
    id: this._id,
    name: this.name,
    color: this.color,
    description: this.description,
    linkCount: this.linkCount,
    createdAt: this.createdAt
  };
};

export default mongoose.model('Tag', tagSchema);
