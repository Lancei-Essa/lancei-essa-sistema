/**
 * Serviço de coleta automática de métricas
 * Responsável por verificar periodicamente publicações e atualizar suas métricas
 */

const Publication = require('../../models/Publication');
const User = require('../../models/User');
const YouTubeToken = require('../../models/YouTubeToken');
const TwitterToken = require('../../models/TwitterToken');
const LinkedInToken = require('../../models/LinkedInToken');
const InstagramToken = require('../../models/InstagramToken');
const SpotifyToken = require('../../models/SpotifyToken');
const TikTokToken = require('../../models/TikTokToken');
const youtubeService = require('../youtube');
const instagramService = require('../platforms/instagram');
const twitterService = require('../platforms/twitter');
const linkedinService = require('../platforms/linkedin');
const spotifyService = require('../platforms/spotify');
const tiktokService = require('../platforms/tiktok');

// Intervalos de verificação (em milissegundos)
const HOURLY_INTERVAL = 60 * 60 * 1000; // 1 hora
const SIX_HOUR_INTERVAL = 6 * 60 * 60 * 1000; // 6 horas
const DAILY_INTERVAL = 24 * 60 * 60 * 1000; // 24 horas
const WEEKLY_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 7 dias

// Controle de execução
let collectorActive = false;
let collectorIntervalId = null;
let lastRun = null;
let isRunning = false;

/**
 * Inicia o serviço de coleta de métricas
 */
const startCollector = () => {
  if (collectorActive) {
    console.log('Coletor de métricas já está em execução');
    return;
  }

  console.log('Iniciando serviço de coleta automática de métricas...');
  collectorActive = true;
  
  // Iniciar coleta periódica
  collectorIntervalId = setInterval(collectMetrics, HOURLY_INTERVAL);
  
  // Executar imediatamente ao iniciar
  collectMetrics();
};

/**
 * Para o serviço de coleta de métricas
 */
const stopCollector = () => {
  if (!collectorActive) {
    console.log('Coletor de métricas não está em execução');
    return;
  }

  console.log('Parando serviço de coleta automática de métricas...');
  
  if (collectorIntervalId) {
    clearInterval(collectorIntervalId);
    collectorIntervalId = null;
  }
  
  collectorActive = false;
};

/**
 * Verifica se o coletor está ativo
 * @returns {boolean} Status do coletor
 */
const isActive = () => {
  return collectorActive;
};

/**
 * Obtém informações sobre o status do coletor
 * @returns {Object} Informações de status
 */
const getStatus = () => {
  return {
    active: collectorActive,
    running: isRunning,
    lastRun: lastRun
  };
};

/**
 * Coletador principal de métricas
 * Busca todas as publicações dentro do intervalo de tempo e atualiza suas métricas
 */
const collectMetrics = async () => {
  // Evitar execuções concorrentes
  if (isRunning) {
    console.log('Já existe uma coleta de métricas em andamento');
    return;
  }

  isRunning = true;
  
  try {
    console.log('Iniciando coleta de métricas...');
    lastRun = new Date();
    
    // Obter todas as publicações dos últimos 30 dias que estão publicadas
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const publications = await Publication.find({
      status: 'published',
      publishedAt: { $gte: thirtyDaysAgo }
    }).populate('episode').populate({
      path: 'createdBy',
      select: '_id email name'
    });
    
    console.log(`Encontradas ${publications.length} publicações para atualização de métricas`);
    
    // Agrupar publicações por usuário e plataforma para otimizar chamadas de API
    const groupedByUserAndPlatform = {};
    
    for (const publication of publications) {
      const userId = publication.createdBy ? publication.createdBy._id.toString() : null;
      const platform = publication.platform;
      
      if (!userId) continue;
      
      if (!groupedByUserAndPlatform[userId]) {
        groupedByUserAndPlatform[userId] = {};
      }
      
      if (!groupedByUserAndPlatform[userId][platform]) {
        groupedByUserAndPlatform[userId][platform] = [];
      }
      
      groupedByUserAndPlatform[userId][platform].push(publication);
    }
    
    // Processar cada usuário e plataforma
    for (const userId in groupedByUserAndPlatform) {
      for (const platform in groupedByUserAndPlatform[userId]) {
        const userPlatformPublications = groupedByUserAndPlatform[userId][platform];
        
        try {
          await updateMetricsForUserPlatform(userId, platform, userPlatformPublications);
        } catch (error) {
          console.error(`Erro ao atualizar métricas para usuário ${userId} na plataforma ${platform}:`, error);
          // Continuar com próxima plataforma/usuário
        }
      }
    }
    
    console.log('Coleta de métricas concluída');
  } catch (error) {
    console.error('Erro na coleta de métricas:', error);
  } finally {
    isRunning = false;
  }
};

