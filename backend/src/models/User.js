import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  supabaseId: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  username: {
    type: String,
    required: [true, 'El nombre de usuario es obligatorio'],
    unique: true,
    trim: true,
    minlength: [3, 'El nombre de usuario debe tener al menos 3 caracteres'],
    maxlength: [20, 'El nombre de usuario no puede exceder 20 caracteres']
  },
  email: {
    type: String,
    required: [true, 'El email es obligatorio'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[A-Za-z0-9]+([.-][A-Za-z0-9]+)*@[A-Za-z0-9]+([.-][A-Za-z0-9]+)*\.[A-Za-z]{2,3}$/, 'Por favor ingresa un email válido']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      return ret;
    }
  }
});

userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

userSchema.methods.getPublicProfile = function() {
  return {
    id: this.supabaseId || this._id,
    supabaseId: this.supabaseId,
    username: this.username,
    email: this.email,
    createdAt: this.createdAt
  };
};

export default mongoose.model('User', userSchema);
