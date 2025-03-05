/**
 * Utilidades para padronizar a criptografia e manipulação de tokens em todo o sistema
 */
const crypto = require('crypto');

/**
 * Criptografa um token usando AES-256-CTR
 * @param {string} token - Token a ser criptografado
 * @param {string} secretKey - Chave secreta para criptografia (normalmente process.env.TOKEN_ENCRYPTION_KEY)
 * @returns {string} Token criptografado
 */
exports.encryptToken = (token, secretKey) => {
  try {
    if (!token) return null;
    
    // Verificar se a chave de criptografia está definida
    if (!secretKey) {
      throw new Error('Chave de criptografia não fornecida');
    }
    
    const algorithm = 'aes-256-ctr';
    const iv = crypto.randomBytes(16);
    const key = crypto.createHash('sha256').update(String(secretKey)).digest('base64').substring(0, 32);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const encrypted = Buffer.concat([cipher.update(token), cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  } catch (error) {
    console.error('Erro ao criptografar token:', error);
    throw new Error('Falha na criptografia do token');
  }
};

/**
 * Descriptografa um token usando AES-256-CTR
 * @param {string} hash - Token criptografado
 * @param {string} secretKey - Chave secreta para descriptografia (normalmente process.env.TOKEN_ENCRYPTION_KEY)
 * @returns {string} Token descriptografado
 */
exports.decryptToken = (hash, secretKey) => {
  try {
    if (!hash) return null;
    
    // Verificar se a chave de criptografia está definida
    if (!secretKey) {
      throw new Error('Chave de criptografia não fornecida');
    }
    
    const [ivHex, encryptedHex] = hash.split(':');
    
    // Verificar se o token está no formato criptografado
    if (!ivHex || !encryptedHex) {
      throw new Error('Token em formato inválido');
    }
    
    const algorithm = 'aes-256-ctr';
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.createHash('sha256').update(String(secretKey)).digest('base64').substring(0, 32);
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error('Erro ao descriptografar token:', error);
    throw new Error('Falha na descriptografia do token');
  }
};

/**
 * Verifica se um token está expirado
 * @param {Date|Number} expiryDate - Data/hora de expiração
 * @returns {boolean} Verdadeiro se expirado
 */
exports.isTokenExpired = (expiryDate) => {
  if (!expiryDate) return true;
  
  if (expiryDate instanceof Date) {
    return new Date() > expiryDate;
  } else {
    return Date.now() > expiryDate;
  }
};

/**
 * Calcula a data de expiração com base no tempo de expiração em segundos
 * @param {number} expiresIn - Tempo de expiração em segundos
 * @returns {Date} Data de expiração
 */
exports.calculateExpiryDate = (expiresIn = 3600) => {
  const expiryDate = new Date();
  expiryDate.setSeconds(expiryDate.getSeconds() + expiresIn);
  return expiryDate;
};

/**
 * Gera um objeto de erro formatado para retorno em caso de falha
 * @param {string} message - Mensagem de erro
 * @param {Error} [originalError] - Erro original
 * @returns {Object} Objeto de erro formatado
 */
exports.formatError = (message, originalError = null) => {
  return {
    success: false,
    message: message,
    error: originalError ? originalError.message : undefined,
    timestamp: new Date()
  };
};

/**
 * Gera um objeto de sucesso formatado para retorno
 * @param {string} message - Mensagem de sucesso
 * @param {Object} data - Dados adicionais a incluir
 * @returns {Object} Objeto de sucesso formatado
 */
exports.formatSuccess = (message, data = {}) => {
  return {
    success: true,
    message: message,
    ...data,
    timestamp: new Date()
  };
};