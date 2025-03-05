const twitterService = require('../services/platforms/twitter');
const TwitterToken = require('../models/TwitterToken');
const User = require('../models/User');
const { isValidImageFile } = require('../middleware/fileUpload');
const fs = require('fs');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);
const jwt = require('jsonwebtoken');

// Configurações do OAuth do Twitter
const TWITTER_API_KEY = process.env.TWITTER_API_KEY;
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET;
const TWITTER_REDIRECT_URI = process.env.TWITTER_REDIRECT_URI || 'http://localhost:5000/api/twitter/callback';

/**
 * Retorna a URL de autorização OAuth do Twitter
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 */
exports.getAuthUrl = async (req, res) => {
  try {
    if (!TWITTER_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'Configuração do Twitter não encontrada no servidor'
      });
    }
    
    // Requisitar URL de autorização ao serviço
    const response = await twitterService.getAuthUrl(TWITTER_API_KEY, TWITTER_REDIRECT_URI);
    
    if (!response.success) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao gerar URL de autorização',
        error: response.error
      });
    }
    
    // Armazenar estado de OAuth
    if (req.session) {
      req.session.twitterOAuthState = response.state;
      req.session.twitterOAuthUserId = req.user._id;
    }
    
    res.json({
      success: true,
      authUrl: response.authUrl
    });
  } catch (error) {
    console.error('Erro ao gerar URL de autorização Twitter:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar URL de autorização',
      error: error.message
    });
  }
};

/**
 * Inicia o processo de autorização OAuth com Twitter
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 */
exports.initiateAuth = async (req, res) => {
  try {
    if (!TWITTER_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'Configuração do Twitter não encontrada no servidor'
      });
    }
    
    // Obter o ID do usuário a partir do token JWT na query (se disponível)
    let userId = null;
    if (req.query.token) {
      try {
        const decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch (err) {
        console.error('Token inválido:', err);
      }
    }
    
    // Requisitar URL de autorização ao serviço
    const response = await twitterService.getAuthUrl(TWITTER_API_KEY, TWITTER_REDIRECT_URI);
    
    if (!response.success) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao gerar URL de autorização',
        error: response.error
      });
    }
    
    // Armazenar estado de OAuth
    if (req.session) {
      req.session.twitterOAuthState = response.state;
      if (userId) {
        req.session.twitterOAuthUserId = userId;
      }
    }
    
    // Redirecionar para a página de autorização do Twitter
    res.redirect(response.authUrl);
  } catch (error) {
    console.error('Erro ao iniciar autenticação com Twitter:', error);
    res.status(500).send('Erro ao iniciar autenticação com Twitter: ' + error.message);
  }
};

/**
 * Processa o callback de autorização do Twitter
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 */
exports.handleAuthCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.status(400).send('Código de autorização não fornecido');
    }
    
    // Verificar estado de OAuth para segurança
    if (req.session && req.session.twitterOAuthState !== state) {
      return res.status(403).send('Estado de OAuth inválido');
    }
    
    // Obter o userId da sessão
    const userId = req.session ? req.session.twitterOAuthUserId : null;
    
    if (!userId) {
      return res.status(400).send('Sessão de autorização expirada ou inválida');
    }
    
    // Trocar o código de autorização por um token de acesso
    const tokenResponse = await twitterService.exchangeCodeForToken(
      code, 
      TWITTER_API_KEY, 
      TWITTER_API_SECRET, 
      TWITTER_REDIRECT_URI
    );
    
    if (!tokenResponse.success) {
      return res.status(500).send('Erro ao obter token de acesso: ' + tokenResponse.error);
    }
    
    // Obter informações do perfil do usuário
    const profileResponse = await twitterService.getUserProfile(tokenResponse.access_token);
    
    if (!profileResponse.success) {
      return res.status(500).send('Erro ao obter informações do perfil: ' + profileResponse.error);
    }
    
    // Salvar ou atualizar token no banco de dados
    let twitterToken = await TwitterToken.findOne({ user: userId });
    
    const expiryDate = new Date();
    expiryDate.setSeconds(expiryDate.getSeconds() + tokenResponse.expires_in);
    
    if (twitterToken) {
      twitterToken.access_token = tokenResponse.access_token;
      twitterToken.refresh_token = tokenResponse.refresh_token || null;
      twitterToken.expires_in = tokenResponse.expires_in;
      twitterToken.expiry_date = expiryDate;
      twitterToken.token_type = 'oauth2';
      twitterToken.scope = tokenResponse.scope;
      twitterToken.status = 'active';
      twitterToken.profile = profileResponse.data;
      twitterToken.updatedAt = Date.now();
    } else {
      twitterToken = new TwitterToken({
        user: userId,
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token || null,
        expires_in: tokenResponse.expires_in,
        expiry_date: expiryDate,
        token_type: 'oauth2',
        scope: tokenResponse.scope,
        status: 'active',
        profile: profileResponse.data
      });
    }
    
    await twitterToken.save();
    
    // Atualizar status de conexão no usuário
    await User.findByIdAndUpdate(userId, {
      'socialConnections.twitter.connected': true,
      'socialConnections.twitter.lastConnected': new Date()
    });
    
    // Limpar a sessão
    if (req.session) {
      delete req.session.twitterOAuthState;
      delete req.session.twitterOAuthUserId;
    }
    
    // Redirecionar para a página de sucesso
    res.redirect('/social-media?platform=twitter&status=success');
  } catch (error) {
    console.error('Erro no callback do Twitter:', error);
    res.status(500).send('Erro ao processar autenticação do Twitter: ' + error.message);
  }
};

