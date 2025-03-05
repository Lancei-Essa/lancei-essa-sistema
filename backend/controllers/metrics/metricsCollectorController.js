/**
 * Controlador para gerenciamento da coleta de métricas
 */

const metricsCollector = require('../../services/scheduler/metricsCollector');
const Publication = require('../../models/Publication');

/**
 * Iniciar o serviço de coleta de métricas
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 */
exports.startCollector = async (req, res) => {
  try {
    metricsCollector.startCollector();
    
    res.json({
      success: true,
      message: 'Serviço de coleta de métricas iniciado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao iniciar coletor de métricas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao iniciar serviço de coleta de métricas',
      error: error.message
    });
  }
};

/**
 * Parar o serviço de coleta de métricas
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 */
exports.stopCollector = async (req, res) => {
  try {
    metricsCollector.stopCollector();
    
    res.json({
      success: true,
      message: 'Serviço de coleta de métricas parado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao parar coletor de métricas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao parar serviço de coleta de métricas',
      error: error.message
    });
  }
};

/**
 * Executar coleta de métricas manualmente
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 */
exports.runCollector = async (req, res) => {
  try {
    // Esta chamada é assíncrona e pode demorar
    metricsCollector.collectMetrics();
    
    res.json({
      success: true,
      message: 'Processo de coleta de métricas iniciado'
    });
  } catch (error) {
    console.error('Erro ao executar coletor de métricas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao executar coleta de métricas',
      error: error.message
    });
  }
};

/**
 * Forçar coleta de métricas para uma publicação específica
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 */
exports.forceCollectForPublication = async (req, res) => {
  try {
    const { publicationId } = req.params;
    
    if (!publicationId) {
      return res.status(400).json({
        success: false,
        message: 'ID da publicação não fornecido'
      });
    }
    
    // Verificar se o usuário tem permissão para esta publicação
    const publication = await Publication.findOne({
      _id: publicationId,
      createdBy: req.user._id
    });
    
    if (!publication) {
      return res.status(404).json({
        success: false,
        message: 'Publicação não encontrada ou você não tem permissão para acessá-la'
      });
    }
    
    const result = await metricsCollector.forceCollectMetrics(publicationId);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao forçar coleta de métricas para publicação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao forçar coleta de métricas para publicação',
      error: error.message
    });
  }
};

/**
 * Obter status do coletor de métricas
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 */
exports.getCollectorStatus = async (req, res) => {
  try {
    // Implementar uma forma de verificar o status
    // Por enquanto, apenas retorna se está ativo ou não
    const isActive = metricsCollector.isActive ? metricsCollector.isActive() : false;
    
    res.json({
      success: true,
      status: {
        active: isActive,
        lastRun: metricsCollector.lastRun || null
      }
    });
  } catch (error) {
    console.error('Erro ao obter status do coletor de métricas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter status do coletor de métricas',
      error: error.message
    });
  }
};