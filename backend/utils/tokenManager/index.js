/**
 * Gerenciador de tokens para APIs de redes sociais
 * 
 * Este módulo centraliza as funções de gerenciamento de tokens,
 * incluindo cache, renovação e verificação de validade.
 */

const tokenCache = require('./tokenCache');
const tokenRefresher = require('./tokenRefresher');

// Exportar todas as funções necessárias
module.exports = {
  // Funções de cache
  getToken: tokenCache.getToken,
  setToken: tokenCache.setToken,
  removeToken: tokenCache.removeToken,
  clearCache: tokenCache.clearCache,
  getCacheStats: tokenCache.getCacheStats,
  
  // Funções de renovação
  ensureFreshToken: tokenRefresher.ensureFreshToken,
  initUserTokens: tokenRefresher.initUserTokens,
  scheduleTokenRefresh: tokenRefresher.scheduleTokenRefresh,
};