const tiktokService = require('../services/platforms/tiktok');
const TikTokToken = require('../models/TikTokToken');
const { isValidVideoFile } = require('../middleware/fileUpload');
const fs = require('fs');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);
const tokenManager = require('../utils/tokenManager');

/**
 * Redireciona para autorização do TikTok
 * @route GET /api/tiktok/auth
 */
exports.authorize = (req, res) => {
  try {
    // Definir URI de redirecionamento
    const redirectUri = process.env.TIKTOK_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/tiktok/callback`;
    
    // Gerar URL de autorização
    const authUrl = tiktokService.getAuthUrl(redirectUri);
    
    // Redirecionar para autorização
    res.redirect(authUrl);
  } catch (error) {
    console.error('Erro ao gerar URL de autorização do TikTok:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao iniciar autorização com TikTok',
      error: error.message
    });
  }
};

/**
 * Callback de autorização do TikTok
 * @route GET /api/tiktok/callback
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
    
    // Obter tokens
    const tokens = await tiktokService.getTokensFromCode(code);
    
    // Obter informações do perfil
    const profile = await tiktokService.getUserInfo(tokens.access_token, tokens.open_id);
    
    // Salvar ou atualizar tokens no banco de dados
    let tiktokToken = await TikTokToken.findOne({ user: req.user._id });
    
    if (tiktokToken) {
      // Atualizar token existente
      tiktokToken.access_token = tokens.access_token;
      tiktokToken.refresh_token = tokens.refresh_token;
      tiktokToken.open_id = tokens.open_id;
      tiktokToken.expires_in = tokens.expires_in;
      tiktokToken.expiry_date = tokens.expiry_date;
      tiktokToken.scope = tokens.scope;
      tiktokToken.profile = {
        username: profile.open_id, // TikTok API não retorna username diretamente
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        follower_count: profile.follower_count,
        following_count: profile.following_count,
        bio: profile.bio
      };
      tiktokToken.updatedAt = Date.now();
    } else {
      // Criar novo token
      tiktokToken = new TikTokToken({
        user: req.user._id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        open_id: tokens.open_id,
        expires_in: tokens.expires_in,
        expiry_date: tokens.expiry_date,
        scope: tokens.scope,
        profile: {
          username: profile.open_id, // TikTok API não retorna username diretamente
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          follower_count: profile.follower_count,
          following_count: profile.following_count,
          bio: profile.bio
        }
      });
    }
    
    await tiktokToken.save();
    
    // Adicionar token ao cache do tokenManager
    tokenManager.setToken(req.user._id.toString(), 'tiktok', {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date,
      openId: tokens.open_id
    });
    
    // Redirecionar para a página de configurações com indicação de sucesso
    res.redirect('/settings?connected=tiktok');
  } catch (error) {
    console.error('Erro na callback do TikTok:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar autorização do TikTok',
      error: error.message
    });
  }
};

/**
 * Verifica se o usuário está conectado ao TikTok
 * @route GET /api/tiktok/check-connection
 */
exports.checkConnection = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    
    try {
      // Usar o tokenManager para verificar e renovar o token se necessário
      const token = await tokenManager.ensureFreshToken(userId, 'tiktok');
      
      // Buscar informações do perfil do banco de dados
      const tiktokToken = await TikTokToken.findOne({ user: req.user._id });
      
      return res.json({
        success: true,
        connected: true,
        profile: tiktokToken ? tiktokToken.profile : null
      });
    } catch (tokenError) {
      // Se o token não existir ou não puder ser renovado
      console.log('Erro ao obter token do TikTok:', tokenError.message);
      return res.json({
        success: true,
        connected: false,
        message: tokenError.message
      });
    }
  } catch (error) {
    console.error('Erro ao verificar conexão com TikTok:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar conexão com TikTok',
      error: error.message
    });
  }
};

/**
 * Desconecta o usuário do TikTok
 * @route POST /api/tiktok/disconnect
 */
exports.disconnect = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    
    // Remover token do banco de dados
    await TikTokToken.findOneAndDelete({ user: req.user._id });
    
    // Remover token do cache
    tokenManager.removeToken(userId, 'tiktok');
    
    res.json({
      success: true,
      message: 'Desconectado do TikTok com sucesso'
    });
  } catch (error) {
    console.error('Erro ao desconectar do TikTok:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao desconectar do TikTok',
      error: error.message
    });
  }
};

/**
 * Faz upload de vídeo para o TikTok
 * @route POST /api/tiktok/upload
 */
exports.uploadVideo = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    
    // Verificar se há um arquivo de vídeo
    if (!req.files || !req.files.video) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum arquivo de vídeo fornecido'
      });
    }
    
    const videoFile = req.files.video;
    
    // Verificar se é um vídeo válido
    if (!isValidVideoFile(videoFile)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de arquivo inválido. Envie um vídeo válido (MP4, AVI, MOV)'
      });
    }
    
    try {
      // Obter token fresco usando o tokenManager
      const token = await tokenManager.ensureFreshToken(userId, 'tiktok');
      
      // Buscar open_id do banco de dados, se não estiver presente no token
      let openId = token.openId;
      if (!openId) {
        const tiktokTokenDB = await TikTokToken.findOne({ user: req.user._id });
        if (tiktokTokenDB) {
          openId = tiktokTokenDB.open_id;
        } else {
          throw new Error('Informações de perfil do TikTok não encontradas');
        }
      }
      
      // Preparar informações do vídeo
      const videoInfo = {
        title: req.body.title,
        description: req.body.description,
        hashtags: req.body.hashtags ? req.body.hashtags.split(',').map(tag => tag.trim()) : [],
        privacy_level: req.body.privacy_level || 'public',
        disable_comment: req.body.disable_comment === 'true',
        disable_duet: req.body.disable_duet === 'true',
        disable_stitch: req.body.disable_stitch === 'true'
      };
      
      try {
        // Fazer upload do vídeo usando o token fresco
        const uploadResult = await tiktokService.uploadVideo(
          token.accessToken,
          openId,
          videoFile.tempFilePath,
          videoInfo
        );
        
        // Remover arquivo temporário
        await unlinkAsync(videoFile.tempFilePath);
        
        res.status(201).json({
          success: true,
          message: 'Vídeo enviado com sucesso para o TikTok',
          data: uploadResult
        });
      } catch (error) {
        // Remover arquivo temporário em caso de erro
        if (videoFile.tempFilePath) {
          try {
            await unlinkAsync(videoFile.tempFilePath);
          } catch (unlinkError) {
            console.error('Erro ao remover arquivo temporário:', unlinkError);
          }
        }
        
        throw error;
      }
    } catch (tokenError) {
      console.error('Erro ao obter token do TikTok:', tokenError);
      return res.status(401).json({
        success: false,
        message: 'Você não está conectado ao TikTok ou sua conexão expirou',
        error: tokenError.message
      });
    }
  } catch (error) {
    console.error('Erro ao fazer upload de vídeo para o TikTok:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao fazer upload de vídeo para o TikTok',
      error: error.message
    });
  }
};

/**
 * Obtém vídeos do usuário do TikTok
 * @route GET /api/tiktok/videos
 */
exports.getUserVideos = async (req, res) => {
  try {
    const { cursor, maxCount } = req.query;
    const userId = req.user._id.toString();
    
    try {
      // Obter token fresco usando o tokenManager
      const token = await tokenManager.ensureFreshToken(userId, 'tiktok');
      
      // Buscar open_id do banco de dados, se não estiver presente no token
      let openId = token.openId;
      if (!openId) {
        const tiktokTokenDB = await TikTokToken.findOne({ user: req.user._id });
        if (tiktokTokenDB) {
          openId = tiktokTokenDB.open_id;
        } else {
          throw new Error('Informações de perfil do TikTok não encontradas');
        }
      }
      
      // Obter vídeos do usuário usando o token fresco
      const videos = await tiktokService.getUserVideos(
        token.accessToken,
        openId,
        cursor ? parseInt(cursor) : 0,
        maxCount ? parseInt(maxCount) : 20
      );
      
      res.json({
        success: true,
        data: videos
      });
    } catch (tokenError) {
      console.error('Erro ao obter token do TikTok:', tokenError);
      return res.status(401).json({
        success: false,
        message: 'Você não está conectado ao TikTok ou sua conexão expirou',
        error: tokenError.message
      });
    }
  } catch (error) {
    console.error('Erro ao obter vídeos do TikTok:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter vídeos do TikTok',
      error: error.message
    });
  }
};

/**
 * Obtém métricas de um vídeo específico
 * @route GET /api/tiktok/video/:id/metrics
 */
exports.getVideoMetrics = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id.toString();
    
    try {
      // Obter token fresco usando o tokenManager
      const token = await tokenManager.ensureFreshToken(userId, 'tiktok');
      
      // Buscar open_id do banco de dados, se não estiver presente no token
      let openId = token.openId;
      if (!openId) {
        const tiktokTokenDB = await TikTokToken.findOne({ user: req.user._id });
        if (tiktokTokenDB) {
          openId = tiktokTokenDB.open_id;
        } else {
          throw new Error('Informações de perfil do TikTok não encontradas');
        }
      }
      
      // Obter métricas do vídeo usando o token fresco
      const metrics = await tiktokService.getVideoMetrics(
        token.accessToken,
        openId,
        id
      );
      
      res.json({
        success: true,
        data: metrics
      });
    } catch (tokenError) {
      console.error('Erro ao obter token do TikTok:', tokenError);
      return res.status(401).json({
        success: false,
        message: 'Você não está conectado ao TikTok ou sua conexão expirou',
        error: tokenError.message
      });
    }
  } catch (error) {
    console.error('Erro ao obter métricas do vídeo TikTok:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter métricas do vídeo',
      error: error.message
    });
  }
};