/**
 * Serviço para coleta periódica de métricas de plataformas conectadas
 * Armazena histórico de métricas para visualização e análise ao longo do tempo
 */

const { scheduleJob } = require('node-schedule');
const youtubeService = require('./youtube');
const mongoose = require('mongoose');

// Modelos
const User = require('../models/User');
const YouTubeToken = require('../models/YouTubeToken');

// Agenda de coleta
let metricsJobs = {};

/**
 * Inicia o serviço de coleta de métricas
 */
const startCollector = async () => {
  try {
    console.log('[MetricsCollector] Iniciando serviço de coleta de métricas...');
    
    // Programar coleta diária (às 03:00 da manhã)
    scheduleJob('0 3 * * *', collectAllMetrics);
    
    // Coleta inicial no startup
    setTimeout(collectAllMetrics, 60000); // 1 minuto após o startup
    
    return true;
  } catch (error) {
    console.error('[MetricsCollector] Erro ao iniciar serviço de coleta:', error);
    return false;
  }
};

/**
 * Coleta métricas de todas as plataformas para todos os usuários
 */
const collectAllMetrics = async () => {
  try {
    console.log('[MetricsCollector] Iniciando coleta de métricas para todos os usuários...');
    
    // Obter todos os usuários com tokens válidos do YouTube
    const youtubeTokens = await YouTubeToken.find({ is_valid: true })
      .select('user company');
    
    console.log(`[MetricsCollector] Encontrados ${youtubeTokens.length} tokens do YouTube para coleta de métricas`);
    
    // Coletar métricas para cada usuário
    for (const token of youtubeTokens) {
      try {
        await collectYouTubeMetrics(token.user, token.company);
      } catch (error) {
        console.error(`[MetricsCollector] Erro ao coletar métricas do YouTube para usuário ${token.user}:`, error);
      }
    }
    
    console.log('[MetricsCollector] Coleta de métricas concluída com sucesso');
  } catch (error) {
    console.error('[MetricsCollector] Erro na coleta de métricas:', error);
  }
};

/**
 * Coleta métricas do YouTube para um usuário específico
 * @param {string} userId ID do usuário
 * @param {string} companyId ID da empresa
 */
const collectYouTubeMetrics = async (userId, companyId) => {
  try {
    console.log(`[MetricsCollector] Coletando métricas do YouTube para usuário ${userId}...`);
    
    // Obter métricas do YouTube
    const result = await youtubeService.getChannelMetrics(userId);
    
    if (!result.success) {
      throw new Error(result.error || 'Falha ao obter métricas');
    }
    
    // Obter dados relevantes para armazenamento
    const metrics = result.data;
    const currentDate = new Date();
    
    // Criar documento de métricas diárias
    const YouTubeMetrics = mongoose.model('YouTubeMetrics');
    
    // Calcular totais
    const totalViews = parseInt(metrics.totalStats.views || 0);
    const totalLikes = parseInt(metrics.totalStats.likes || 0);
    const totalComments = parseInt(metrics.totalStats.comments || 0);
    const totalSubscribers = parseInt(metrics.totalStats.subscribers || 0);
    
    // Calcular métricas por vídeo
    const videoMetrics = metrics.videos.map(video => ({
      videoId: video.id,
      title: video.title,
      publishedAt: video.publishedAt,
      views: parseInt(video.statistics.viewCount || 0),
      likes: parseInt(video.statistics.likeCount || 0),
      comments: parseInt(video.statistics.commentCount || 0)
    }));
    
    // Criar ou atualizar documento de métricas
    const metricsDoc = await YouTubeMetrics.findOneAndUpdate(
      {
        user: userId,
        company: companyId,
        date: {
          $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()),
          $lt: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1)
        }
      },
      {
        user: userId,
        company: companyId,
        channelId: metrics.channelInfo.id,
        date: currentDate,
        totalStats: {
          views: totalViews,
          likes: totalLikes,
          comments: totalComments,
          subscribers: totalSubscribers,
          videos: metrics.videos.length
        },
        videosStats: videoMetrics,
        rawData: metrics // Armazenar os dados brutos para análise futura
      },
      { upsert: true, new: true }
    );
    
    console.log(`[MetricsCollector] Métricas do YouTube armazenadas com sucesso: ${metricsDoc._id}`);
    return metricsDoc;
  } catch (error) {
    console.error(`[MetricsCollector] Erro ao coletar métricas do YouTube:`, error);
    throw error;
  }
};

/**
 * Define uma coleta específica para um usuário (sob demanda)
 * @param {string} userId ID do usuário
 */
const scheduleUserCollection = async (userId) => {
  try {
    // Verificar se o usuário tem tokens válidos
    const youtubeToken = await YouTubeToken.findOne({ user: userId, is_valid: true });
    
    if (!youtubeToken) {
      return { success: false, message: 'Usuário não possui tokens válidos para coleta de métricas' };
    }
    
    // Programar coleta periódica
    if (metricsJobs[userId]) {
      metricsJobs[userId].cancel();
    }
    
    // Coleta imediata
    const companyId = youtubeToken.company;
    
    try {
      await collectYouTubeMetrics(userId, companyId);
      
      // Próxima coleta em 24 horas
      metricsJobs[userId] = scheduleJob(new Date(Date.now() + 24 * 60 * 60 * 1000), async () => {
        try {
          await collectYouTubeMetrics(userId, companyId);
        } catch (error) {
          console.error(`[MetricsCollector] Erro na coleta agendada para usuário ${userId}:`, error);
        }
      });
      
      return { success: true, message: 'Coleta de métricas agendada com sucesso' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  } catch (error) {
    console.error('[MetricsCollector] Erro ao agendar coleta para usuário:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  startCollector,
  collectAllMetrics,
  collectYouTubeMetrics,
  scheduleUserCollection
};