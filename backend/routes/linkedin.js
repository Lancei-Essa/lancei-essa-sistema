const express = require('express');
const router = express.Router();
const linkedinController = require('../controllers/linkedinController');
const { protect } = require('../middleware/auth');

// Rotas públicas (autenticação)
router.get('/auth', linkedinController.initiateAuth);
router.get('/callback', linkedinController.handleAuthCallback);
router.get('/auth-url', protect, linkedinController.getAuthUrl);

// Rotas protegidas
router.use(protect);

// Rotas de gerenciamento de conexão
router.get('/check-connection', linkedinController.checkConnection);
router.post('/disconnect', linkedinController.disconnect);

// Rotas de operações do LinkedIn
router.post('/share', linkedinController.shareContent);
router.post('/share/image', linkedinController.shareImage);
router.get('/metrics/:shareId', linkedinController.getMetrics);

module.exports = router;