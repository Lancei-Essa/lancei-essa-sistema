/**
 * Utilitário para gerenciamento de tokens
 * Oferece métodos para manipulação segura de tokens OAuth
 */

const crypto = require('crypto');

/**
 * Criptografa um token usando AES-256-CTR
 * @param {string} token - Token a ser criptografado
 * @param {string} secretKey - Chave de criptografia (do .env)
 * @returns {string} Token criptografado
 */
function encryptToken(token, secretKey = process.env.TOKEN_ENCRYPTION_KEY) {
  try {
    if (!token) return null;
    
    const algorithm = 'aes-256-ctr';
    
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
    throw error;
  }
}

/**
 * Descriptografa um token usando AES-256-CTR
 * @param {string} encryptedToken - Token criptografado
 * @param {string} secretKey - Chave de criptografia (do .env)
 * @returns {string} Token original
 */
function decryptToken(encryptedToken, secretKey = process.env.TOKEN_ENCRYPTION_KEY) {
  try {
    if (!encryptedToken) return null;
    
    const algorithm = 'aes-256-ctr';
    
    // Verificar se a chave de criptografia está definida
    if (!secretKey) {
      throw new Error('TOKEN_ENCRYPTION_KEY não está definida nas variáveis de ambiente');
    }
    
    const [ivHex, encryptedHex] = encryptedToken.split(':');
    
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
    throw error;
  }
}

/**
 * Verifica se um token está expirado com base na data de expiração
 * @param {number} expiryDate - Data de expiração do token em milissegundos
 * @returns {boolean} Verdadeiro se o token expirou
 */
function isTokenExpired(expiryDate) {
  if (!expiryDate) return true;
  return expiryDate <= Date.now();
}

/**
 * Cria um cliente OAuth para uma plataforma específica
 * @param {string} platform - Plataforma ('youtube', 'instagram', etc)
 * @param {Object} credentials - Credenciais (client_id, client_secret, etc)
 * @returns {Object} Cliente OAuth configurado
 */
function createOAuthClient(platform, credentials) {
  try {
    // Implementação específica para cada plataforma
    switch (platform) {
      case 'youtube':
        const { google } = require('googleapis');
        const clientId = credentials?.client_id || process.env.YOUTUBE_CLIENT_ID;
        const clientSecret = credentials?.client_secret || process.env.YOUTUBE_CLIENT_SECRET;
        const redirectUri = credentials?.redirect_uri || process.env.YOUTUBE_REDIRECT_URI;
        
        if (!clientId || !clientSecret || !redirectUri) {
          throw new Error('Credenciais do YouTube incompletas');
        }
        
        return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
        
      // Adicionar outras plataformas conforme necessário
      
      default:
        throw new Error(`Plataforma não suportada: ${platform}`);
    }
  } catch (error) {
    console.error(`Erro ao criar cliente OAuth para ${platform}:`, error);
    throw error;
  }
}

module.exports = {
  encryptToken,
  decryptToken,
  isTokenExpired,
  createOAuthClient
};