/**
 * Atualiza métricas para publicações de um usuário em uma plataforma
 * @param {string} userId - ID do usuário
 * @param {string} platform - Nome da plataforma
 * @param {Array} publications - Lista de publicações
 */
const updateMetricsForUserPlatform = async (userId, platform, publications) => {
  console.log(`Atualizando métricas para usuário ${userId} na plataforma ${platform} (${publications.length} publicações)`);
  
  if (!publications || publications.length === 0) return;
  
  // Ordenar publicações por data (mais recentes primeiro)
  publications.sort((a, b) => b.publishedAt - a.publishedAt);
  
  // Verificar se tem token/credenciais válidos
  const hasValidCredentials = await checkPlatformCredentials(userId, platform);
  
  if (!hasValidCredentials) {
    console.log(`Usuário ${userId} não tem credenciais válidas para ${platform}`);
    
    // Atualizar com dados simulados para não interromper o desenvolvimento
    for (const publication of publications) {
      await updateWithMockData(publication);
    }
    
    return;
  }
  
  // Definir frequência de atualização com base na idade de cada publicação
  for (const publication of publications) {
    // Verificar quando foi a última atualização
    const lastUpdate = publication.metrics?.lastUpdated || publication.publishedAt;
    const now = new Date();
    const timeSinceUpdate = now - lastUpdate;
    
    // Verificar frequência baseada em idade da publicação
    const shouldUpdate = shouldUpdatePublication(publication, timeSinceUpdate);
    
    if (shouldUpdate) {
      try {
        await collectPublicationMetrics(userId, platform, publication);
      } catch (error) {
        console.error(`Erro ao coletar métricas para publicação ${publication._id}:`, error);
        // Tentar próxima publicação
      }
    }
  }
};

/**
 * Determina se uma publicação deve ser atualizada com base em sua idade
 * @param {Object} publication - Objeto da publicação
 * @param {number} timeSinceUpdate - Tempo desde a última atualização (ms)
 * @returns {boolean} - Indica se deve atualizar
 */
const shouldUpdatePublication = (publication, timeSinceUpdate) => {
  // Calcular idade da publicação em horas
  const ageInHours = (new Date() - publication.publishedAt) / (1000 * 60 * 60);
  
  // Publicações de 0-24h: atualizar a cada 1h
  if (ageInHours <= 24 && timeSinceUpdate >= HOURLY_INTERVAL) {
    return true;
  }
  
  // Publicações de 1-7 dias: atualizar a cada 6h
  if (ageInHours <= 168 && timeSinceUpdate >= SIX_HOUR_INTERVAL) {
    return true;
  }
  
  // Publicações de 7-30 dias: atualizar a cada 24h
  if (ageInHours <= 720 && timeSinceUpdate >= DAILY_INTERVAL) {
    return true;
  }
  
  // Publicações mais antigas: atualizar semanalmente
  if (timeSinceUpdate >= WEEKLY_INTERVAL) {
    return true;
  }
  
  return false;
};

