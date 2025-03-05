const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const metricsController = require('../controllers/metrics/metricsController');
const collectorController = require('../controllers/metrics/metricsCollectorController');

router.use(protect);

// Rota para obter métricas agregadas
router.get('/', metricsController.getMetrics);

// Rota para verificar status de todas as conexões de mídia social
router.get('/connections', metricsController.checkAllConnections);

// Rotas para gerenciamento do coletor de métricas (apenas admin)
router.post('/collector/start', isAdmin, collectorController.startCollector);
router.post('/collector/stop', isAdmin, collectorController.stopCollector); 
router.post('/collector/run', isAdmin, collectorController.runCollector);
router.get('/collector/status', isAdmin, collectorController.getCollectorStatus);

// Rota para forçar atualização de uma publicação específica
router.post('/update/:publicationId', collectorController.forceCollectForPublication);

// Middleware para verificar se o usuário é administrador
function isAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Acesso negado. Apenas administradores podem acessar este recurso.'
  });
}

module.exports = router;