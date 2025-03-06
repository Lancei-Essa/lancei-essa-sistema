const youtubeService = require('../services/youtube');
const YouTubeToken = require('../models/YouTubeToken');
const { isValidVideoFile } = require('../middleware/fileUpload');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);

// Obter URL de autenticação
exports.getAuthUrl = (req, res) => {
  try {
    // Obter informações do usuário, se necessário
    const userId = req.user ? req.user._id : null;
    console.log(`Gerando URL de autenticação para usuário: ${userId}`);
    
    // Gerar URL de autenticação
    const authUrl = youtubeService.getAuthUrl();
    
    console.log(`URL de autenticação gerada: ${authUrl}`);
    
    // Retornar a URL gerada
    res.json({ 
      success: true, 
      authUrl 
    });
  } catch (error) {
    console.error('Erro ao gerar URL de autenticação:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao gerar URL de autenticação', 
      error: error.message 
    });
  }
};

// Redirecionar para autorização do Google
exports.authorize = (req, res) => {
  const authUrl = youtubeService.getAuthUrl();
  res.redirect(authUrl);
};

// Callback de autorização
exports.authCallback = async (req, res) => {
  try {
    const { code } = req.query;
    const tokens = await youtubeService.getTokensFromCode(code);
    
    // Salvar ou atualizar tokens no banco de dados
    let youtubeToken = await YouTubeToken.findOne({ user: req.user._id });
    
    if (youtubeToken) {
      youtubeToken.access_token = tokens.access_token;
      youtubeToken.refresh_token = tokens.refresh_token || youtubeToken.refresh_token;
      youtubeToken.expiry_date = tokens.expiry_date;
      youtubeToken.token_scope = tokens.scope || youtubeToken.token_scope;
      youtubeToken.is_valid = true;
      youtubeToken.last_refreshed = Date.now();
      youtubeToken.updatedAt = Date.now();
    } else {
      youtubeToken = new YouTubeToken({
        user: req.user._id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
        token_scope: tokens.scope,
        is_valid: true,
        last_refreshed: Date.now()
      });
    }
    
    try {
      // Obter o ID do canal associado
      youtubeService.setCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date
      });
      
      const channelResponse = await youtubeService.getChannelInfo();
      if (channelResponse && channelResponse.items && channelResponse.items.length > 0) {
        youtubeToken.channel_id = channelResponse.items[0].id;
      }
    } catch (channelError) {
      console.error('Erro ao obter ID do canal:', channelError);
      // Não falhar por causa deste erro, já que o token ainda é válido
    }
    
    await youtubeToken.save();
    
    res.redirect('/settings'); // Redirecionar para página de configurações
  } catch (error) {
    console.error('Erro no callback de autorização:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro na autenticação com YouTube', 
      error: error.message 
    });
  }
};

// Verificar se o usuário está conectado ao YouTube
exports.checkConnection = async (req, res) => {
  try {
    const youtubeToken = await YouTubeToken.findOne({ user: req.user._id });
    
    if (!youtubeToken) {
      return res.json({ success: true, connected: false });
    }
    
    // Verificar se o token é válido
    if (!youtubeToken.is_valid) {
      return res.json({ 
        success: true, 
        connected: false, 
        status: 'invalid',
        message: 'O token não é mais válido'
      });
    }
    
    // Verificar se o token expirou
    if (youtubeToken.isExpired()) {
      try {
        // Tentar atualizar o token expirado
        const tokenDocument = await YouTubeToken.findById(youtubeToken._id).select('+refresh_token');
        
        if (!tokenDocument) {
          return res.json({ success: true, connected: false, status: 'missing' });
        }
        
        const decryptedTokens = tokenDocument.getDecryptedTokens();
        const refreshedTokens = await youtubeService.refreshAccessToken(decryptedTokens.refresh_token);
        
        // Atualizar token no banco de dados
        tokenDocument.access_token = refreshedTokens.access_token;
        tokenDocument.refresh_token = refreshedTokens.refresh_token || decryptedTokens.refresh_token;
        tokenDocument.expiry_date = refreshedTokens.expiry_date;
        tokenDocument.last_refreshed = Date.now();
        
        await tokenDocument.save();
        
        // Responder que está conectado, pois o token foi renovado
        return res.json({ success: true, connected: true, status: 'refreshed' });
      } catch (refreshError) {
        console.error('Erro ao renovar token:', refreshError);
        return res.json({ 
          success: true, 
          connected: false, 
          expired: true, 
          status: 'refresh_failed',
          message: 'Falha ao renovar token expirado'
        });
      }
    }
    
    // Configurar credenciais com token existente
    // Obter tokens descriptografados para uso
    const tokenWithSecrets = await YouTubeToken.findById(youtubeToken._id).select('+access_token +refresh_token');
    
    if (tokenWithSecrets) {
      const tokens = tokenWithSecrets.getDecryptedTokens();
      
      youtubeService.setCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date
      });
      
      // Atualizar hora do último uso
      tokenWithSecrets.last_used = Date.now();
      await tokenWithSecrets.save();
    }
    
    res.json({ 
      success: true, 
      connected: true,
      status: 'active',
      channel_id: youtubeToken.channel_id || null
    });
  } catch (error) {
    console.error('Erro ao verificar conexão com YouTube:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao verificar conexão com YouTube', 
      error: error.message 
    });
  }
};