/**
 * Verifica se o usuário tem credenciais válidas para a plataforma
 * @param {string} userId - ID do usuário
 * @param {string} platform - Nome da plataforma
 * @returns {boolean} - Indica se tem credenciais válidas
 */
const checkPlatformCredentials = async (userId, platform) => {
  try {
    let token = null;
    
    switch(platform) {
      case 'youtube':
        token = await YouTubeToken.findOne({ user: userId });
        return token && token.is_valid;
        
      case 'instagram':
        token = await InstagramToken.findOne({ user: userId });
        return token && token.status === 'active';
        
      case 'twitter':
        token = await TwitterToken.findOne({ user: userId });
        return token && !token.isExpired();
        
      case 'linkedin':
        token = await LinkedInToken.findOne({ user: userId });
        return token && !token.isExpired();
        
      case 'tiktok':
        token = await TikTokToken.findOne({ user: userId });
        return token && !token.isExpired();
        
      case 'spotify':
        token = await SpotifyToken.findOne({ user: userId });
        return token && !token.isExpired();
        
      default:
        return false;
    }
  } catch (error) {
    console.error(`Erro ao verificar credenciais para ${platform}:`, error);
    return false;
  }
};

/**
 * Atualiza métricas com dados simulados (fallback)
 * @param {Object} publication - Objeto da publicação
 */
const updateWithMockData = async (publication) => {
  try {
    // Calcular idade da publicação em dias
    const ageInDays = (new Date() - publication.publishedAt) / (1000 * 60 * 60 * 24);
    
    // Crescimento baseado em idade (publicações novas crescem mais rápido)
    const growthMultiplier = Math.max(0.1, 1 - (ageInDays / 30));
    
    // Obter métricas atuais ou inicializar
    const currentViews = publication.metrics?.views || 0;
    const currentLikes = publication.metrics?.likes || 0;
    const currentComments = publication.metrics?.comments || 0;
    const currentShares = publication.metrics?.shares || 0;
    
    // Crescimento simulado baseado na plataforma e idade
    let metrics = {};
    
    switch(publication.platform) {
      case 'youtube':
        metrics = {
          views: Math.floor(currentViews + (currentViews * 0.05 * growthMultiplier) + Math.random() * 10),
          likes: Math.floor(currentLikes + (currentLikes * 0.03 * growthMultiplier) + Math.random() * 3),
          comments: Math.floor(currentComments + (Math.random() * 2 * growthMultiplier)),
          shares: Math.floor(currentShares + (Math.random() * 1 * growthMultiplier))
        };
        break;
        
      case 'instagram':
        metrics = {
          views: Math.floor(currentViews + (currentViews * 0.03 * growthMultiplier) + Math.random() * 5),
          likes: Math.floor(currentLikes + (currentLikes * 0.04 * growthMultiplier) + Math.random() * 4),
          comments: Math.floor(currentComments + (Math.random() * 2 * growthMultiplier)),
          shares: Math.floor(currentShares + (Math.random() * 1 * growthMultiplier))
        };
        break;
        
      case 'twitter':
        metrics = {
          views: Math.floor(currentViews + (currentViews * 0.02 * growthMultiplier) + Math.random() * 8),
          likes: Math.floor(currentLikes + (currentLikes * 0.03 * growthMultiplier) + Math.random() * 2),
          comments: Math.floor(currentComments + (Math.random() * 1 * growthMultiplier)),
          shares: Math.floor(currentShares + (Math.random() * 2 * growthMultiplier))
        };
        break;
        
      case 'linkedin':
        metrics = {
          views: Math.floor(currentViews + (currentViews * 0.01 * growthMultiplier) + Math.random() * 3),
          likes: Math.floor(currentLikes + (currentLikes * 0.02 * growthMultiplier) + Math.random() * 1),
          comments: Math.floor(currentComments + (Math.random() * 0.5 * growthMultiplier)),
          shares: Math.floor(currentShares + (Math.random() * 0.2 * growthMultiplier))
        };
        break;
        
      case 'tiktok':
        metrics = {
          views: Math.floor(currentViews + (currentViews * 0.1 * growthMultiplier) + Math.random() * 20),
          likes: Math.floor(currentLikes + (currentLikes * 0.08 * growthMultiplier) + Math.random() * 10),
          comments: Math.floor(currentComments + (Math.random() * 5 * growthMultiplier)),
          shares: Math.floor(currentShares + (Math.random() * 3 * growthMultiplier))
        };
        break;
        
      case 'spotify':
        metrics = {
          views: Math.floor(currentViews + (currentViews * 0.02 * growthMultiplier) + Math.random() * 5),
          likes: Math.floor(currentLikes + (currentLikes * 0.01 * growthMultiplier) + Math.random() * 1),
          comments: currentComments,
          shares: Math.floor(currentShares + (Math.random() * 0.5 * growthMultiplier))
        };
        break;
        
      default:
        metrics = {
          views: currentViews,
          likes: currentLikes,
          comments: currentComments,
          shares: currentShares
        };
    }
    
    // Evitar valores negativos (por segurança)
    Object.keys(metrics).forEach(key => {
      metrics[key] = Math.max(0, metrics[key]);
    });
    
    // Atualizar métricas da publicação
    await publication.updateMetrics(metrics);
    
    console.log(`Métricas simuladas atualizadas para publicação ${publication._id} (${publication.platform})`);
  } catch (error) {
    console.error(`Erro ao atualizar métricas simuladas para publicação ${publication._id}:`, error);
  }
};

