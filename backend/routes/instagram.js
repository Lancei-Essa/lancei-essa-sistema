const express = require('express');
const { protect } = require('../middleware/auth');
const { imageUploadMiddleware } = require('../middleware/fileUpload');
const instagramController = require('../controllers/instagramController');

const router = express.Router();

// Rotas públicas para autenticação OAuth
router.get('/auth', instagramController.initiateAuth);
router.get('/callback', instagramController.handleAuthCallback);

// Aplicar middleware de autenticação em todas as outras rotas
router.use(protect);

// Rotas de gerenciamento de conexão
router.get('/check-connection', instagramController.checkConnection);
router.post('/disconnect', instagramController.disconnect);
router.get('/auth-url', instagramController.getAuthUrl);

// Rotas para manipulação de publicações
router.post('/publish/photo', imageUploadMiddleware, instagramController.publishPhoto);
router.get('/metrics', instagramController.getMetrics);

module.exports = router;