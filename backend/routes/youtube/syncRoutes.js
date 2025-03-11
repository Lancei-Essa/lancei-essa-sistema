const express = require('express');
const router = express.Router();
const syncController = require('../../controllers/youtube/syncController');
const { protect } = require('../../middleware/authMiddleware');

// Rota para iniciar sincronização completa
router.post('/full', protect, syncController.startFullSync);

// Rota para obter status de um job
router.get('/job/:jobId', protect, syncController.getSyncStatus);

// Rota para listar todos os jobs
router.get('/jobs', protect, syncController.getAllJobs);

// Rota para cancelar um job
router.put('/job/:jobId/cancel', protect, syncController.cancelJob);

// Rota para obter estatísticas de sincronização
router.get('/stats', protect, syncController.getSyncStats);

// Rota para listar vídeos sincronizados
router.get('/videos', protect, syncController.getVideos);

// Rota para obter detalhes de um vídeo
router.get('/videos/:videoId', protect, syncController.getVideoDetails);

// Rota para processar jobs pendentes (admin)
router.post('/process-pending', protect, syncController.processPendingJobs);

module.exports = router;