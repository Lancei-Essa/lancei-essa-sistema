const spotifyService = require('../services/platforms/spotify');
const SpotifyToken = require('../models/SpotifyToken');
const tokenManager = require('../utils/tokenManager');

/**
 * Redireciona para autorização do Spotify
 * @route GET /api/spotify/auth
 */
exports.authorize = (req, res) => {
  try {
    // Definir URI de redirecionamento
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/spotify/callback`;
    
    // Gerar URL de autorização
    const authUrl = spotifyService.getAuthUrl(redirectUri);
    
    // Redirecionar para autorização
    res.redirect(authUrl);
  } catch (error) {
    console.error('Erro ao gerar URL de autorização do Spotify:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao iniciar autorização com Spotify',
      error: error.message
    });
  }
};

/**
 * Callback de autorização do Spotify
 * @route GET /api/spotify/callback
 */
exports.authCallback = async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Código de autorização não fornecido'
      });
    }
    
    // URI de redirecionamento (deve ser igual ao usado na solicitação de autorização)
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/spotify/callback`;
    
    // Obter tokens
    const tokens = await spotifyService.getTokensFromCode(code, redirectUri);
    
    // Obter informações do perfil
    const profile = await spotifyService.getProfile(tokens.access_token);
    
    // Salvar ou atualizar tokens no banco de dados
    let spotifyToken = await SpotifyToken.findOne({ user: req.user._id });
    
    if (spotifyToken) {
      // Atualizar token existente
      spotifyToken.access_token = tokens.access_token;
      spotifyToken.refresh_token = tokens.refresh_token;
      spotifyToken.expires_in = tokens.expires_in;
      spotifyToken.expiry_date = tokens.expiry_date;
      spotifyToken.scope = tokens.scope;
      spotifyToken.profile = profile;
      spotifyToken.updatedAt = Date.now();
    } else {
      // Criar novo token
      spotifyToken = new SpotifyToken({
        user: req.user._id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        expiry_date: tokens.expiry_date,
        scope: tokens.scope,
        profile: profile
      });
    }
    
    await spotifyToken.save();
    
    // Adicionar token ao cache do tokenManager
    tokenManager.setToken(req.user._id.toString(), 'spotify', {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date
    });
    
    // Redirecionar para a página de configurações com indicação de sucesso
    res.redirect('/settings?connected=spotify');
  } catch (error) {
    console.error('Erro na callback do Spotify:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar autorização do Spotify',
      error: error.message
    });
  }
};

/**
 * Verifica se o usuário está conectado ao Spotify
 * @route GET /api/spotify/check-connection
 */
exports.checkConnection = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    
    try {
      // Usar o tokenManager para verificar e renovar o token se necessário
      const token = await tokenManager.ensureFreshToken(userId, 'spotify');
      
      // Buscar informações do perfil do banco de dados
      const spotifyToken = await SpotifyToken.findOne({ user: req.user._id });
      
      return res.json({
        success: true,
        connected: true,
        profile: spotifyToken ? spotifyToken.profile : null
      });
    } catch (tokenError) {
      // Se o token não existir ou não puder ser renovado
      console.log('Erro ao obter token do Spotify:', tokenError.message);
      return res.json({
        success: true,
        connected: false,
        message: tokenError.message
      });
    }
  } catch (error) {
    console.error('Erro ao verificar conexão com Spotify:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar conexão com Spotify',
      error: error.message
    });
  }
};

/**
 * Desconecta o usuário do Spotify
 * @route POST /api/spotify/disconnect
 */
exports.disconnect = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    
    // Remover token do banco de dados
    await SpotifyToken.findOneAndDelete({ user: req.user._id });
    
    // Remover token do cache
    tokenManager.removeToken(userId, 'spotify');
    
    res.json({
      success: true,
      message: 'Desconectado do Spotify com sucesso'
    });
  } catch (error) {
    console.error('Erro ao desconectar do Spotify:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao desconectar do Spotify',
      error: error.message
    });
  }
};

