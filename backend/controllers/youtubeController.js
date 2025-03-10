const youtubeService = require('../services/youtube');
const YouTubeToken = require('../models/YouTubeToken');
const { isValidVideoFile } = require('../middleware/fileUpload');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);

// Obter URL de autenticação
exports.getAuthUrl = async (req, res) => {
  try {
    // Obter informações do usuário
    const userId = req.user ? req.user._id : null;
    if (!userId) {
      console.error('Usuário não autenticado ao tentar obter URL de autenticação YouTube');
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }
    
    console.log(`[YouTube Controller] Gerando URL de autenticação para usuário: ${userId}`);
    
    try {
      // Buscar usuário e empresa associada
      const User = require('../models/User');
      const Company = require('../models/Company');
      
      const user = await User.findById(userId).populate('company');
      console.log(`[YouTube Controller] Usuário encontrado:`, user ? 'Sim' : 'Não');
      
      let companyCredentials = null;
      
      // Verificar se o usuário pertence a uma empresa com credenciais configuradas
      if (user && user.company) {
        console.log(`[YouTube Controller] Usuário pertence à empresa: ${user.company.name}`);
        
        try {
          // Buscar empresa com credenciais
          const company = await Company.findById(user.company._id)
            .select('+oauthCredentials.youtube.client_id +oauthCredentials.youtube.client_secret');
          
          if (company && 
              company.oauthCredentials && 
              company.oauthCredentials.youtube && 
              company.oauthCredentials.youtube.enabled) {
            
            // Obter credenciais descriptografadas
            companyCredentials = company.getPlatformCredentials('youtube');
            console.log('[YouTube Controller] Usando credenciais específicas da empresa');
          } else {
            console.log('[YouTube Controller] Empresa não tem credenciais específicas para YouTube ou não estão habilitadas');
          }
        } catch (companyError) {
          console.error('[YouTube Controller] Erro ao obter credenciais da empresa:', companyError);
          // Continuar usando credenciais do ambiente
        }
      } else {
        console.log('[YouTube Controller] Usuário não está associado a nenhuma empresa ou não foi encontrado');
      }
      
      // Gerar URL de autenticação usando credenciais específicas ou padrão
      console.log('[YouTube Controller] Chamando youtubeService.getAuthUrl()...');
      const authUrl = youtubeService.getAuthUrl(companyCredentials);
      
      console.log(`[YouTube Controller] URL de autenticação gerada com sucesso: ${authUrl}`);
      
      // Retornar a URL gerada
      return res.json({ 
        success: true, 
        authUrl 
      });
    } catch (lookupError) {
      console.error('[YouTube Controller] Erro ao procurar usuário/empresa:', lookupError);
      
      // Tentar gerar URL mesmo sem informações da empresa
      console.log('[YouTube Controller] Tentando gerar URL com configurações do ambiente...');
      const authUrl = youtubeService.getAuthUrl(null);
      
      console.log(`[YouTube Controller] URL de backup gerada: ${authUrl}`);
      
      return res.json({ 
        success: true, 
        authUrl,
        note: 'Usando configuração global do ambiente'
      });
    }
  } catch (error) {
    console.error('[YouTube Controller] ERRO CRÍTICO ao gerar URL de autenticação:', error);
    console.error('[YouTube Controller] Stack trace:', error.stack);
    
    return res.status(500).json({ 
      success: false, 
      message: 'Erro ao gerar URL de autenticação', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Redirecionar para autorização do Google
exports.authorize = (req, res) => {
  try {
    console.log('[YouTube Controller] Iniciando authorize (redirecionamento direto)');
    
    // Obter informações do usuário
    const userId = req.user ? req.user._id : null;
    if (!userId) {
      console.error('[YouTube Controller] authorize: Usuário não autenticado');
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }
    
    console.log(`[YouTube Controller] authorize: Gerando URL para usuário: ${userId}`);
    
    // Enviamos o ID do usuário como state para poder identificá-lo no callback
    const authUrl = youtubeService.getAuthUrl(null);
    console.log(`[YouTube Controller] authorize: Redirecionando para ${authUrl}`);
    
    return res.redirect(authUrl);
  } catch (error) {
    console.error('[YouTube Controller] ERRO em authorize:', error);
    
    // Ao invés de dar um erro 500, renderizamos uma página de erro
    const errorHtml = `
      <html>
        <head>
          <title>Erro na Autorização</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: red; font-size: 18px; }
            .details { margin: 20px; padding: 10px; background: #f8f8f8; text-align: left; border-radius: 5px; }
            button { padding: 10px 15px; margin-top: 20px; cursor: pointer; }
          </style>
        </head>
        <body>
          <h1>Erro na Autorização</h1>
          <p class="error">${error.message}</p>
          
          <div class="details">
            <p><strong>Detalhes técnicos:</strong></p>
            <pre>${error.stack || 'Sem stack trace disponível'}</pre>
          </div>
          
          <p>Ocorreu um erro ao iniciar o processo de autorização. Por favor, tente novamente ou contate o suporte.</p>
          <button onclick="window.close()">Fechar</button>
          <button onclick="window.location.href='/settings'">Voltar às Configurações</button>
        </body>
      </html>
    `;
    
    return res.status(500).send(errorHtml);
  }
};

// Callback de autorização
exports.authCallback = async (req, res) => {
  try {
    const { code } = req.query;
    
    // Buscar usuário e empresa associada
    const User = require('../models/User');
    const Company = require('../models/Company');
    
    const user = await User.findById(req.user._id).populate('company');
    
    let companyCredentials = null;
    let companyId = null;
    
    // Verificar se o usuário pertence a uma empresa com credenciais configuradas
    if (user.company) {
      companyId = user.company._id;
      console.log(`Usuário pertence à empresa: ${user.company.name}`);
      
      // Buscar empresa com credenciais
      const company = await Company.findById(companyId)
        .select('+oauthCredentials.youtube.client_id +oauthCredentials.youtube.client_secret');
      
      if (company && 
          company.oauthCredentials && 
          company.oauthCredentials.youtube && 
          company.oauthCredentials.youtube.enabled) {
        
        // Obter credenciais descriptografadas
        companyCredentials = company.getPlatformCredentials('youtube');
        console.log('Usando credenciais específicas da empresa para obter tokens');
      }
    }
    
    // Obter tokens usando credenciais específicas ou padrão
    const tokens = await youtubeService.getTokensFromCode(code, companyCredentials);
    
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
      
      // Associar à empresa se ainda não estiver associado
      if (companyId && !youtubeToken.company) {
        youtubeToken.company = companyId;
      }
    } else {
      youtubeToken = new YouTubeToken({
        user: req.user._id,
        company: companyId, // Associar à empresa
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
        token_scope: tokens.scope,
        is_valid: true,
        last_refreshed: Date.now()
      });
    }
    
    try {
      // Criar cliente OAuth específico para esta operação
      let oauthClient;
      if (companyCredentials) {
        oauthClient = youtubeService.setCredentials({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: tokens.expiry_date
        }, createOAuth2Client(companyCredentials));
      } else {
        youtubeService.setCredentials({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: tokens.expiry_date
        });
      }
      
      // Obter o ID do canal associado
      const channelResponse = await youtubeService.getChannelInfo();
      if (channelResponse && channelResponse.items && channelResponse.items.length > 0) {
        youtubeToken.channel_id = channelResponse.items[0].id;
      }
    } catch (channelError) {
      console.error('Erro ao obter ID do canal:', channelError);
      // Não falhar por causa deste erro, já que o token ainda é válido
    }
    
    await youtubeToken.save();
    
    // Atualizar status de conexão do usuário
    await User.findByIdAndUpdate(req.user._id, {
      'socialConnections.youtube.connected': true,
      'socialConnections.youtube.lastConnected': Date.now()
    });
    
    // Redirecionar para página de sucesso
    res.redirect('/status-dashboard?success=youtube');
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

// Obter métricas atuais do YouTube
exports.getMetrics = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`[YouTube Metrics] Iniciando getMetrics para usuário: ${userId}`);

    // Obter token do YouTube com campos protegidos
    const youtubeToken = await YouTubeToken.findOne({ user: userId });
    console.log(`[YouTube Metrics] Token encontrado: ${youtubeToken ? 'Sim' : 'Não'}`);
    
    if (!youtubeToken) {
      console.log(`[YouTube Metrics] Nenhum token do YouTube encontrado para o usuário ${userId}`);
      return res.status(401).json({ 
        success: false, 
        message: 'Você não está autenticado no YouTube' 
      });
    }

    console.log(`[YouTube Metrics] Token válido: ${!youtubeToken.isExpired() ? 'Sim' : 'Não'}`);
    console.log(`[YouTube Metrics] Token ID do canal: ${youtubeToken.channel_id || 'Não definido'}`);

    // Verificar se o token expirou e obter tokens descriptografados
    let tokens;
    if (youtubeToken.isExpired()) {
      console.log(`[YouTube Metrics] Token expirado, tentando renovar`);
      try {
        const tokenDocument = await YouTubeToken.findById(youtubeToken._id).select('+access_token +refresh_token');
        const decryptedTokens = tokenDocument.getDecryptedTokens();
        console.log(`[YouTube Metrics] Refresh token obtido: ${Boolean(decryptedTokens.refresh_token)}`);
        
        const refreshedTokens = await youtubeService.refreshAccessToken(decryptedTokens.refresh_token);
        console.log(`[YouTube Metrics] Token renovado com sucesso`);
        
        // Atualizar token no banco de dados
        tokenDocument.access_token = refreshedTokens.access_token;
        tokenDocument.refresh_token = refreshedTokens.refresh_token || decryptedTokens.refresh_token;
        tokenDocument.expiry_date = refreshedTokens.expiry_date;
        tokenDocument.last_refreshed = Date.now();
        
        await tokenDocument.save();
        console.log(`[YouTube Metrics] Token atualizado no banco de dados`);
        
        tokens = {
          access_token: refreshedTokens.access_token,
          refresh_token: refreshedTokens.refresh_token || decryptedTokens.refresh_token,
          expiry_date: refreshedTokens.expiry_date
        };
      } catch (refreshError) {
        console.error('[YouTube Metrics] ERRO ao renovar token do YouTube:', refreshError);
        return res.status(401).json({ 
          success: false, 
          message: 'Falha ao renovar token do YouTube' 
        });
      }
    } else {
      // Obter tokens descriptografados
      console.log(`[YouTube Metrics] Token válido, obtendo credenciais`);
      const tokenWithSecrets = await YouTubeToken.findById(youtubeToken._id).select('+access_token +refresh_token');
      tokens = tokenWithSecrets.getDecryptedTokens();
      console.log(`[YouTube Metrics] Credenciais obtidas com sucesso`);
      
      // Atualizar último uso
      tokenWithSecrets.last_used = Date.now();
      await tokenWithSecrets.save();
    }

    // Configurar credenciais
    console.log(`[YouTube Metrics] Configurando credenciais no youtubeService`);
    youtubeService.setCredentials(tokens);

    // Obter informações do canal
    console.log(`[YouTube Metrics] Chamando youtubeService.getChannelInfo()`);
    const channelInfo = await youtubeService.getChannelInfo();
    console.log(`[YouTube Metrics] Resposta de getChannelInfo:`, 
      channelInfo && channelInfo.items ? `Itens: ${channelInfo.items.length}` : 'Sem itens');
    
    if (!channelInfo || !channelInfo.items || channelInfo.items.length === 0) {
      console.log(`[YouTube Metrics] ERRO: Não foi possível obter informações do canal`);
      return res.status(404).json({ 
        success: false, 
        message: 'Não foi possível obter informações do canal' 
      });
    }

    // Obter lista de vídeos do canal
    console.log(`[YouTube Metrics] Chamando youtubeService.getChannelVideos(50)`);
    const videos = await youtubeService.getChannelVideos(50); // Aumente para 50 ou mais para ter uma amostra maior
    console.log(`[YouTube Metrics] Resposta de getChannelVideos:`, 
      videos && videos.items ? `Vídeos: ${videos.items.length}` : 'Sem vídeos');
    
    const videosList = videos.items || [];

    // Obter estatísticas de cada vídeo
    const videoIds = videosList.map(video => video.id.videoId).join(',');
    console.log(`[YouTube Metrics] IDs de vídeo obtidos: ${videoIds || 'Nenhum'}`);
    
    let videoStats = { items: [] };
    if (videoIds) {
      console.log(`[YouTube Metrics] Chamando youtubeService.getVideosStats()`);
      videoStats = await youtubeService.getVideosStats(videoIds);
      console.log(`[YouTube Metrics] Estatísticas obtidas:`, 
        videoStats && videoStats.items ? `Itens: ${videoStats.items.length}` : 'Sem estatísticas');
    } else {
      console.log(`[YouTube Metrics] Pulando getVideosStats() porque não há IDs de vídeo`);
    }

    // Combinar informações de vídeos com estatísticas
    console.log(`[YouTube Metrics] Combinando informações de vídeos com estatísticas`);
    const videosWithStats = videosList.map(video => {
      const stats = videoStats.items.find(item => item.id === video.id.videoId);
      console.log(`[YouTube Metrics] Vídeo ${video.id.videoId}: ${stats ? 'Estatísticas encontradas' : 'Sem estatísticas'}`);
      
      return {
        id: video.id.videoId,
        title: video.snippet.title,
        description: video.snippet.description,
        publishedAt: video.snippet.publishedAt,
        thumbnail: video.snippet.thumbnails.medium.url,
        statistics: stats ? stats.statistics : { viewCount: 0, likeCount: 0, commentCount: 0 }
      };
    });

    // Obter comentários recentes
    console.log(`[YouTube Metrics] Chamando youtubeService.getRecentComments()`);
    const recentComments = await youtubeService.getRecentComments();
    console.log(`[YouTube Metrics] Comentários obtidos:`, 
      recentComments && recentComments.items ? `Comentários: ${recentComments.items.length}` : 'Sem comentários');

    // Calcular métricas totais ANTES de chamar analytics
    console.log(`[YouTube Metrics] Calculando métricas totais`);
    const channelData = channelInfo.items[0];
    const totalViews = parseInt(channelData.statistics.viewCount) || 0;
    const totalSubscribers = parseInt(channelData.statistics.subscriberCount) || 0;
    const totalVideos = parseInt(channelData.statistics.videoCount) || 0;

    // Calcular totais de likes e comentários dos vídeos
    const totalLikes = videoStats.items.reduce((sum, video) => 
      sum + parseInt(video.statistics.likeCount || 0), 0);
    const totalComments = videoStats.items.reduce((sum, video) => 
      sum + parseInt(video.statistics.commentCount || 0), 0);

    console.log(`[YouTube Metrics] Métricas totais calculadas:`, {
      views: totalViews,
      subscribers: totalSubscribers,
      videos: totalVideos,
      likes: totalLikes,
      comments: totalComments
    });

    // Gerar gráfico com dados reais dos vídeos do canal
    console.log(`[YouTube Metrics] Gerando gráfico com dados reais dos vídeos do canal`);

    // Ordenar vídeos por data de publicação
    const sortedVideos = [...videosWithStats].sort((a, b) => 
      new Date(a.publishedAt) - new Date(b.publishedAt)
    );

    if (sortedVideos.length === 0) {
      console.log(`[YouTube Metrics] ERRO: Não há vídeos disponíveis para gerar gráfico`);
      return res.status(404).json({
        success: false,
        message: 'Não há vídeos disponíveis para gerar métricas'
      });
    }

    // Extrair datas e métricas para o gráfico
    const labels = sortedVideos.map(video => {
      const date = new Date(video.publishedAt);
      return `${date.toLocaleString('pt-BR', {month: 'short'})} ${date.getDate()}`;
    });

    const views = sortedVideos.map(video => parseInt(video.statistics.viewCount) || 0);
    const likes = sortedVideos.map(video => parseInt(video.statistics.likeCount) || 0);
    const comments = sortedVideos.map(video => parseInt(video.statistics.commentCount) || 0);

    // Usar esses dados para o gráfico (dados reais dos vídeos)
    const chartData = {
      labels,
      views,
      likes,
      comments
    };

    console.log(`[YouTube Metrics] Gerados dados de gráfico usando ${sortedVideos.length} vídeos reais do canal`);

    // Dados completos para retornar
    const responseData = {
      success: true,
      data: {
        channelInfo: {
          id: channelData.id,
          title: channelData.snippet.title,
          description: channelData.snippet.description,
          customUrl: channelData.snippet.customUrl,
          thumbnails: channelData.snippet.thumbnails,
          statistics: channelData.statistics
        },
        totalStats: {
          views: totalViews,
          subscribers: totalSubscribers,
          videos: totalVideos,
          likes: totalLikes,
          comments: totalComments
        },
        videos: videosWithStats,
        recentComments: recentComments.items || [],
        chartData
      }
    };

    console.log(`[YouTube Metrics] Retornando resposta com sucesso. Dados reais do canal utilizados.`);
    res.json(responseData);
  } catch (error) {
    console.error('[YouTube Metrics] ERRO CRÍTICO ao obter métricas do YouTube:', error);
    
    // Verificar se há mensagem específica de erro
    let errorMessage = 'Erro ao obter métricas do YouTube';
    if (error.message) {
      errorMessage += ': ' + error.message;
    }
    
    console.log('[YouTube Metrics] Retornando resposta de erro');
    res.status(500).json({ 
      success: false, 
      message: errorMessage, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Obter histórico de métricas do YouTube
exports.getMetricsHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { days = 30 } = req.query;

    // Obter token do YouTube com campos protegidos
    const youtubeToken = await YouTubeToken.findOne({ user: userId });
    if (!youtubeToken) {
      return res.status(401).json({ 
        success: false, 
        message: 'Você não está autenticado no YouTube' 
      });
    }

    // Verificar se existe modelo para métricas históricas (normalmente criado pelo metricsCollector)
    // Em uma implementação real, buscaríamos do banco de dados
    // Para esta implementação, vamos gerar dados simulados

    // Gerar datas para o último período solicitado
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(days));

    // Gerar pontos de dados (um por dia)
    const dataPoints = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      dataPoints.push({
        date: currentDate.toISOString().split('T')[0],
        views: Math.floor(Math.random() * 500) + 2000,
        likes: Math.floor(Math.random() * 50) + 150,
        comments: Math.floor(Math.random() * 20) + 30,
        subscribers: Math.floor(Math.random() * 5) + 10
      });
      
      // Avançar para o próximo dia
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calcular crescimento percentual
    const growthMetrics = {
      views: calculateGrowthPercentage(dataPoints, 'views'),
      likes: calculateGrowthPercentage(dataPoints, 'likes'),
      comments: calculateGrowthPercentage(dataPoints, 'comments'),
      subscribers: calculateGrowthPercentage(dataPoints, 'subscribers')
    };

    res.json({
      success: true,
      data: {
        metrics: dataPoints,
        growth: growthMetrics,
        period: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        }
      }
    });
  } catch (error) {
    console.error('Erro ao obter histórico de métricas do YouTube:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao obter histórico de métricas do YouTube', 
      error: error.message 
    });
  }
};

// Função auxiliar para calcular crescimento percentual
function calculateGrowthPercentage(dataPoints, metric) {
  if (!dataPoints || dataPoints.length < 2) {
    return 0;
  }
  
  // Dividir o período em duas partes para comparação
  const midPoint = Math.floor(dataPoints.length / 2);
  
  // Calcular média da primeira metade
  const firstHalfSum = dataPoints.slice(0, midPoint).reduce((sum, point) => sum + point[metric], 0);
  const firstHalfAvg = firstHalfSum / midPoint;
  
  // Calcular média da segunda metade
  const secondHalfSum = dataPoints.slice(midPoint).reduce((sum, point) => sum + point[metric], 0);
  const secondHalfAvg = secondHalfSum / (dataPoints.length - midPoint);
  
  // Calcular percentual de crescimento
  if (firstHalfAvg === 0) return 0;
  
  const growthPercentage = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
  return parseFloat(growthPercentage.toFixed(2));
}