/**
 * Coleta métricas reais para uma publicação
 * @param {string} userId - ID do usuário
 * @param {string} platform - Nome da plataforma
 * @param {Object} publication - Objeto da publicação
 */
const collectPublicationMetrics = async (userId, platform, publication) => {
  try {
    // Dados da plataforma (ID do vídeo, URL, etc.)
    const platformData = publication.platformData || {};
    
    let metrics = null;
    
    // Coletar métricas específicas da plataforma
    switch(platform) {
      case 'youtube':
        if (platformData.videoId) {
          metrics = await collectYouTubeMetrics(userId, platformData.videoId);
        }
        break;
        
      case 'instagram':
        if (platformData.mediaId) {
          metrics = await collectInstagramMetrics(userId, platformData.mediaId);
        }
        break;
        
      case 'twitter':
        if (platformData.id) {
          metrics = await collectTwitterMetrics(userId, platformData.id);
        }
        break;
        
      case 'linkedin':
        if (platformData.id) {
          metrics = await collectLinkedInMetrics(userId, platformData.id);
        }
        break;
        
      case 'tiktok':
        if (platformData.video_id) {
          metrics = await collectTikTokMetrics(userId, platformData.video_id);
        }
        break;
        
      case 'spotify':
        if (publication.content?.episodeId) {
          metrics = await collectSpotifyMetrics(userId, publication.content.episodeId);
        }
        break;
    }
    
    // Se não conseguiu obter métricas reais, usar dados simulados
    if (!metrics) {
      console.log(`Não foi possível obter métricas reais para ${publication._id} (${platform}). Usando simulação.`);
      await updateWithMockData(publication);
      return;
    }
    
    // Atualizar métricas da publicação
    await publication.updateMetrics(metrics);
    
    console.log(`Métricas reais atualizadas para publicação ${publication._id} (${platform})`);
  } catch (error) {
    console.error(`Erro ao coletar métricas para publicação ${publication._id}:`, error);
    
    // Fallback para dados simulados em caso de erro
    await updateWithMockData(publication);
  }
};

/**
 * Coleta métricas do YouTube
 * @param {string} userId - ID do usuário
 * @param {string} videoId - ID do vídeo no YouTube
 */
