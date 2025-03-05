/**
 * Controlador de métricas
 * Fornece endpoints para obtenção de métricas agregadas e estatísticas de publicações
 */

const YouTubeToken = require('../../models/YouTubeToken');
const InstagramToken = require('../../models/InstagramToken');
const TwitterToken = require('../../models/TwitterToken');
const LinkedInToken = require('../../models/LinkedInToken');
const TikTokToken = require('../../models/TikTokToken');
const SpotifyToken = require('../../models/SpotifyToken');
const Publication = require('../../models/Publication');
const Episode = require('../../models/Episode');
const youtubeService = require('../../services/youtube');
const instagramService = require('../../services/platforms/instagram');

/**
 * Obter métricas agregadas de todas as plataformas
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 */
exports.getMetrics = async (req, res) => {
  try {
    const { platform = 'all', timeRange = 'last30days' } = req.query;
    const userId = req.user._id;

    // Calcular intervalo de datas com base no timeRange
    const dateRange = getDateRange(timeRange, req.query);
    
    // Inicializar objeto de métricas
    const metrics = {
      summary: {
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        totalFollowers: 0,
        growthRate: 0
      },
      platforms: {},
      episodes: [],
      trends: {
        views: { labels: [], datasets: [] },
        engagement: { labels: [], datasets: [] },
        platforms: { labels: [], datasets: [] },
        growth: { labels: [], datasets: [] }
      }
    };
    
    // Determinar quais plataformas buscar
    const platforms = platform === 'all' 
      ? ['youtube', 'instagram', 'twitter', 'linkedin', 'tiktok', 'spotify'] 
      : [platform];
    
    // Buscar métricas de cada plataforma
    for (const platform of platforms) {
      try {
        let platformMetrics;
        
        switch(platform) {
          case 'youtube':
            platformMetrics = await getYouTubeMetrics(userId, dateRange);
            break;
          case 'instagram':
            platformMetrics = await getInstagramMetrics(userId, dateRange);
            break;
          case 'twitter':
            platformMetrics = await getTwitterMetrics(userId, dateRange);
            break;
          case 'linkedin':
            platformMetrics = await getLinkedInMetrics(userId, dateRange);
            break;
          case 'tiktok':
            platformMetrics = await getTikTokMetrics(userId, dateRange);
            break;
          case 'spotify':
            platformMetrics = await getSpotifyMetrics(userId, dateRange);
            break;
        }
        
        if (platformMetrics) {
          // Adicionar à coleção de plataformas
          metrics.platforms[platform] = platformMetrics;
          
          // Atualizar totais resumidos
          metrics.summary.totalViews += platformMetrics.views || 0;
          metrics.summary.totalLikes += platformMetrics.likes || 0;
          metrics.summary.totalComments += platformMetrics.comments || 0;
          metrics.summary.totalShares += platformMetrics.shares || 0;
          metrics.summary.totalFollowers += (platformMetrics.followers || platformMetrics.subscribers || 0);
        }
      } catch (error) {
        console.error(`Erro ao buscar métricas para ${platform}:`, error);
        // Continuar com as outras plataformas mesmo se uma falhar
      }
    }
    
    // Calcular taxa de crescimento (média ponderada)
    if (Object.keys(metrics.platforms).length > 0) {
      let totalGrowth = 0;
      let totalFollowers = 0;
      
      for (const platform in metrics.platforms) {
        const followers = metrics.platforms[platform].followers || metrics.platforms[platform].subscribers || 0;
        const growth = metrics.platforms[platform].growth || 0;
        
        totalGrowth += growth * followers;
        totalFollowers += followers;
      }
      
      metrics.summary.growthRate = totalFollowers > 0 ? parseFloat((totalGrowth / totalFollowers).toFixed(1)) : 0;
    }
    
    // Buscar métricas dos episódios
    metrics.episodes = await getEpisodeMetrics(userId, platforms, dateRange);
    
    // Gerar dados de tendências para gráficos
    metrics.trends = await generateTrendData(metrics.platforms, metrics.episodes, dateRange);
    
    res.json({
      success: true,
      metrics
    });
  } catch (error) {
    console.error('Erro ao buscar métricas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar métricas',
      error: error.message
    });
  }
};