// Upload de vídeo para o YouTube
exports.uploadVideo = async (req, res) => {
  try {
    // Verificar se há um arquivo de vídeo
    if (!req.files || !req.files.video) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nenhum arquivo de vídeo fornecido' 
      });
    }
    
    const videoFile = req.files.video;
    
    // Verificar se é um arquivo de vídeo válido
    if (!isValidVideoFile(videoFile)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Formato de arquivo inválido. Envie um arquivo de vídeo válido (MP4, MOV, AVI, WMV)' 
      });
    }
    
    // Obter token do YouTube com campos protegidos
    const youtubeToken = await YouTubeToken.findOne({ user: req.user._id });
    
    if (!youtubeToken) {
      return res.status(401).json({ 
        success: false, 
        message: 'Você não está autenticado no YouTube' 
      });
    }
    
    // Verificar se token é válido
    if (!youtubeToken.is_valid) {
      return res.status(401).json({
        success: false,
        message: 'Token do YouTube inválido. Por favor, reconecte sua conta.'
      });
    }
    
    // Verificar se o token expirou e, se necessário, atualizá-lo
    let tokens;
    
    if (youtubeToken.isExpired()) {
      try {
        const tokenDocument = await YouTubeToken.findById(youtubeToken._id).select('+access_token +refresh_token');
        const decryptedTokens = tokenDocument.getDecryptedTokens();
        const refreshedTokens = await youtubeService.refreshAccessToken(decryptedTokens.refresh_token);
        
        // Atualizar token no banco de dados
        tokenDocument.access_token = refreshedTokens.access_token;
        tokenDocument.refresh_token = refreshedTokens.refresh_token || decryptedTokens.refresh_token;
        tokenDocument.expiry_date = refreshedTokens.expiry_date;
        tokenDocument.last_refreshed = Date.now();
        
        await tokenDocument.save();
        
        tokens = {
          access_token: refreshedTokens.access_token,
          refresh_token: refreshedTokens.refresh_token || decryptedTokens.refresh_token,
          expiry_date: refreshedTokens.expiry_date
        };
      } catch (refreshError) {
        console.error('Erro ao renovar token para upload de vídeo:', refreshError);
        return res.status(401).json({
          success: false,
          message: 'Token expirado e não foi possível renovar. Por favor, reconecte sua conta.',
          error: refreshError.message
        });
      }
    } else {
      // Obter tokens descriptografados
      const tokenWithSecrets = await YouTubeToken.findById(youtubeToken._id).select('+access_token +refresh_token');
      tokens = tokenWithSecrets.getDecryptedTokens();
      
      // Atualizar último uso
      tokenWithSecrets.last_used = Date.now();
      await tokenWithSecrets.save();
    }
    
    // Configurar credenciais
    youtubeService.setCredentials(tokens);
    
    // Preparar metadados do vídeo
    const metadata = {
      title: req.body.title || 'Vídeo Lancei Essa',
      description: req.body.description || 'Vídeo enviado pelo sistema Lancei Essa',
      tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : ['lancei essa', 'podcast'],
      privacyStatus: req.body.privacyStatus || 'unlisted',
      publishAt: req.body.publishAt || undefined
    };
    
    // Fazer upload para o YouTube
    const uploadedVideo = await youtubeService.uploadVideo(videoFile, metadata);
    
    // Remover arquivo temporário após upload
    await unlinkAsync(videoFile.tempFilePath);
    
    res.status(201).json({
      success: true,
      message: 'Vídeo enviado com sucesso',
      videoId: uploadedVideo.id,
      videoUrl: `https://www.youtube.com/watch?v=${uploadedVideo.id}`
    });
  } catch (error) {
    console.error('Erro ao fazer upload de vídeo:', error);
    
    // Remover arquivo temporário em caso de erro
    if (req.files && req.files.video && req.files.video.tempFilePath) {
      try {
        await unlinkAsync(req.files.video.tempFilePath);
      } catch (unlinkError) {
        console.error('Erro ao remover arquivo temporário:', unlinkError);
      }
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao fazer upload de vídeo', 
      error: error.message 
    });
  }
};

