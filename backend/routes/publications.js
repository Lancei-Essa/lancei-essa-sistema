const express = require('express');
const { 
  createPublication, 
  getPublications, 
  getPublication, 
  updatePublication, 
  deletePublication,
  updatePublicationMetrics,
  publishNow,
  testPublication
} = require('../controllers/publicationController');
const bulkScheduleController = require('../controllers/bulkScheduleController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Aplicar middleware de proteção a todas as rotas
router.use(protect);

router
  .route('/')
  .get(getPublications)
  .post(authorize('admin', 'editor'), createPublication);

router
  .route('/:id')
  .get(getPublication)
  .put(authorize('admin', 'editor'), updatePublication)
  .delete(authorize('admin'), deletePublication);

router
  .route('/:id/metrics')
  .patch(authorize('admin', 'editor'), updatePublicationMetrics);

// Rotas para agendamento em massa
router
  .route('/bulk/schedule')
  .post(authorize('admin', 'editor'), bulkScheduleController.bulkSchedule);

router
  .route('/schedule-patterns')
  .get(bulkScheduleController.getSchedulePatterns);

router
  .route('/generate-schedule')
  .post(authorize('admin', 'editor'), bulkScheduleController.generateScheduleFromPattern);

// Rota para testar uma publicação
router
  .route('/test')
  .post(authorize('admin', 'editor'), testPublication);

// Rota para publicar imediatamente
router
  .route('/:id/publish')
  .post(authorize('admin', 'editor'), publishNow);

module.exports = router;