/**
 * Obter métricas específicas do YouTube
 */
const getYouTubeMetrics = async (userId, dateRange) => {
  try {
    const youtubeToken = await YouTubeToken.findOne({ user: userId });
    
    if (!youtubeToken || !youtubeToken.is_valid) {
      return null;
    }
    
    // Verificar se o token expirou e obter tokens descriptografados
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
        console.error('Erro ao renovar token do YouTube:', refreshError);
        return null;
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
    
    try {
      // Obter informações do canal
      const channelResponse = await youtubeService.getChannelInfo();
      if (!channelResponse || !channelResponse.items || channelResponse.items.length === 0) {
        return null;
      }
      
      const channelData = channelResponse.items[0];
      const statistics = channelData.statistics;
      
      // Para simplificar o exemplo, usaremos os dados do canal
      // Em uma implementação real, buscaríamos os vídeos e métricas detalhadas
      return {
        views: parseInt(statistics.viewCount) || 0,
        likes: 0, // YouTube API não fornece likes agregados do canal
        comments: 0, // YouTube API não fornece comentários agregados do canal
        shares: 0, // YouTube API não fornece compartilhamentos
        subscribers: parseInt(statistics.subscriberCount) || 0,
        growth: 5.2, // Simulado - precisaria de dados históricos
        topContent: [] // Seria preenchido com vídeos mais populares
      };
    } catch (apiError) {
      console.error('Erro ao chamar API do YouTube:', apiError);
      return null;
    }
  } catch (error) {
    console.error('Erro ao obter métricas do YouTube:', error);
    return null;
  }
};

/**
 * Obter métricas específicas do Instagram
 */
const getInstagramMetrics = async (userId, dateRange) => {
  try {
    const instagramToken = await InstagramToken.findOne({ user: userId }).select('+password');
    
    if (!instagramToken || instagramToken.status !== 'active') {
      return null;
    }
    
    // Fazer login no Instagram
    const loginResult = await instagramService.loginWithToken(instagramToken);
    
    if (!loginResult.success) {
      // Atualizar status do token se o login falhar
      instagramToken.status = 'invalid';
      instagramToken.lastVerified = new Date();
      await instagramToken.save();
      return null;
    }
    
    // Obter insights
    const insights = await instagramService.getInsights();
    
    if (!insights.success) {
      return null;
    }
    
    // Atualizar status de verificação
    instagramToken.lastVerified = new Date();
    await instagramToken.save();
    
    // Extrair e transformar dados
    const profile = insights.profile;
    const recentPosts = insights.recentPosts || [];
    
    // Calcular totais dos posts recentes
    const totalLikes = recentPosts.reduce((sum, post) => sum + (post.likes || 0), 0);
    const totalComments = recentPosts.reduce((sum, post) => sum + (post.comments || 0), 0);
    
    // Encontrar posts mais populares
    const topPosts = [...recentPosts]
      .sort((a, b) => (b.likes || 0) + (b.comments || 0) - ((a.likes || 0) + (a.comments || 0)))
      .slice(0, 3) // Top 3 posts
      .map(post => ({
        title: post.caption.substring(0, 30) + (post.caption.length > 30 ? '...' : ''),
        views: 0, // Instagram não fornece views para posts normais
        likes: post.likes || 0,
        comments: post.comments || 0
      }));
    
    return {
      views: profile.mediaCount * 150, // Estimativa simulada
      likes: totalLikes,
      comments: totalComments,
      shares: 0, // Instagram não fornece compartilhamentos
      followers: profile.followerCount,
      growth: 3.8, // Simulado - precisaria de dados históricos
      topContent: topPosts
    };
  } catch (error) {
    console.error('Erro ao obter métricas do Instagram:', error);
    return null;
  }
};

/**
 * Funções de placeholder para outras plataformas
 */
const getTwitterMetrics = async (userId, dateRange) => {
  // Placeholder - implementar integração real com Twitter API
  return {
    views: 1580,
    likes: 342,
    comments: 89,
    shares: 124,
    followers: 520,
    growth: 2.1,
    topContent: []
  };
};

const getLinkedInMetrics = async (userId, dateRange) => {
  // Placeholder - implementar integração real com LinkedIn API
  return {
    views: 890,
    likes: 145,
    comments: 38,
    shares: 56,
    followers: 650,
    growth: 4.3,
    topContent: []
  };
};

