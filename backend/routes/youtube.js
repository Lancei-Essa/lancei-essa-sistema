const express = require('express');
const { protect } = require('../middleware/auth');
const { uploadMiddleware } = require('../middleware/fileUpload');
const youtubeController = require('../controllers/youtubeController');

const router = express.Router();

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
router.get('/metrics', (req, res) => {
  res.json({
    success: true,
    data: {
      channelInfo: {
        id: 'UC123456789',
        title: 'Canal de Teste',
        description: 'Este é um canal de teste para o dashboard de métricas',
        customUrl: '@canalTeste',
        thumbnails: {
          default: { url: 'https://via.placeholder.com/88' },
          medium: { url: 'https://via.placeholder.com/240' },
          high: { url: 'https://via.placeholder.com/800' }
        },
        statistics: {
          viewCount: '45250',
          subscriberCount: '1250',
          videoCount: '32'
        }
      },
      totalStats: {
        views: 45250,
        subscribers: 1250,
        videos: 32,
        likes: 3250,
        comments: 980
      },
      videos: [
        {
          id: 'vid1',
          title: 'Vídeo de Teste 1',
          description: 'Descrição do vídeo 1',
          publishedAt: new Date().toISOString(),
          thumbnail: 'https://via.placeholder.com/320x180?text=Video+1',
          statistics: {
            viewCount: '5280',
            likeCount: '320',
            commentCount: '45'
          }
        },
        {
          id: 'vid2',
          title: 'Vídeo de Teste 2',
          description: 'Descrição do vídeo 2',
          publishedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
          thumbnail: 'https://via.placeholder.com/320x180?text=Video+2',
          statistics: {
            viewCount: '3950',
            likeCount: '280',
            commentCount: '32'
          }
        }
      ],
      recentComments: [
        {
          id: 'comment1',
          videoId: 'vid1',
          authorDisplayName: 'Usuário 1',
          authorProfileImageUrl: 'https://via.placeholder.com/40?text=U1',
          textDisplay: 'Este é um comentário de exemplo 1. Estou gostando muito do conteúdo!',
          likeCount: 5,
          publishedAt: new Date().toISOString()
        },
        {
          id: 'comment2',
          videoId: 'vid1',
          authorDisplayName: 'Usuário 2',
          authorProfileImageUrl: 'https://via.placeholder.com/40?text=U2',
          textDisplay: 'Este é um comentário de exemplo 2. Muito bom!',
          likeCount: 3,
          publishedAt: new Date(Date.now() - 2 * 86400000).toISOString()
        }
      ],
      chartData: {
        labels: ['2025-03-01', '2025-03-06', '2025-03-11', '2025-03-16', '2025-03-21', '2025-03-26'],
        views: [820, 932, 901, 934, 1290, 1330],
        likes: [120, 132, 101, 134, 190, 230],
        comments: [20, 22, 21, 24, 30, 40]
      }
    }
  });
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

// Adicione esta rota para verificar variáveis de ambiente
router.get('/env-check', async (req, res) => {
  res.json({
    clientId: process.env.YOUTUBE_CLIENT_ID ? 'Configurado' : 'Não configurado',
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET ? 'Configurado' : 'Não configurado',
    redirectUri: process.env.YOUTUBE_REDIRECT_URI
  });
});

module.exports = router;