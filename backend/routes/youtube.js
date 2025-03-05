const express = require('express');
const { protect } = require('../middleware/auth');
const { uploadMiddleware } = require('../middleware/fileUpload');
const youtubeController = require('../controllers/youtubeController');

const router = express.Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(protect);

// Rotas de autenticação com Google/YouTube
router.get('/auth', youtubeController.authorize);
router.get('/oauth2callback', youtubeController.authCallback);
router.get('/check-connection', youtubeController.checkConnection);
router.get('/auth-url', youtubeController.getAuthUrl);

// Rotas para manipulação de vídeos
router.post('/upload', uploadMiddleware, youtubeController.uploadVideo);
router.get('/videos/:videoId', youtubeController.getVideoInfo);
router.post('/videos/:videoId/schedule', youtubeController.scheduleVideo);

// Estatísticas do canal
router.get('/channel/stats', youtubeController.getChannelStats);

module.exports = router;