const getTikTokMetrics = async (userId, dateRange) => {
  // Placeholder - implementar integração real com TikTok API
  return {
    views: 15600,
    likes: 2300,
    comments: 420,
    shares: 830,
    followers: 1250,
    growth: 7.8,
    topContent: []
  };
};

const getSpotifyMetrics = async (userId, dateRange) => {
  // Placeholder - implementar integração real com Spotify API
  return {
    streams: 3450,
    followers: 280,
    // Métricas específicas para podcasts
    averageListenTime: 32.5, // em minutos
    completionRate: 78.4, // porcentagem
    growth: 3.2,
    topEpisodes: []
  };
};

/**
 * Buscar métricas agregadas de episódios
 */
const getEpisodeMetrics = async (userId, platforms, dateRange) => {
  try {
    // Buscar episódios no intervalo de data
    const episodes = await Episode.find({
      user: userId,
      publishDate: { $gte: dateRange.startDate, $lte: dateRange.endDate }
    }).sort('-publishDate');
    
    if (!episodes || episodes.length === 0) {
      return [];
    }
    
    // Buscar publicações relacionadas a esses episódios
    const publications = await Publication.find({
      episode: { $in: episodes.map(ep => ep._id) }
    }).populate('episode');
    
    // Agregar métricas por episódio
    const episodeMetrics = episodes.map(episode => {
      const episodePubs = publications.filter(pub => 
        pub.episode && pub.episode._id.toString() === episode._id.toString()
      );
      
      // Inicializar métricas por plataforma
      const platformMetrics = {};
      platforms.forEach(platform => {
        platformMetrics[platform] = { views: 0, likes: 0, comments: 0, shares: 0 };
      });
      
      // Agregar métricas das publicações
      episodePubs.forEach(pub => {
        if (pub.platform && platformMetrics[pub.platform]) {
          platformMetrics[pub.platform].views += pub.metrics?.views || 0;
          platformMetrics[pub.platform].likes += pub.metrics?.likes || 0;
          platformMetrics[pub.platform].comments += pub.metrics?.comments || 0;
          platformMetrics[pub.platform].shares += pub.metrics?.shares || 0;
        }
      });
      
      // Calcular totais
      const totalViews = Object.values(platformMetrics)
        .reduce((sum, p) => sum + p.views, 0);
      const totalLikes = Object.values(platformMetrics)
        .reduce((sum, p) => sum + p.likes, 0);
      const totalComments = Object.values(platformMetrics)
        .reduce((sum, p) => sum + p.comments, 0);
      const totalShares = Object.values(platformMetrics)
        .reduce((sum, p) => sum + p.shares, 0);
      
      // Calcular engajamento
      const engagement = totalViews > 0 
        ? (((totalLikes + totalComments + totalShares) / totalViews) * 100).toFixed(1) 
        : 0;
      
      return {
        id: episode._id,
        number: episode.number,
        title: episode.title,
        publishDate: episode.publishDate,
        metrics: {
          views: totalViews,
          likes: totalLikes,
          comments: totalComments,
          shares: totalShares,
          engagement: parseFloat(engagement),
          platforms: platformMetrics
        }
      };
    });
    
    return episodeMetrics;
  } catch (error) {
    console.error('Erro ao buscar métricas de episódios:', error);
    return [];
  }
};

/**
 * Gerar dados de tendências para gráficos
 */
