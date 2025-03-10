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

// Rota temporária para métricas (implementação direta sem o controlador)
router.get('/metrics', async (req, res) => {
  try {
    // Buscar token do usuário atual
    const userId = req.user.id;
    const token = await YouTubeToken.findOne({ user: userId, is_valid: true })
      .select('+access_token +refresh_token');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Nenhum token válido do YouTube encontrado para este usuário"
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
    
    // Obter informações do canal
    const channelResponse = await youtubeService.getChannelInfo();
    const channelInfo = channelResponse?.items?.[0] || null;
    
    if (!channelInfo) {
      throw new Error("Não foi possível obter informações do canal");
    }
    
    // Obter estatísticas de vídeos (limitado a 10 vídeos mais recentes)
    const videosResponse = await youtubeService.getChannelVideos(channelInfo.id, 10);
    const videos = videosResponse?.items || [];
    
    // Obter estatísticas detalhadas para cada vídeo
    const videoDetails = await Promise.all(
      videos.map(async (video) => {
        const details = await youtubeService.getVideoInfo(video.id.videoId);
        return details?.items?.[0] || null;
      })
    );
    
    // Filtrar vídeos nulos
    const validVideos = videoDetails.filter(v => v !== null);
    
    // Calcular estatísticas totais
    const totalStats = {
      views: validVideos.reduce((sum, video) => sum + parseInt(video.statistics?.viewCount || 0), 0),
      likes: validVideos.reduce((sum, video) => sum + parseInt(video.statistics?.likeCount || 0), 0),
      comments: validVideos.reduce((sum, video) => sum + parseInt(video.statistics?.commentCount || 0), 0),
      subscribers: parseInt(channelInfo.statistics?.subscriberCount || 0),
      videos: parseInt(channelInfo.statistics?.videoCount || 0)
    };
    
    // Obter comentários recentes (opcional, pode ser removido se causar problemas)
    let recentComments = [];
    try {
      for (const video of validVideos.slice(0, 3)) {
        const comments = await youtubeService.getVideoComments(video.id);
        if (comments?.items) {
          recentComments = [...recentComments, ...comments.items];
        }
        if (recentComments.length >= 5) break; // Limitar a 5 comentários
      }
    } catch (error) {
      console.error("Erro ao obter comentários:", error);
      // Continuar mesmo com erro nos comentários
    }
    
    // Gerar dados para gráficos (ainda simulados por enquanto)
    // Para dados reais, seria necessário implementar consultas adicionais à API
    const today = new Date();
    const labels = Array.from({ length: 6 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (5-i) * 5); // 5 em 5 dias para trás
      return date.toISOString().split('T')[0];
    });
    
    const chartData = {
      labels,
      views: labels.map(() => Math.floor(Math.random() * 500) + 800),
      likes: labels.map(() => Math.floor(Math.random() * 100) + 100),
      comments: labels.map(() => Math.floor(Math.random() * 20) + 20)
    };
    
    // Montar e retornar o objeto de resposta
    res.json({
      success: true,
      data: {
        channelInfo,
        totalStats,
        videos: validVideos.map(video => ({
          id: video.id,
          title: video.snippet.title,
          description: video.snippet.description,
          publishedAt: video.snippet.publishedAt,
          thumbnail: video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url,
          statistics: video.statistics
        })),
        recentComments: recentComments.map(comment => ({
          id: comment.id,
          videoId: comment.snippet.videoId,
          authorDisplayName: comment.snippet.topLevelComment.snippet.authorDisplayName,
          authorProfileImageUrl: comment.snippet.topLevelComment.snippet.authorProfileImageUrl,
          textDisplay: comment.snippet.topLevelComment.snippet.textDisplay,
          likeCount: comment.snippet.topLevelComment.snippet.likeCount,
          publishedAt: comment.snippet.topLevelComment.snippet.publishedAt
        })),
        chartData
      }
    });
  } catch (error) {
    console.error('Erro ao obter métricas do YouTube:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter métricas do YouTube',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
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