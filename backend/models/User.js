const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'editor', 'viewer'],
    default: 'viewer'
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  socialConnections: {
    youtube: {
      connected: { type: Boolean, default: false },
      lastConnected: Date
    },
    instagram: {
      connected: { type: Boolean, default: false },
      lastConnected: Date
    },
    twitter: {
      connected: { type: Boolean, default: false },
      lastConnected: Date
    },
    linkedin: {
      connected: { type: Boolean, default: false },
      lastConnected: Date
    },
    spotify: {
      connected: { type: Boolean, default: false },
      lastConnected: Date
    },
    tiktok: {
      connected: { type: Boolean, default: false },
      lastConnected: Date
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash da senha antes de salvar
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Método para verificar senha
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Verificar se o modelo já existe antes de compilá-lo
module.exports = mongoose.models.User || mongoose.model('User', UserSchema);