const generateTrendData = async (platforms, episodes, dateRange) => {
  // Em uma implementação real, buscaríamos dados históricos
  // Para este exemplo, vamos gerar dados simulados
  
  // Datas para o eixo x dos gráficos (últimas 4 semanas)
  const now = new Date();
  const labels = [];
  
  for (let i = 4; i > 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - (i * 7));
    labels.push(`Semana ${5-i}`);
  }
  
  // Dados simulados de visualizações
  const viewsData = [
    Math.floor(Math.random() * 5000) + 3000,
    Math.floor(Math.random() * 6000) + 4000,
    Math.floor(Math.random() * 7000) + 5000,
    Math.floor(Math.random() * 8000) + 6000
  ];
  
  // Dados simulados de engajamento
  const likesData = viewsData.map(v => Math.floor(v * 0.08));
  const commentsData = viewsData.map(v => Math.floor(v * 0.02));
  const sharesData = viewsData.map(v => Math.floor(v * 0.01));
  
  // Dados de plataformas
  const platformsLabels = Object.keys(platforms).map(p => 
    p.charAt(0).toUpperCase() + p.slice(1)
  );
  
  const platformsData = Object.values(platforms).map(p => 
    p.views || 0
  );
  
  const platformColors = [
    'rgba(255, 0, 0, 0.7)',      // YouTube
    'rgba(138, 58, 185, 0.7)',   // Instagram
    'rgba(29, 161, 242, 0.7)',   // Twitter
    'rgba(0, 119, 181, 0.7)',    // LinkedIn
    'rgba(0, 0, 0, 0.7)',        // TikTok
    'rgba(30, 215, 96, 0.7)'     // Spotify
  ];
  
  // Dados de crescimento de seguidores
  const totalFollowers = [
    Math.floor(Math.random() * 1000) + 3000,
    Math.floor(Math.random() * 1500) + 3500,
    Math.floor(Math.random() * 2000) + 4000,
    Math.floor(Math.random() * 2500) + 4500
  ];
  
  return {
    views: {
      labels,
      datasets: [{
        label: 'Visualizações',
        data: viewsData,
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        borderColor: 'rgb(53, 162, 235)',
        borderWidth: 1
      }]
    },
    engagement: {
      labels,
      datasets: [
        {
          label: 'Curtidas',
          data: likesData,
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          borderColor: 'rgb(255, 99, 132)',
          borderWidth: 1
        },
        {
          label: 'Comentários',
          data: commentsData,
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          borderColor: 'rgb(75, 192, 192)',
          borderWidth: 1
        },
        {
          label: 'Compartilhamentos',
          data: sharesData,
          backgroundColor: 'rgba(255, 159, 64, 0.5)',
          borderColor: 'rgb(255, 159, 64)',
          borderWidth: 1
        }
      ]
    },
    platforms: {
      labels: platformsLabels,
      datasets: [{
        label: 'Visualizações por Plataforma',
        data: platformsData,
        backgroundColor: platformColors.slice(0, platformsLabels.length),
        borderWidth: 1
      }]
    },
    growth: {
      labels,
      datasets: [{
        label: 'Seguidores',
        data: totalFollowers,
        fill: false,
        backgroundColor: 'rgb(75, 192, 192)',
        borderColor: 'rgba(75, 192, 192, 0.8)',
        tension: 0.1
      }]
    }
  };
};

/**
 * Calcular intervalo de datas com base no timeRange
 */
const getDateRange = (timeRange, queryParams) => {
  const now = new Date();
  let startDate;
  
  switch(timeRange) {
    case 'last7days':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      break;
    case 'last90days':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 90);
      break;
    case 'custom':
      // Para datas personalizadas, o cliente deve enviar startDate e endDate como parâmetros
      return {
        startDate: queryParams?.startDate ? new Date(queryParams.startDate) : new Date(now.setDate(now.getDate() - 30)),
        endDate: queryParams?.endDate ? new Date(queryParams.endDate) : new Date()
      };
    case 'last30days':
    default:
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 30);
  }
  
  return { startDate, endDate: now };
};

// Importação do serviço centralizado de tokens
const tokenManager = require('../../services/tokenManager');

/**
 * Verifica o status de todas as conexões de mídia social
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 */
exports.checkAllConnections = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Usar o gerenciador de tokens para verificar todas as conexões
    const connections = await tokenManager.checkAllConnections(userId);
    
    res.json({
      success: true,
      connections
    });
  } catch (error) {
    console.error('Erro ao verificar conexões:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar conexões de mídia social',
      error: error.message
    });
  }
};

// Exportar funções para uso pelo coletor de métricas
module.exports.getYouTubeMetrics = getYouTubeMetrics;
module.exports.getInstagramMetrics = getInstagramMetrics;
module.exports.getTwitterMetrics = getTwitterMetrics;
module.exports.getLinkedInMetrics = getLinkedInMetrics;
module.exports.getTikTokMetrics = getTikTokMetrics;
module.exports.getSpotifyMetrics = getSpotifyMetrics;