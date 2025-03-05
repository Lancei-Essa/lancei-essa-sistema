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
    const response = await api.get('/youtube/auth-url');
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Erro ao obter URL de autorização' };
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