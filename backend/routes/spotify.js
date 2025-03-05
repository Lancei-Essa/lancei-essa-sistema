const express = require('express');
const router = express.Router();
const spotifyController = require('../controllers/spotifyController');
const auth = require('../middleware/auth');

// Rotas de autenticação
router.get('/auth', auth, spotifyController.authorize);
router.get('/callback', auth, spotifyController.authCallback);
router.get('/check-connection', auth, spotifyController.checkConnection);
router.post('/disconnect', auth, spotifyController.disconnect);

// Rotas de podcast
router.get('/search-podcasts', auth, spotifyController.searchPodcasts);
router.get('/podcast/:id', auth, spotifyController.getPodcastDetails);
router.get('/podcast/:id/episodes', auth, spotifyController.getPodcastEpisodes);
router.get('/episode/:id/metrics', auth, spotifyController.getEpisodeMetrics);

module.exports = router;