const express = require('express');
const { protect } = require('../middleware/auth');
const { uploadMiddleware } = require('../middleware/fileUpload');
const youtubeController = require('../controllers/youtubeController');
const youtubeService = require('../services/youtube');
const YouTubeToken = require('../models/YouTubeToken');

const router = express.Router();

// Rota não protegida para testes (REMOVER DEPOIS DE TESTAR)
// Deve ser colocada ANTES do middleware protect
router.get('/test-youtube-data', async (req, res) => {
  try {
    // Buscar qualquer token válido no sistema (apenas para teste)
    const token = await YouTubeToken.findOne({is_valid: true})
      .select('+access_token +refresh_token');
    
    if (!token) {
      return res.json({
        success: false,
        message: "Nenhum token do YouTube válido encontrado no sistema"
      });
    }
    
    // Obter credenciais descriptografadas
    const tokens = token.getDecryptedTokens();
    
    // Configurar cliente OAuth
    youtubeService.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date
    });
    
    // Obter dados básicos do canal
    const channelResponse = await youtubeService.getChannelInfo();
    
    // Retornar resposta
    res.json({
      success: true,
      channel: channelResponse?.items?.[0] || null,
      token_info: {
        channel_id: token.channel_id,
        is_valid: token.is_valid,
        last_used: token.last_used,
        expires_at: new Date(token.expiry_date).toISOString()
      }
    });
  } catch (error) {
    console.error('Erro no teste do YouTube:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter dados de teste do YouTube',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

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

// Rota para métricas usando o controller
router.get('/metrics', (req, res, next) => {
  console.log('[API Router] Chamando youtubeController.getMetrics diretamente');
  console.log('[API Router] Requisição recebida em /youtube/metrics');
  
  // Verificar se é uma requisição de dados simulados
  const forceReal = true; // Forçar dados reais
  req.forceRealData = forceReal;
  
  // Chamar o controlador específico
  return youtubeController.getMetrics(req, res, next);
});

// Rota temporária para histórico de métricas (implementação direta sem o controlador)
router.get('/metrics/history', (req, res) => {
  const days = req.query.days || 30;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - parseInt(days));
  
  // Gerar pontos de dados (um por dia)
  const metrics = [];
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    metrics.push({
      date: currentDate.toISOString().split('T')[0],
      views: Math.floor(Math.random() * 500) + 2000,
      likes: Math.floor(Math.random() * 50) + 150,
      comments: Math.floor(Math.random() * 20) + 30,
      subscribers: Math.floor(Math.random() * 5) + 10
    });
    
    // Avançar para o próximo dia
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  res.json({
    success: true,
    data: {
      metrics: metrics,
      growth: {
        views: 12.5,
        likes: 8.3,
        comments: 6.7,
        subscribers: 4.2
      },
      period: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      }
    }
  });
});

// Endpoint para verificar os escopos do token atual
router.get('/check-scopes', protect, async (req, res) => {
  try {
    // Obter token do YouTube com campos protegidos
    const YouTubeToken = require('../models/YouTubeToken');
    const youtubeToken = await YouTubeToken.findOne({ user: req.user.id })
      .select('+access_token +refresh_token');
    
    if (!youtubeToken) {
      return res.status(401).json({
        success: false,
        message: 'Você não está autenticado no YouTube'
      });
    }
    
    // Obter tokens descriptografados
    const tokens = youtubeToken.getDecryptedTokens();
    
    // Verificar status e escopos do token
    const now = Date.now();
    const expiryDate = tokens.expiry_date;
    const isExpired = now >= expiryDate;
    
    // Escopos necessários para funcionalidade completa
    const requiredScopes = [
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/yt-analytics.readonly',
    ];
    
    // Verificar quais escopos estão presentes no token
    const tokenScopes = tokens.scope ? tokens.scope.split(' ') : [];
    const presentScopes = {};
    requiredScopes.forEach(scope => {
      presentScopes[scope] = tokenScopes.includes(scope);
    });
    
    // Determinar se todos os escopos necessários estão presentes
    const hasMissingScopes = requiredScopes.some(scope => !presentScopes[scope]);
    
    res.json({
      success: true,
      tokenStatus: {
        valid: !isExpired,
        expiresAt: new Date(expiryDate).toISOString(),
        isExpired: isExpired,
        channel_id: youtubeToken.channel_id || null,
      },
      scopeInfo: {
        allScopesPresent: !hasMissingScopes,
        scopes: presentScopes,
        allScopes: tokenScopes
      },
      needReconnect: isExpired || hasMissingScopes
    });
  } catch (error) {
    console.error('[YouTube] Erro ao verificar escopos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar escopos do token',
      error: error.message
    });
  }
});

