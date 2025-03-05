const express = require('express');
const router = express.Router();
const tiktokController = require('../controllers/tiktokController');
const auth = require('../middleware/auth');

// Rotas de autenticação
router.get('/auth', auth, tiktokController.authorize);
router.get('/callback', auth, tiktokController.authCallback);
router.get('/check-connection', auth, tiktokController.checkConnection);
router.post('/disconnect', auth, tiktokController.disconnect);

// Rotas de gerenciamento de vídeos
router.post('/upload', auth, tiktokController.uploadVideo);
router.get('/videos', auth, tiktokController.getUserVideos);
router.get('/video/:id/metrics', auth, tiktokController.getVideoMetrics);

module.exports = router;