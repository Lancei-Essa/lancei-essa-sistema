import api from '../api';

/**
 * Verifica o status da conexão com YouTube
 * @returns {Promise<Object>} Objeto contendo status da conexão
 */
export const checkYouTubeConnection = async () => {
  try {
    const response = await api.get('/youtube/check-connection');
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Erro ao verificar conexão com YouTube' };
  }
};

/**
 * Inicia processo de autenticação OAuth com YouTube
 * MÉTODO UNIFICADO - Usa o endpoint comum para todos os componentes
 * @returns {Promise<Object>} URL de redirecionamento para autorização
 */
export const getYouTubeAuthUrl = async () => {
  try {
    console.log('[YouTube] Solicitando URL de autenticação unificada');
    
    // Sempre usar o endpoint unificado
    const response = await api.get('/youtube/auth-url');
    console.log('[YouTube] Resposta recebida:', response.data);
    
    if (!response.data || !response.data.success || !response.data.authUrl) {
      throw new Error('Resposta inválida do servidor');
    }
    
    return response.data;
  } catch (error) {
    console.error('[YouTube] Erro ao solicitar URL de autenticação:', error);
    
    // Extrair informações do erro para melhor diagnóstico
    const errorData = error.response?.data || {};
    
    throw {
      success: false,
      message: 'Erro ao obter URL de autorização',
      originalError: error.message,
      apiResponse: errorData
    };
  }
};

/**
 * Troca um código de autorização por tokens (método desktop/aplicativo nativo)
 * @param {string} code Código de autorização obtido pelo fluxo de aplicativo desktop
 * @returns {Promise<Object>} Resposta do servidor
 */
export const exchangeAuthCode = async (code) => {
  try {
    console.log('[YouTube] Enviando código de autorização para troca de tokens...');
    const response = await api.post('/youtube/exchange-code', { code });
    console.log('[YouTube] Resposta de troca de código:', response.data);
    return response.data;
  } catch (error) {
    console.error('[YouTube] Erro ao trocar código de autorização:', error);
    
    const errorData = error.response?.data || {};
    throw {
      success: false,
      message: 'Erro ao trocar código de autorização',
      errorType: 'API_ERROR',
      apiResponse: errorData,
      originalError: error.message
    };
  }
};

/**
 * Faz upload de um vídeo para o YouTube
 * @param {FormData} formData Dados do formulário contendo o vídeo e metadados
 * @returns {Promise<Object>} Informações do vídeo enviado
 */
export const uploadToYouTube = async (formData) => {
  try {
    const response = await api.post('/youtube/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 300000 // 5 minutos para uploads grandes
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Erro ao fazer upload para YouTube' };
  }
};

/**
 * Agenda um vídeo do YouTube para publicação
 * @param {string} videoId ID do vídeo no YouTube
 * @param {string} publishAt Data e hora para publicação (formato ISO)
 * @returns {Promise<Object>} Informações do vídeo agendado
 */
export const scheduleYouTubeVideo = async (videoId, publishAt) => {
  try {
    const response = await api.post(`/youtube/videos/${videoId}/schedule`, { publishAt });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Erro ao agendar vídeo' };
  }
};

/**
 * Obtém informações de um vídeo do YouTube
 * @param {string} videoId ID do vídeo no YouTube
 * @returns {Promise<Object>} Informações do vídeo
 */
export const getYouTubeVideoInfo = async (videoId) => {
  try {
    const response = await api.get(`/youtube/videos/${videoId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Erro ao obter informações do vídeo' };
  }
};

/**
 * Obtém estatísticas do canal do YouTube
 * @returns {Promise<Object>} Estatísticas do canal
 */
export const getYouTubeChannelStats = async () => {
  try {
    const response = await api.get('/youtube/channel/stats');
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Erro ao obter estatísticas do canal' };
  }
};

/**
 * Verifica o status da conexão
 * @returns {Promise<Object>} Status da conexão
 */
export const checkConnection = async () => {
  return checkYouTubeConnection();
};

/**
 * Obtém URL de autenticação
 * @returns {Promise<string>} URL de autenticação
 */
export const getAuthUrl = async () => {
  const response = await getYouTubeAuthUrl();
  return response.authUrl;
};

// Exportação padrão para compatibilidade
const youtubeService = {
  checkConnection,
  getAuthUrl,
  uploadToYouTube,
  scheduleYouTubeVideo,
  getYouTubeVideoInfo,
  getYouTubeChannelStats,
  exchangeAuthCode
};

export default youtubeService;