// Obter informações de um vídeo
exports.getVideoInfo = async (req, res) => {
  try {
    const { videoId } = req.params;
    
    // Obter token do YouTube
    const youtubeToken = await YouTubeToken.findOne({ user: req.user._id });
    
    if (!youtubeToken) {
      return res.status(401).json({ 
        success: false, 
        message: 'Você não está autenticado no YouTube' 
      });
    }
    
    // Configurar credenciais
    youtubeService.setCredentials({
      access_token: youtubeToken.access_token,
      refresh_token: youtubeToken.refresh_token,
      expiry_date: youtubeToken.expiry_date
    });
    
    // Obter informações do vídeo
    const videoInfo = await youtubeService.getVideoInfo(videoId);
    
    res.json({
      success: true,
      data: videoInfo
    });
  } catch (error) {
    console.error('Erro ao obter informações do vídeo:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao obter informações do vídeo', 
      error: error.message 
    });
  }
};

// Obter estatísticas do canal
exports.getChannelStats = async (req, res) => {
  try {
    // Obter token do YouTube
    const youtubeToken = await YouTubeToken.findOne({ user: req.user._id });
    
    if (!youtubeToken) {
      return res.status(401).json({ 
        success: false, 
        message: 'Você não está autenticado no YouTube' 
      });
    }
    
    // Configurar credenciais
    youtubeService.setCredentials({
      access_token: youtubeToken.access_token,
      refresh_token: youtubeToken.refresh_token,
      expiry_date: youtubeToken.expiry_date
    });
    
    // Obter informações do canal
    // Primeiro precisamos obter o ID do canal vinculado à conta
    const response = await youtubeService.getChannelInfo();
    
    // Verificar se temos dados do canal
    if (!response || !response.items || response.items.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Não foi possível encontrar o canal associado à sua conta'
      });
    }
    
    // Canal encontrado
    const channelData = response.items[0];
    
    res.json({
      success: true,
      data: {
        id: channelData.id,
        title: channelData.snippet.title,
        description: channelData.snippet.description,
        customUrl: channelData.snippet.customUrl,
        thumbnails: channelData.snippet.thumbnails,
        statistics: channelData.statistics
      }
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas do canal:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao obter estatísticas do canal', 
      error: error.message 
    });
  }
};

// Agendar vídeo para publicação
exports.scheduleVideo = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { publishAt } = req.body;
    
    // Validar data de publicação
    if (!publishAt) {
      return res.status(400).json({ 
        success: false, 
        message: 'Data de publicação não fornecida' 
      });
    }
    
    // Verificar se a data é futura
    const publishDate = new Date(publishAt);
    if (publishDate <= new Date()) {
      return res.status(400).json({ 
        success: false, 
        message: 'A data de publicação deve ser no futuro' 
      });
    }
    
    // Obter token do YouTube
    const youtubeToken = await YouTubeToken.findOne({ user: req.user._id });
    
    if (!youtubeToken) {
      return res.status(401).json({ 
        success: false, 
        message: 'Você não está autenticado no YouTube' 
      });
    }
    
    // Configurar credenciais
    youtubeService.setCredentials({
      access_token: youtubeToken.access_token,
      refresh_token: youtubeToken.refresh_token,
      expiry_date: youtubeToken.expiry_date
    });
    
    // Agendar vídeo
    const scheduledVideo = await youtubeService.scheduleVideo(videoId, publishAt);
    
    res.json({
      success: true,
      message: 'Vídeo agendado com sucesso',
      data: scheduledVideo
    });
  } catch (error) {
    console.error('Erro ao agendar vídeo:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao agendar vídeo', 
      error: error.message 
    });
  }
};