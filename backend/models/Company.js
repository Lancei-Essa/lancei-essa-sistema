const mongoose = require('mongoose');
const crypto = require('crypto');

const CompanySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  website: {
    type: String
  },
  logo: {
    type: String
  },
  users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  oauthCredentials: {
    youtube: {
      client_id: { 
        type: String, 
        select: false
      },
      client_secret: { 
        type: String, 
        select: false 
      },
      redirect_uri: String,
      enabled: { 
        type: Boolean, 
        default: false 
      }
    },
    twitter: {
      api_key: { 
        type: String, 
        select: false 
      },
      api_secret: { 
        type: String, 
        select: false 
      },
      redirect_uri: String,
      enabled: { 
        type: Boolean, 
        default: false 
      }
    },
    linkedin: {
      client_id: { 
        type: String, 
        select: false 
      },
      client_secret: { 
        type: String, 
        select: false 
      },
      redirect_uri: String,
      enabled: { 
        type: Boolean, 
        default: false 
      }
    },
    instagram: {
      client_id: { 
        type: String, 
        select: false 
      },
      client_secret: { 
        type: String, 
        select: false 
      },
      redirect_uri: String,
      enabled: { 
        type: Boolean, 
        default: false 
      }
    },
    spotify: {
      client_id: { 
        type: String, 
        select: false 
      },
      client_secret: { 
        type: String, 
        select: false 
      },
      redirect_uri: String,
      enabled: { 
        type: Boolean, 
        default: false 
      }
    },
    tiktok: {
      client_key: { 
        type: String, 
        select: false 
      },
      client_secret: { 
        type: String, 
        select: false 
      },
      redirect_uri: String,
      enabled: { 
        type: Boolean, 
        default: false 
      }
    }
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

// Criptografar e descriptografar funções para campos sensíveis
const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || 'chave_segura_de_32_caracteres_12345';
const ALGORITHM = 'aes-256-cbc';

// Métodos para manipular credenciais criptografadas
CompanySchema.methods.encryptCredential = function(text) {
  if (!text) return null;
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

CompanySchema.methods.decryptCredential = function(text) {
  if (!text) return null;
  
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};

// Middleware para criptografar campos sensíveis antes de salvar
CompanySchema.pre('save', async function(next) {
  // Não modificar se as credenciais não foram alteradas
  if (!this.isModified('oauthCredentials')) {
    return next();
  }
  
  // YouTube
  if (this.oauthCredentials.youtube && this.isModified('oauthCredentials.youtube.client_id')) {
    this.oauthCredentials.youtube.client_id = this.encryptCredential(this.oauthCredentials.youtube.client_id);
  }
  if (this.oauthCredentials.youtube && this.isModified('oauthCredentials.youtube.client_secret')) {
    this.oauthCredentials.youtube.client_secret = this.encryptCredential(this.oauthCredentials.youtube.client_secret);
  }
  
  // Twitter
  if (this.oauthCredentials.twitter && this.isModified('oauthCredentials.twitter.api_key')) {
    this.oauthCredentials.twitter.api_key = this.encryptCredential(this.oauthCredentials.twitter.api_key);
  }
  if (this.oauthCredentials.twitter && this.isModified('oauthCredentials.twitter.api_secret')) {
    this.oauthCredentials.twitter.api_secret = this.encryptCredential(this.oauthCredentials.twitter.api_secret);
  }
  
  // LinkedIn
  if (this.oauthCredentials.linkedin && this.isModified('oauthCredentials.linkedin.client_id')) {
    this.oauthCredentials.linkedin.client_id = this.encryptCredential(this.oauthCredentials.linkedin.client_id);
  }
  if (this.oauthCredentials.linkedin && this.isModified('oauthCredentials.linkedin.client_secret')) {
    this.oauthCredentials.linkedin.client_secret = this.encryptCredential(this.oauthCredentials.linkedin.client_secret);
  }
  
  // Repetir para outras plataformas...
  
  // Atualizar timestamp
  this.updatedAt = Date.now();
  
  next();
});

// Método para obter credenciais descriptografadas de uma plataforma
CompanySchema.methods.getPlatformCredentials = function(platform) {
  if (!this.oauthCredentials || !this.oauthCredentials[platform]) {
    return null;
  }
  
  const credentials = {...this.oauthCredentials[platform]};
  
  // Descriptografar campos sensíveis
  switch (platform) {
    case 'youtube':
      if (credentials.client_id) credentials.client_id = this.decryptCredential(credentials.client_id);
      if (credentials.client_secret) credentials.client_secret = this.decryptCredential(credentials.client_secret);
      break;
    case 'twitter':
      if (credentials.api_key) credentials.api_key = this.decryptCredential(credentials.api_key);
      if (credentials.api_secret) credentials.api_secret = this.decryptCredential(credentials.api_secret);
      break;
    case 'linkedin':
      if (credentials.client_id) credentials.client_id = this.decryptCredential(credentials.client_id);
      if (credentials.client_secret) credentials.client_secret = this.decryptCredential(credentials.client_secret);
      break;
    // Repetir para outras plataformas...
  }
  
  return credentials;
};

module.exports = mongoose.models.Company || mongoose.model('Company', CompanySchema);