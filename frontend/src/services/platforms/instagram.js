import api from '../api';

/**
 * Verifica se o usuário está conectado ao Instagram
 * @returns {Promise<Object>} Status da conexão
 */
export const checkInstagramConnection = async () => {
  try {
    const response = await api.get('/instagram/check-connection');
    return response.data;
  } catch (error) {
    console.error('Erro ao verificar conexão com Instagram:', error);
    throw error.response?.data || { 
      success: false, 
      message: 'Erro ao verificar conexão com Instagram'
    };
  }
};

/**
 * Inicia o processo de autenticação com Instagram
 * @returns {Promise<Object>} URL de autorização
 */
export const getInstagramAuthUrl = async () => {
  try {
    const response = await api.get('/instagram/auth-url');
    return response.data;
  } catch (error) {
    console.error('Erro ao obter URL de autorização para Instagram:', error);
    throw error.response?.data || { 
      success: false, 
      message: 'Erro ao obter URL de autorização'
    };
  }
};

/**
 * Desconecta o usuário do Instagram
 * @returns {Promise<Object>} Resultado da operação
 */
export const disconnectInstagram = async () => {
  try {
    const response = await api.post('/instagram/disconnect');
    return response.data;
  } catch (error) {
    console.error('Erro ao desconectar Instagram:', error);
    throw error.response?.data || { 
      success: false, 
      message: 'Erro ao desconectar do Instagram'
    };
  }
};

/**
 * Publica uma imagem no Instagram
 * @param {FormData} formData Os dados da publicação
 * @returns {Promise<Object>} Resultado da publicação
 */
export const postToInstagram = async (formData) => {
  try {
    const response = await api.post('/instagram/publish', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao publicar no Instagram:', error);
    throw error.response?.data || { 
      success: false, 
      message: 'Erro ao publicar no Instagram'
    };
  }
};

/**
 * Agenda uma publicação no Instagram
 * @param {Object} publishData Dados da publicação
 * @returns {Promise<Object>} Resultado do agendamento
 */
export const scheduleInstagramPost = async (publishData) => {
  try {
    const response = await api.post('/instagram/schedule', publishData);
    return response.data;
  } catch (error) {
    console.error('Erro ao agendar publicação no Instagram:', error);
    throw error.response?.data || { 
      success: false, 
      message: 'Erro ao agendar publicação no Instagram'
    };
  }
};

/**
 * Obtém métricas de publicações no Instagram
 * @returns {Promise<Object>} Métricas das publicações
 */
export const getInstagramMetrics = async () => {
  try {
    const response = await api.get('/instagram/metrics');
    return response.data;
  } catch (error) {
    console.error('Erro ao obter métricas do Instagram:', error);
    throw error.response?.data || { 
      success: false, 
      message: 'Erro ao obter métricas do Instagram'
    };
  }
};