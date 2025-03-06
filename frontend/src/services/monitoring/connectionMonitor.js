import api from '../api';

// Simulação para APIs que ainda não estão implementadas
const mockCheckConnections = async () => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    youtube: { connected: true, lastCheck: new Date(), tokenExpiresIn: 30 },
    instagram: { connected: true, lastCheck: new Date(), tokenExpiresIn: 60 },
    twitter: { connected: false, lastCheck: new Date(), error: 'Token expirado' },
    linkedin: { connected: true, lastCheck: new Date(), tokenExpiresIn: 5 },
    spotify: { connected: true, lastCheck: new Date(), tokenExpiresIn: 45 },
    tiktok: { connected: false, lastCheck: new Date(), error: 'Conexão não implementada' }
  };
};

// Intervalo padrão para verificação automática de conexões (em milissegundos)
const DEFAULT_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 horas

// Limite para considerar um token prestes a expirar (em dias)
const TOKEN_EXPIRATION_WARNING = 10;

// Plataformas suportadas
const PLATFORMS = ['youtube', 'instagram', 'twitter', 'linkedin', 'spotify', 'tiktok'];

// Armazenamento local para último status de conexão
let connectionStatusCache = {};
let lastCheckTimestamp = null;
let checkInterval = null;

/**
 * Verifica o status da conexão com uma plataforma específica
 * @param {string} platform - Nome da plataforma (youtube, instagram, etc.)
 * @returns {Promise<Object>} - Status da conexão
 */
export const checkConnection = async (platform) => {
  try {
    // Em produção, substituir pelo código abaixo:
    // const response = await api.get(`/api/${platform}/check-connection`);
    
    // Para desenvolvimento, usamos o mock
    const mockResults = await mockCheckConnections();
    const mockResult = mockResults[platform];
    
    return {
      connected: mockResult.connected,
      error: mockResult.error || null,
      tokenExpiresIn: mockResult.tokenExpiresIn || null,
      lastCheck: new Date(),
      profile: mockResult.profile || null,
    };
  } catch (error) {
    console.error(`Erro ao verificar conexão com ${platform}:`, error);
    return {
      connected: false,
      error: error.response?.data?.message || error.message || 'Erro desconhecido',
      lastCheck: new Date(),
      tokenExpiresIn: null,
      profile: null,
    };
  }
};

/**
 * Verifica o status de todas as conexões com plataformas
 * @returns {Promise<Object>} - Status de todas as conexões
 */
export const checkAllConnections = async () => {
  try {
    // Para desenvolvimento, usamos o mock
    const results = await mockCheckConnections();
    
    // Atualizar cache
    connectionStatusCache = { ...results };
    lastCheckTimestamp = new Date();
    
    return results;
  } catch (error) {
    console.error("Erro ao verificar todas as conexões:", error);
    return {};
  }
};

/**
 * Tenta reconectar com uma plataforma específica
 * @param {string} platform - Nome da plataforma
 * @returns {Promise<Object>} - Resultado da tentativa de reconexão
 */
export const attemptReconnect = async (platform) => {
  try {
    // Em produção, descomentar o código abaixo:
    // const response = await api.post(`/api/${platform}/reconnect`);
    
    // Para desenvolvimento, simulamos uma resposta
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      authUrl: `http://localhost:5002/api/${platform}/auth`,
      message: 'Reconexão iniciada com sucesso'
    };
  } catch (error) {
    console.error(`Erro ao tentar reconectar ${platform}:`, error);
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Falha na reconexão'
    };
  }
};

/**
 * Inicia a verificação automática periódica das conexões
 * @param {number} interval - Intervalo em milissegundos (padrão: 24 horas)
 */
export const startAutomaticChecks = (interval = DEFAULT_CHECK_INTERVAL) => {
  // Parar verificações anteriores se houver
  if (checkInterval) {
    clearInterval(checkInterval);
  }
  
  // Verificar imediatamente
  checkAllConnections();
  
  // Configurar verificação periódica
  checkInterval = setInterval(() => {
    checkAllConnections();
  }, interval);
  
  return true;
};

/**
 * Para a verificação automática das conexões
 */
export const stopAutomaticChecks = () => {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
    return true;
  }
  return false;
};

/**
 * Retorna o status atual das conexões (do cache)
 * @returns {Object} - Status das conexões do cache ou vazio se não houver verificação
 */
export const getConnectionStatus = () => {
  return {
    status: connectionStatusCache,
    lastCheck: lastCheckTimestamp,
    isCheckRunning: checkInterval !== null
  };
};

/**
 * Verifica tokens que precisam ser renovados em breve
 * @returns {Array} - Lista de plataformas com tokens próximos da expiração
 */
export const checkTokensNearExpiration = () => {
  const warningList = [];
  
  for (const platform in connectionStatusCache) {
    const status = connectionStatusCache[platform];
    
    if (status.connected && 
        status.tokenExpiresIn !== null && 
        status.tokenExpiresIn <= TOKEN_EXPIRATION_WARNING) {
      warningList.push({
        platform,
        daysUntilExpiration: status.tokenExpiresIn,
        lastCheck: status.lastCheck
      });
    }
  }
  
  return warningList;
};

// Iniciar automaticamente o monitoramento quando o módulo for carregado
startAutomaticChecks();

export default {
  checkConnection,
  checkAllConnections,
  attemptReconnect,
  startAutomaticChecks,
  stopAutomaticChecks,
  getConnectionStatus,
  checkTokensNearExpiration
};