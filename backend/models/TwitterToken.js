const mongoose = require('mongoose');
const crypto = require('crypto');

const TwitterTokenSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Suporte para ambos OAuth 1.0a e OAuth 2.0
  // OAuth 1.0a
  oauth_token: {
    type: String,
    select: false
  },
  oauth_token_secret: {
    type: String,
    select: false
  },
  // OAuth 2.0
  access_token: {
    type: String,
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
  token_type: {
    type: String,
    enum: ['oauth1', 'oauth2'],
    default: 'oauth2'
  },
  scope: {
    type: String
  },
  profile: {
    id: String,
    username: String,
    name: String,
    profile_image_url: String,
    verified: Boolean,
    follower_count: Number,
    following_count: Number,
    tweet_count: Number,
    description: String
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

// Método para verificar se o token expirou (OAuth 2.0)
TwitterTokenSchema.methods.isExpired = function() {
  if (this.token_type === 'oauth1') return false; // OAuth 1.0a tokens não expiram
  if (!this.expiry_date) return true;
  return new Date() > this.expiry_date;
};

// Criptografar tokens antes de salvar
TwitterTokenSchema.pre('save', async function(next) {
  try {
    // Só criptografar se modificados
    if (this.isModified('access_token') && this.access_token) {
      this.access_token = encryptToken(this.access_token);
    }
    
    if (this.isModified('refresh_token') && this.refresh_token) {
      this.refresh_token = encryptToken(this.refresh_token);
    }
    
    if (this.isModified('oauth_token') && this.oauth_token) {
      this.oauth_token = encryptToken(this.oauth_token);
    }
    
    if (this.isModified('oauth_token_secret') && this.oauth_token_secret) {
      this.oauth_token_secret = encryptToken(this.oauth_token_secret);
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
TwitterTokenSchema.methods.getDecryptedTokens = function() {
  if (this.token_type === 'oauth2') {
    return {
      access_token: this.access_token ? decryptToken(this.access_token) : null,
      refresh_token: this.refresh_token ? decryptToken(this.refresh_token) : null,
      expiry_date: this.expiry_date
    };
  } else {
    return {
      oauth_token: this.oauth_token ? decryptToken(this.oauth_token) : null,
      oauth_token_secret: this.oauth_token_secret ? decryptToken(this.oauth_token_secret) : null
    };
  }
};

module.exports = mongoose.model('TwitterToken', TwitterTokenSchema);