/**
 * Verificar conexão com o Twitter
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 */
exports.checkConnection = async (req, res) => {
  try {
    const twitterToken = await TwitterToken.findOne({ user: req.user._id });
    
    if (!twitterToken) {
      return res.json({ 
        success: true, 
        connected: false 
      });
    }
    
    // Verificar se o token expirou (apenas para OAuth 2.0)
    const expired = twitterToken.token_type === 'oauth2' ? twitterToken.isExpired() : false;
    
    if (expired && twitterToken.refresh_token) {
      try {
        // Tentar renovar o token
        const newTokens = await twitterService.refreshToken(
          twitterToken.refresh_token,
          TWITTER_API_KEY,
          TWITTER_API_SECRET
        );
        
        if (newTokens.success) {
          // Atualizar token no banco de dados
          const expiryDate = new Date();
          expiryDate.setSeconds(expiryDate.getSeconds() + newTokens.expires_in);
          
          twitterToken.access_token = newTokens.access_token;
          twitterToken.refresh_token = newTokens.refresh_token || twitterToken.refresh_token;
          twitterToken.expires_in = newTokens.expires_in;
          twitterToken.expiry_date = expiryDate;
          twitterToken.status = 'active';
          twitterToken.updatedAt = Date.now();
          
          await twitterToken.save();
          
          // Atualizar status de conexão no usuário
          await User.findByIdAndUpdate(req.user._id, {
            'socialConnections.twitter.lastConnected': new Date()
          });
          
          return res.json({
            success: true,
            connected: true,
            refreshed: true,
            profile: twitterToken.profile
          });
        } else {
          return res.json({
            success: true,
            connected: true,
            expired: true,
            profile: twitterToken.profile
          });
        }
      } catch (refreshError) {
        console.error('Erro ao renovar token do Twitter:', refreshError);
        return res.json({
          success: true,
          connected: true,
          expired: true,
          profile: twitterToken.profile
        });
      }
    }
    
    // Token ainda é válido
    res.json({
      success: true,
      connected: true,
      expired: expired,
      profile: twitterToken.profile
    });
  } catch (error) {
    console.error('Erro ao verificar conexão com Twitter:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao verificar conexão com Twitter', 
      error: error.message 
    });
  }
};

/**
 * Desconectar do Twitter
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 */
exports.disconnect = async (req, res) => {
  try {
    // Buscar token do Twitter
    const twitterToken = await TwitterToken.findOne({ user: req.user._id });
    
    if (twitterToken) {
      // Revogar token no Twitter, se for OAuth 2.0
      if (twitterToken.token_type === 'oauth2' && twitterToken.access_token) {
        try {
          await twitterService.revokeToken(
            twitterToken.access_token, 
            TWITTER_API_KEY, 
            TWITTER_API_SECRET
          );
        } catch (revokeError) {
          console.warn('Erro ao revogar token do Twitter:', revokeError);
          // Continuamos mesmo se falhar a revogação, para garantir que o usuário seja desconectado localmente
        }
      }
      
      // Remover token do banco de dados
      await TwitterToken.findOneAndDelete({ user: req.user._id });
    }
    
    // Atualizar status de conexão no usuário
    await User.findByIdAndUpdate(req.user._id, {
      'socialConnections.twitter.connected': false
    });
    
    res.json({
      success: true,
      message: 'Desconectado do Twitter com sucesso'
    });
  } catch (error) {
    console.error('Erro ao desconectar do Twitter:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao desconectar do Twitter', 
      error: error.message 
    });
  }
};

/**
 * Postar tweet de texto
 * @route POST /api/twitter/tweet
 */
exports.postTweet = async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'O texto do tweet é obrigatório'
      });
    }
    
    // Limitar o texto a 280 caracteres (limite do Twitter)
    if (text.length > 280) {
      return res.status(400).json({
        success: false,
        message: 'O texto do tweet não pode exceder 280 caracteres'
      });
    }
    
    // Obter token do Twitter
    const twitterToken = await TwitterToken.findOne({ user: req.user._id });
    
    if (!twitterToken) {
      return res.status(401).json({
        success: false,
        message: 'Você não está autenticado no Twitter'
      });
    }
    
    // Verificar se o token expirou
    if (twitterToken.isExpired()) {
      return res.status(401).json({
        success: false,
        message: 'Sua autenticação com o Twitter expirou, reconecte-se'
      });
    }
    
    // Postar tweet
    const tweetResult = await twitterService.postTweet(twitterToken.access_token, text);
    
    res.status(201).json({
      success: true,
      message: 'Tweet publicado com sucesso',
      data: {
        id: tweetResult.data.id,
        text: tweetResult.data.text,
        url: `https://twitter.com/${twitterToken.profile.username}/status/${tweetResult.data.id}`
      }
    });
  } catch (error) {
    console.error('Erro ao postar tweet:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao postar tweet', 
      error: error.message 
    });
  }
};

