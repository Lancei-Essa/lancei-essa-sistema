const express = require('express');
const { 
  createEpisode, 
  getEpisodes, 
  getEpisode, 
  updateEpisode, 
  deleteEpisode 
} = require('../controllers/episodeController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Aplicar middleware de proteção a todas as rotas
router.use(protect);

router
  .route('/')
  .get(getEpisodes)
  .post(authorize('admin', 'editor'), createEpisode);

router
  .route('/:id')
  .get(getEpisode)
  .put(authorize('admin', 'editor'), updateEpisode)
  .delete(authorize('admin'), deleteEpisode);

module.exports = router;