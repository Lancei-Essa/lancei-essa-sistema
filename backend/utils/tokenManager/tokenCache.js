/**
 * Sistema de cache para tokens de API
 * 
 * Este módulo gerencia o cache de tokens para diferentes plataformas,
 * evitando requisições desnecessárias e garantindo melhor performance.
 */

// Cache em memória para tokens
const tokenCache = {
  // Estrutura:
  // {
  //   userId: {
  //     platform: {
  //       accessToken: string,
  //       refreshToken: string,
  //       expiryDate: Date,
  //       lastRefresh: Date
  //     }
  //   }
  // }
};

/**
 * Adiciona ou atualiza um token no cache
 * @param {string} userId - ID do usuário
 * @param {string} platform - Nome da plataforma (youtube, twitter, etc)
 * @param {Object} tokenData - Dados do token
 */
const setToken = (userId, platform, tokenData) => {
  if (!tokenCache[userId]) {
    tokenCache[userId] = {};
  }
  
  tokenCache[userId][platform] = {
    ...tokenData,
    lastRefresh: new Date()
  };
  
  return tokenCache[userId][platform];
};

/**
 * Obtém um token do cache
 * @param {string} userId - ID do usuário
 * @param {string} platform - Nome da plataforma
 * @returns {Object|null} - Dados do token ou null se não existir
 */
const getToken = (userId, platform) => {
  if (!tokenCache[userId] || !tokenCache[userId][platform]) {
    return null;
  }
  
  return tokenCache[userId][platform];
};

/**
 * Verifica se o token está expirado
 * @param {string} userId - ID do usuário
 * @param {string} platform - Nome da plataforma
 * @returns {boolean} - true se expirado, false caso contrário
 */
const isTokenExpired = (userId, platform) => {
  const token = getToken(userId, platform);
  
  if (!token || !token.expiryDate) {
    return true;
  }
  
  // Considerar expirado 5 minutos antes do tempo real
  // para evitar problemas de sincronia
  const safetyBuffer = 5 * 60 * 1000; // 5 minutos em ms
  const now = Date.now();
  
  return now >= (token.expiryDate - safetyBuffer);
};

/**
 * Remove um token do cache
 * @param {string} userId - ID do usuário
 * @param {string} platform - Nome da plataforma
 */
const removeToken = (userId, platform) => {
  if (tokenCache[userId] && tokenCache[userId][platform]) {
    delete tokenCache[userId][platform];
  }
};

/**
 * Limpa todo o cache ou apenas os tokens de um usuário
 * @param {string} [userId] - ID do usuário (opcional)
 */
const clearCache = (userId) => {
  if (userId) {
    delete tokenCache[userId];
  } else {
    Object.keys(tokenCache).forEach(key => delete tokenCache[key]);
  }
};

/**
 * Obtém estatísticas do cache
 * @returns {Object} - Estatísticas do cache
 */
const getCacheStats = () => {
  const stats = {
    users: 0,
    tokens: 0,
    platforms: new Set()
  };
  
  Object.keys(tokenCache).forEach(userId => {
    stats.users++;
    
    Object.keys(tokenCache[userId]).forEach(platform => {
      stats.tokens++;
      stats.platforms.add(platform);
    });
  });
  
  return {
    ...stats,
    platforms: Array.from(stats.platforms)
  };
};

module.exports = {
  setToken,
  getToken,
  isTokenExpired,
  removeToken,
  clearCache,
  getCacheStats
};