/**
 * Postar tweet com imagem
 * @route POST /api/twitter/tweet/media
 */
exports.postTweetWithMedia = async (req, res) => {
  try {
    const { text } = req.body;
    
    // Verificar se há um arquivo de imagem
    if (!req.files || !req.files.media) {
      return res.status(400).json({
        success: false,
        message: 'Nenhuma mídia fornecida'
      });
    }
    
    const mediaFile = req.files.media;
    
    // Verificar se é uma imagem válida
    if (!isValidImageFile(mediaFile)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de arquivo inválido. Envie uma imagem válida (JPG, PNG)'
      });
    }
    
    // Obter token do Twitter
    const twitterToken = await TwitterToken.findOne({ user: req.user._id });
    
    if (!twitterToken) {
      return res.status(401).json({
        success: false,
        message: 'Você não está autenticado no Twitter'
      });
    }
    
    // Verificar se o token expirou
    if (twitterToken.isExpired()) {
      return res.status(401).json({
        success: false,
        message: 'Sua autenticação com o Twitter expirou, reconecte-se'
      });
    }
    
    try {
      // Ler o arquivo
      const mediaData = await fs.promises.readFile(mediaFile.tempFilePath);
      
      // Fazer upload da mídia
      const mediaId = await twitterService.uploadMedia(
        twitterToken.access_token, 
        mediaData, 
        mediaFile.mimetype
      );
      
      // Postar tweet com mídia
      const tweetResult = await twitterService.postTweetWithMedia(
        twitterToken.access_token, 
        text || '', 
        mediaId
      );
      
      // Remover arquivo temporário
      await unlinkAsync(mediaFile.tempFilePath);
      
      res.status(201).json({
        success: true,
        message: 'Tweet com mídia publicado com sucesso',
        data: {
          id: tweetResult.data.id,
          text: tweetResult.data.text,
          url: `https://twitter.com/${twitterToken.profile.username}/status/${tweetResult.data.id}`
        }
      });
    } catch (error) {
      // Remover arquivo temporário em caso de erro
      if (mediaFile.tempFilePath) {
        try {
          await unlinkAsync(mediaFile.tempFilePath);
        } catch (unlinkError) {
          console.error('Erro ao remover arquivo temporário:', unlinkError);
        }
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Erro ao postar tweet com mídia:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao postar tweet com mídia', 
      error: error.message 
    });
  }
};

/**
 * Obter métricas de um tweet
 * @route GET /api/twitter/tweet/:id/metrics
 */
exports.getTweetMetrics = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Obter token do Twitter
    const twitterToken = await TwitterToken.findOne({ user: req.user._id });
    
    if (!twitterToken) {
      return res.status(401).json({
        success: false,
        message: 'Você não está autenticado no Twitter'
      });
    }
    
    // Verificar se o token expirou
    if (twitterToken.isExpired()) {
      return res.status(401).json({
        success: false,
        message: 'Sua autenticação com o Twitter expirou, reconecte-se'
      });
    }
    
    // Obter métricas do tweet
    const tweetMetrics = await twitterService.getTweetMetrics(twitterToken.access_token, id);
    
    res.json({
      success: true,
      data: tweetMetrics
    });
  } catch (error) {
    console.error('Erro ao obter métricas do tweet:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao obter métricas do tweet', 
      error: error.message 
    });
  }
};

/**
 * Obter informações do usuário do Twitter
 * @route GET /api/twitter/user
 */
exports.getUserInfo = async (req, res) => {
  try {
    // Obter token do Twitter
    const twitterToken = await TwitterToken.findOne({ user: req.user._id });
    
    if (!twitterToken) {
      return res.status(401).json({
        success: false,
        message: 'Você não está autenticado no Twitter'
      });
    }
    
    // Verificar se o token expirou
    if (twitterToken.isExpired()) {
      return res.status(401).json({
        success: false,
        message: 'Sua autenticação com o Twitter expirou, reconecte-se'
      });
    }
    
    // Obter informações do usuário
    const userInfo = await twitterService.getUserInfo(twitterToken.access_token);
    
    // Atualizar perfil no token
    twitterToken.profile = {
      id: userInfo.id,
      username: userInfo.username,
      name: userInfo.name,
      profile_image_url: userInfo.profile_image_url
    };
    
    await twitterToken.save();
    
    res.json({
      success: true,
      data: userInfo
    });
  } catch (error) {
    console.error('Erro ao obter informações do usuário do Twitter:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao obter informações do usuário do Twitter', 
      error: error.message 
    });
  }
};