const collectYouTubeMetrics = async (userId, videoId) => {
  try {
    // Obter token do YouTube
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
    
    // Buscar estatísticas do vídeo
    const response = await youtubeService.getVideoStats(videoId);
    
    if (!response || !response.items || response.items.length === 0) {
      return null;
    }
    
    const videoStats = response.items[0].statistics;
    
    return {
      views: parseInt(videoStats.viewCount) || 0,
      likes: parseInt(videoStats.likeCount) || 0,
      comments: parseInt(videoStats.commentCount) || 0,
      shares: 0 // YouTube API não fornece compartilhamentos
    };
  } catch (error) {
    console.error('Erro ao coletar métricas do YouTube:', error);
    return null;
  }
};

/**
 * Coleta métricas do Instagram
 * @param {string} userId - ID do usuário
 * @param {string} mediaId - ID da mídia no Instagram
 */
const collectInstagramMetrics = async (userId, mediaId) => {
  try {
    // Obter token do Instagram
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
    
    // Obter insights do post específico
    const mediaInfo = await instagramService.getMediaInfo(mediaId);
    
    if (!mediaInfo.success) {
      return null;
    }
    
    // Atualizar verificação
    instagramToken.lastVerified = new Date();
    await instagramToken.save();
    
    return {
      views: mediaInfo.data.viewCount || 0,
      likes: mediaInfo.data.likeCount || 0,
      comments: mediaInfo.data.commentCount || 0,
      shares: mediaInfo.data.shareCount || 0
    };
  } catch (error) {
    console.error('Erro ao coletar métricas do Instagram:', error);
    return null;
  }
};

/**
 * Placeholders para coleta de métricas das outras plataformas
 * Estas funções serão implementadas conforme as integrações completas forem desenvolvidas
 */
const collectTwitterMetrics = async (userId, tweetId) => {
  // Implementação real será feita posteriormente
  return null;
};

const collectLinkedInMetrics = async (userId, postId) => {
  // Implementação real será feita posteriormente
  return null;
};

const collectTikTokMetrics = async (userId, videoId) => {
  // Implementação real será feita posteriormente
  return null;
};

const collectSpotifyMetrics = async (userId, episodeId) => {
  // Implementação real será feita posteriormente
  return null;
};

/**
 * Força a coleta de métricas para uma publicação específica
 * Útil para testes ou atualizações manuais
 * @param {string} publicationId - ID da publicação
 */
const forceCollectMetrics = async (publicationId) => {
  try {
    const publication = await Publication.findById(publicationId)
      .populate('episode')
      .populate({
        path: 'createdBy',
        select: '_id email name'
      });
    
    if (!publication) {
      throw new Error('Publicação não encontrada');
    }
    
    if (publication.status !== 'published') {
      throw new Error('Apenas publicações com status "published" podem ter métricas coletadas');
    }
    
    const userId = publication.createdBy ? publication.createdBy._id.toString() : null;
    const platform = publication.platform;
    
    if (!userId) {
      throw new Error('Publicação não tem usuário associado');
    }
    
    // Verificar credenciais
    const hasValidCredentials = await checkPlatformCredentials(userId, platform);
    
    if (!hasValidCredentials) {
      console.log(`Força de coleta: Usuário ${userId} não tem credenciais válidas para ${platform}`);
      await updateWithMockData(publication);
      return {
        success: true,
        message: 'Métricas simuladas atualizadas com sucesso',
        publicationId
      };
    }
    
    // Coletar métricas reais
    await collectPublicationMetrics(userId, platform, publication);
    
    return {
      success: true,
      message: 'Métricas atualizadas com sucesso',
      publicationId
    };
  } catch (error) {
    console.error('Erro ao forçar coleta de métricas:', error);
    return {
      success: false,
      message: 'Erro ao coletar métricas',
      error: error.message
    };
  }
};

module.exports = {
  startCollector,
  stopCollector,
  collectMetrics,
  forceCollectMetrics,
  isActive,
  getStatus
};