/**
 * Busca podcasts no Spotify
 * @route GET /api/spotify/search-podcasts
 */
exports.searchPodcasts = async (req, res) => {
  try {
    const { query, limit } = req.query;
    const userId = req.user._id.toString();
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Termo de busca não fornecido'
      });
    }
    
    try {
      // Obter token fresco usando o tokenManager
      const token = await tokenManager.ensureFreshToken(userId, 'spotify');
      
      // Buscar podcasts usando o token fresco
      const podcasts = await spotifyService.searchPodcasts(
        token.accessToken,
        query,
        limit ? parseInt(limit) : 20
      );
      
      res.json({
        success: true,
        data: podcasts
      });
    } catch (tokenError) {
      console.error('Erro ao obter token do Spotify:', tokenError);
      return res.status(401).json({
        success: false,
        message: 'Você não está conectado ao Spotify ou sua conexão expirou',
        error: tokenError.message
      });
    }
  } catch (error) {
    console.error('Erro ao buscar podcasts no Spotify:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar podcasts',
      error: error.message
    });
  }
};

/**
 * Obtém detalhes de um podcast
 * @route GET /api/spotify/podcast/:id
 */
exports.getPodcastDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id.toString();
    
    try {
      // Obter token fresco usando o tokenManager
      const token = await tokenManager.ensureFreshToken(userId, 'spotify');
      
      // Obter detalhes do podcast usando o token fresco
      const podcastDetails = await spotifyService.getPodcastDetails(token.accessToken, id);
      
      res.json({
        success: true,
        data: podcastDetails
      });
    } catch (tokenError) {
      console.error('Erro ao obter token do Spotify:', tokenError);
      return res.status(401).json({
        success: false,
        message: 'Você não está conectado ao Spotify ou sua conexão expirou',
        error: tokenError.message
      });
    }
  } catch (error) {
    console.error('Erro ao obter detalhes do podcast:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter detalhes do podcast',
      error: error.message
    });
  }
};

/**
 * Obtém episódios de um podcast
 * @route GET /api/spotify/podcast/:id/episodes
 */
exports.getPodcastEpisodes = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit, offset } = req.query;
    const userId = req.user._id.toString();
    
    try {
      // Obter token fresco usando o tokenManager
      const token = await tokenManager.ensureFreshToken(userId, 'spotify');
      
      // Obter episódios do podcast usando o token fresco
      const episodes = await spotifyService.getPodcastEpisodes(
        token.accessToken,
        id,
        limit ? parseInt(limit) : 20,
        offset ? parseInt(offset) : 0
      );
      
      res.json({
        success: true,
        data: episodes
      });
    } catch (tokenError) {
      console.error('Erro ao obter token do Spotify:', tokenError);
      return res.status(401).json({
        success: false,
        message: 'Você não está conectado ao Spotify ou sua conexão expirou',
        error: tokenError.message
      });
    }
  } catch (error) {
    console.error('Erro ao obter episódios do podcast:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter episódios do podcast',
      error: error.message
    });
  }
};

/**
 * Obtém métricas de um episódio
 * @route GET /api/spotify/episode/:id/metrics
 */
exports.getEpisodeMetrics = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id.toString();
    
    try {
      // Obter token fresco usando o tokenManager
      const token = await tokenManager.ensureFreshToken(userId, 'spotify');
      
      // Obter métricas do episódio usando o token fresco
      const metrics = await spotifyService.getEpisodeMetrics(token.accessToken, id);
      
      res.json({
        success: true,
        data: metrics
      });
    } catch (tokenError) {
      console.error('Erro ao obter token do Spotify:', tokenError);
      return res.status(401).json({
        success: false,
        message: 'Você não está conectado ao Spotify ou sua conexão expirou',
        error: tokenError.message
      });
    }
  } catch (error) {
    console.error('Erro ao obter métricas do episódio:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter métricas do episódio',
      error: error.message
    });
  }
};