// Endpoint para forçar reconexão com novos escopos
router.get('/reconnect', protect, async (req, res) => {
  try {
    // Forçar desconexão removendo o token atual
    const YouTubeToken = require('../models/YouTubeToken');
    await YouTubeToken.deleteOne({ user: req.user.id });
    
    // Gerar nova URL de autenticação com todos os escopos necessários
    const authUrl = youtubeService.getAuthUrl(null);
    
    res.json({
      success: true,
      message: 'Token removido. Use a URL abaixo para reconectar com todos os escopos necessários.',
      authUrl
    });
  } catch (error) {
    console.error('[YouTube] Erro ao forçar reconexão:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao forçar reconexão com YouTube',
      error: error.message
    });
  }
});

// Adicione um endpoint de teste para API do YouTube
router.get('/test-analytics', protect, async (req, res) => {
  try {
    // Obter token de autenticação
    const YouTubeToken = require('../models/YouTubeToken');
    const youtubeToken = await YouTubeToken.findOne({ user: req.user.id })
      .select('+access_token +refresh_token');
    
    if (!youtubeToken) {
      return res.status(401).json({
        success: false,
        message: 'Token do YouTube não encontrado'
      });
    }
    
    // Obter tokens descriptografados
    const tokens = youtubeToken.getDecryptedTokens();
    
    // Configurar cliente
    youtubeService.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date
    });
    
    // Testar cada função separadamente
    const testResults = {
      getChannelInfo: null,
      getChannelVideos: null,
      getVideosStats: null,
      getRecentComments: null
    };
    
    // Testar getChannelInfo
    try {
      const channelInfo = await youtubeService.getChannelInfo();
      testResults.getChannelInfo = {
        success: true,
        data: channelInfo
      };
    } catch (error) {
      testResults.getChannelInfo = {
        success: false,
        error: error.message
      };
    }
    
    // Testar getChannelVideos
    try {
      const videos = await youtubeService.getChannelVideos(5);
      testResults.getChannelVideos = {
        success: true,
        count: videos.items ? videos.items.length : 0,
        videoIds: videos.items ? videos.items.map(video => video.id.videoId) : []
      };
    } catch (error) {
      testResults.getChannelVideos = {
        success: false,
        error: error.message
      };
    }
    
    // Retornar resultados dos testes
    res.json({
      success: true,
      results: testResults,
      tokenStatus: {
        valid: !youtubeToken.isExpired(),
        expiresAt: new Date(tokens.expiry_date).toISOString()
      }
    });
  } catch (error) {
    console.error('Erro no teste de analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no teste de analytics',
      error: error.message
    });
  }
});

// Adicione esta rota para verificar variáveis de ambiente com detalhes adicionais
router.get('/env-debug', async (req, res) => {
  // Informações de ambiente
  const envInfo = {
    client_id: process.env.YOUTUBE_CLIENT_ID ? 'Configurado (comprimento: ' + process.env.YOUTUBE_CLIENT_ID.length + ')' : 'Não configurado',
    client_secret: process.env.YOUTUBE_CLIENT_SECRET ? 'Configurado (comprimento: ' + process.env.YOUTUBE_CLIENT_SECRET.length + ')' : 'Não configurado',
    redirect_uri: process.env.YOUTUBE_REDIRECT_URI
  };
  
  // Tentar obter dados do YouTube (se houver token válido)
  try {
    const YouTubeToken = require('../models/YouTubeToken');
    const youtubeService = require('../services/youtube');
    
    const token = await YouTubeToken.findOne({is_valid: true})
      .select('+access_token +refresh_token');
    
    if (token) {
      // Token encontrado, tentar obter dados
      const tokens = token.getDecryptedTokens();
      youtubeService.setCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date
      });
      
      const channelResponse = await youtubeService.getChannelInfo();
      
      return res.json({
        env: envInfo,
        youtube_data: {
          success: true,
          channel: channelResponse?.items?.[0] || null
        }
      });
    }
  } catch (error) {
    console.error('Erro ao tentar dados do YouTube:', error);
  }
  
  // Se chegarmos aqui, só retornamos as infos de ambiente
  return res.json(envInfo);
});

module.exports = router;