import api from '../api';

/**
 * Obtém todas as publicações, com possibilidade de filtragem
 * @param {Object} filters - Filtros (episodeId, platform, status)
 * @returns {Promise} Promessa com os dados das publicações
 */
export const getPublications = async (filters = {}) => {
  try {
    const response = await api.get('/publications', { params: filters });
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar publicações:', error);
    throw error;
  }
};

/**
 * Obtém uma publicação pelo ID
 * @param {string} id - ID da publicação
 * @returns {Promise} Promessa com os dados da publicação
 */
export const getPublication = async (id) => {
  try {
    const response = await api.get(`/publications/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Erro ao buscar publicação ${id}:`, error);
    throw error;
  }
};

/**
 * Cria uma nova publicação
 * @param {Object} publicationData - Dados da publicação
 * @returns {Promise} Promessa com os dados da publicação criada
 */
export const createPublication = async (publicationData) => {
  try {
    const response = await api.post('/publications', publicationData);
    return response.data;
  } catch (error) {
    console.error('Erro ao criar publicação:', error);
    throw error;
  }
};

/**
 * Atualiza uma publicação existente
 * @param {string} id - ID da publicação
 * @param {Object} publicationData - Dados atualizados da publicação
 * @returns {Promise} Promessa com os dados da publicação atualizada
 */
export const updatePublication = async (id, publicationData) => {
  try {
    const response = await api.put(`/publications/${id}`, publicationData);
    return response.data;
  } catch (error) {
    console.error(`Erro ao atualizar publicação ${id}:`, error);
    throw error;
  }
};

/**
 * Exclui uma publicação
 * @param {string} id - ID da publicação
 * @returns {Promise} Promessa com o resultado da exclusão
 */
export const deletePublication = async (id) => {
  try {
    const response = await api.delete(`/publications/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Erro ao excluir publicação ${id}:`, error);
    throw error;
  }
};

/**
 * Atualiza as métricas de uma publicação
 * @param {string} id - ID da publicação
 * @param {Object} metrics - Novas métricas
 * @returns {Promise} Promessa com os dados atualizados
 */
export const updateMetrics = async (id, metrics) => {
  try {
    const response = await api.patch(`/publications/${id}/metrics`, { metrics });
    return response.data;
  } catch (error) {
    console.error(`Erro ao atualizar métricas da publicação ${id}:`, error);
    throw error;
  }
};

/**
 * Publica imediatamente uma publicação agendada
 * @param {string} id - ID da publicação
 * @returns {Promise} Promessa com o resultado da publicação
 */
export const publishNow = async (id) => {
  try {
    const response = await api.post(`/publications/${id}/publish`);
    return response.data;
  } catch (error) {
    console.error(`Erro ao publicar imediatamente ${id}:`, error);
    throw error;
  }
};

/**
 * Testa uma publicação sem salvar no banco de dados
 * @param {Object} publicationData - Dados da publicação para teste
 * @returns {Promise} Promessa com o resultado do teste
 */
export const testPublication = async (publicationData) => {
  try {
    const response = await api.post('/publications/test', publicationData);
    return response.data;
  } catch (error) {
    console.error('Erro ao testar publicação:', error);
    throw error;
  }
};

/**
 * Gera um agendamento em massa baseado em um padrão
 * @param {Object} patternData - Dados do padrão de agendamento
 * @returns {Promise} Promessa com as publicações geradas
 */
export const generateScheduleFromPattern = async (patternData) => {
  try {
    const response = await api.post('/publications/generate-schedule', patternData);
    return response.data;
  } catch (error) {
    console.error('Erro ao gerar agendamento em massa:', error);
    throw error;
  }
};

/**
 * Obtém padrões de agendamento disponíveis
 * @returns {Promise} Promessa com os padrões de agendamento
 */
export const getSchedulePatterns = async () => {
  try {
    const response = await api.get('/publications/schedule-patterns');
    return response.data;
  } catch (error) {
    console.error('Erro ao obter padrões de agendamento:', error);
    throw error;
  }
};