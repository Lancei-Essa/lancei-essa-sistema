const mongoose = require('mongoose');
const crypto = require('crypto');

const InstagramTokenSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  access_token: {
    type: String,
    required: true,
    select: false
  },
  refresh_token: {
    type: String, 
    select: false
  },
  expires_in: {
    type: Number
  },
  expiry_date: {
    type: Date
  },
  profile: {
    id: String,
    username: String,
    fullName: String,
    profile_picture: String
  },
  lastVerified: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'invalid', 'pending'],
    default: 'pending'
  },
  last_used: {
    type: Date,
    default: Date.now
  },
  last_refreshed: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Método para verificar se o token expirou
InstagramTokenSchema.methods.isExpired = function() {
  if (!this.expiry_date) return true;
  return new Date() > this.expiry_date;
};

// Criptografar tokens antes de salvar
InstagramTokenSchema.pre('save', async function(next) {
  try {
    // Só criptografar se modificados
    if (this.isModified('access_token')) {
      this.access_token = encryptToken(this.access_token);
    }
    
    if (this.isModified('refresh_token') && this.refresh_token) {
      this.refresh_token = encryptToken(this.refresh_token);
    }
    
    this.updatedAt = Date.now();
    next();
  } catch (error) {
    next(error);
  }
});

// Funções para criptografia de tokens
function encryptToken(token) {
  try {
    const algorithm = 'aes-256-ctr';
    const secretKey = process.env.TOKEN_ENCRYPTION_KEY;
    
    // Verificar se a chave de criptografia está definida
    if (!secretKey) {
      throw new Error('TOKEN_ENCRYPTION_KEY não está definida nas variáveis de ambiente');
    }
    
    const iv = crypto.randomBytes(16);
    const key = crypto.createHash('sha256').update(String(secretKey)).digest('base64').substring(0, 32);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const encrypted = Buffer.concat([cipher.update(token), cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  } catch (error) {
    console.error('Erro ao criptografar token:', error);
    throw new Error('Falha na criptografia do token. Verifique a configuração TOKEN_ENCRYPTION_KEY.');
  }
}

function decryptToken(hash) {
  try {
    const algorithm = 'aes-256-ctr';
    const secretKey = process.env.TOKEN_ENCRYPTION_KEY;
    
    // Verificar se a chave de criptografia está definida
    if (!secretKey) {
      throw new Error('TOKEN_ENCRYPTION_KEY não está definida nas variáveis de ambiente');
    }
    
    const [ivHex, encryptedHex] = hash.split(':');
    
    // Verificar se o token está no formato criptografado
    if (!ivHex || !encryptedHex) {
      throw new Error('Token em formato inválido');
    }
    
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.createHash('sha256').update(String(secretKey)).digest('base64').substring(0, 32);
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error('Erro ao descriptografar token:', error);
    throw new Error('Falha na descriptografia do token. Verifique a configuração TOKEN_ENCRYPTION_KEY.');
  }
}

// Método para obter tokens descriptografados
InstagramTokenSchema.methods.getDecryptedTokens = function() {
  return {
    access_token: decryptToken(this.access_token),
    refresh_token: this.refresh_token ? decryptToken(this.refresh_token) : null,
    expiry_date: this.expiry_date
  };
};

module.exports = mongoose.model('InstagramToken', InstagramTokenSchema);