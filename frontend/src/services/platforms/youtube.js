import api from '../api';

// Lista de todas as funções exportadas:
// - checkYouTubeConnection: Verifica a conexão com YouTube
// - getYouTubeAuthUrl: Obtém URL de autenticação OAuth
// - exchangeAuthCode: Troca código de autorização por tokens
// - uploadToYouTube: Faz upload de vídeo para o YouTube
// - scheduleYouTubeVideo: Agenda vídeo para publicação
// - getYouTubeVideoInfo: Obtém informações de um vídeo
// - getYouTubeChannelStats: Obtém estatísticas do canal
// - getYouTubeMetrics: Obtém métricas atuais do YouTube
// - getYouTubeMetricsHistory: Obtém histórico de métricas
// - checkConnection, getAuthUrl: Aliases para compatibilidade

/**
 * Verifica o status da conexão com YouTube
 * @returns {Promise<Object>} Objeto contendo status da conexão
 */
export const checkYouTubeConnection = async () => {
  try {
    // Importante: NÃO incluir '/api' porque a configuração do Axios já incluiu isso no baseURL
    console.log('[YouTube] Verificando conexão...');
    const response = await api.get('/youtube/check-connection');
    console.log('[YouTube] Resposta da verificação:', response.data);
    return response.data;
  } catch (error) {
    console.error('[YouTube] Erro na verificação:', error);
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
 * Obtém métricas do YouTube para visualização em gráficos
 * @param {Object} options Opções de filtro
 * @param {string} options.period Período das métricas (30days, 90days, 1year, etc.)
 * @param {string} options.type Tipo de métricas (views, likes, comments, etc.)
 * @returns {Promise<Object>} Dados das métricas para exibição
 */
export const getYouTubeMetrics = async (options = {}) => {
  try {
    const { period = '30days', type = 'views' } = options;
    
    console.log('[YouTube] Obtendo métricas atuais...');
    console.log('[YouTube] URL da requisição:', '/youtube/metrics');
    console.log('[YouTube] Parâmetros:', { period, type });
    
    const response = await api.get('/youtube/metrics', {
      params: { period, type }
    });
    
    // Adicionando log detalhado da resposta completa
    console.log('[YouTube] DADOS COMPLETOS:', JSON.stringify(response.data, null, 2));
    console.log('[YouTube] DADOS COMPLETOS (stringify):', JSON.stringify(response.data, null, 2));
    
    console.log('[YouTube] Resposta recebida da API:', response.data);
    
    // Verificação adicional para garantir que a resposta tenha a estrutura esperada
    if (!response.data) {
      throw new Error('Resposta vazia do servidor');
    }
    
    // Se a resposta não tiver a propriedade 'success', adicioná-la
    if (response.data.success === undefined) {
      console.log('[YouTube] Adicionando propriedade success à resposta');
      response.data = { 
        success: true, 
        data: response.data 
      };
    }
    
    return response.data;
  } catch (error) {
    console.error('[YouTube] Erro ao obter métricas:', error);
    console.error('[YouTube] Detalhes do erro:', error.response || error.message);
    
    // Melhorar o objeto de erro para fornecer mais informações
    const errorObj = {
      success: false, 
      message: 'Erro ao obter métricas do YouTube',
      details: error.message
    };
    
    if (error.response) {
      errorObj.statusCode = error.response.status;
      errorObj.serverMessage = error.response.data?.message;
    }
    
    throw errorObj;
  }
};

/**
 * Obtém histórico de métricas do YouTube para análise de tendências
 * @param {Object} options Opções de filtro
 * @param {number} options.days Número de dias para atrás (padrão: 30)
 * @returns {Promise<Object>} Dados históricos de métricas
 */
export const getYouTubeMetricsHistory = async (options = {}) => {
  try {
    const { days = 30 } = options;
    
    console.log('[YouTube] Obtendo histórico de métricas...');
    const response = await api.get('/youtube/metrics/history', {
      params: { days }
    });
    
    console.log('[YouTube] Histórico recebido da API:', response.data);
    return response.data;
  } catch (error) {
    console.error('[YouTube] Erro ao obter histórico de métricas:', error);
    throw error.response?.data || { success: false, message: 'Erro ao obter histórico de métricas do YouTube' };
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
  getYouTubeMetrics,
  getYouTubeMetricsHistory,
  exchangeAuthCode
};

export default youtubeService;