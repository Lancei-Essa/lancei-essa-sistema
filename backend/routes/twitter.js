const express = require('express');
const router = express.Router();
const twitterController = require('../controllers/twitterController');
const twitterScheduleController = require('../controllers/twitterScheduleController');
const { protect } = require('../middleware/auth');

// Rotas públicas (autenticação)
router.get('/auth', twitterController.initiateAuth);
router.get('/callback', twitterController.handleAuthCallback);
router.get('/auth-url', protect, twitterController.getAuthUrl);

// Rotas protegidas
router.use(protect);

// Rotas de gerenciamento de conexão
router.get('/check-connection', twitterController.checkConnection);
router.post('/disconnect', twitterController.disconnect);

// Rotas de operações do Twitter
router.post('/tweet', twitterController.postTweet);
router.post('/tweet/media', twitterController.postTweetWithMedia);
router.get('/tweet/:id/metrics', twitterController.getTweetMetrics);
router.get('/user', twitterController.getUserInfo);
router.post('/schedule', twitterScheduleController.scheduleTweet);

module.exports = router;