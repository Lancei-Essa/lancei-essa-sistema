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
 * @returns {Promise<Object>} URL de redirecionamento para autorização
 */
export const getYouTubeAuthUrl = async () => {
  try {
    console.log('[YouTube] Solicitando URL de autenticação...');
    console.log('[YouTube] Endpoint:', api.defaults.baseURL + '/youtube/auth-url');
    
    const response = await api.get('/youtube/auth-url');
    console.log('[YouTube] Resposta recebida:', response.data);
    return response.data;
  } catch (error) {
    console.error('[YouTube] Erro completo:', error);
    console.error('[YouTube] URL que falhou:', api.defaults.baseURL + '/youtube/auth-url');
    console.error('[YouTube] Detalhes do erro:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    
    // Informação adicional para depuração
    if (error.response) {
      console.error('[YouTube] Resposta do servidor:', error.response);
    } else if (error.request) {
      console.error('[YouTube] Requisição sem resposta:', error.request);
    }
    
    throw error.response?.data || { 
      success: false, 
      message: 'Erro ao obter URL de autorização',
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
  getYouTubeChannelStats
};

export default youtubeService;