const YouTubeToken = require('../../models/YouTubeToken');
const YouTubeVideo = require('../../models/youtube/YouTubeVideo');
const YouTubeComment = require('../../models/youtube/YouTubeComment');
const YouTubeSyncJob = require('../../models/youtube/YouTubeSyncJob');
const youtubeSyncService = require('../../services/youtube/sync');

/**
 * Inicia uma sincronização manual completa do canal
 */
exports.startFullSync = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Verificar se o usuário está conectado ao YouTube
    const youtubeToken = await YouTubeToken.findOne({ user: userId });
    
    if (!youtubeToken) {
      return res.status(400).json({
        success: false,
        message: 'Você não está conectado ao YouTube. Conecte sua conta primeiro.'
      });
    }
    
    const channelId = youtubeToken.channel_id;
    
    // Obter empresa do usuário
    const User = require('../../models/User');
    const user = await User.findById(userId).populate('company');
    
    if (!user || !user.company) {
      return res.status(400).json({
        success: false,
        message: 'Você precisa estar associado a uma empresa para realizar a sincronização.'
      });
    }
    
    const companyId = user.company._id;
    
    // Verificar se já há um job de sincronização ativo
    const activeJob = await YouTubeSyncJob.findOne({
      user: userId,
      channel_id: channelId,
      status: { $in: ['pending', 'processing'] }
    });
    
    if (activeJob) {
      return res.status(400).json({
        success: false,
        message: 'Já existe uma sincronização em andamento para este canal.',
        jobId: activeJob._id,
        status: activeJob.status
      });
    }
    
    // Configurar parâmetros do job
    const jobParams = {
      include_comments: req.body.includeComments === true,
      comment_limit: parseInt(req.body.commentLimit) || 100,
      limit: parseInt(req.body.limit) || 0
    };
    
    // Verificar se deve ser recorrente
    const isRecurring = req.body.isRecurring === true;
    
    let recurrenceConfig = null;
    if (isRecurring) {
      recurrenceConfig = {
        frequency: req.body.frequency || 'daily',
        interval: parseInt(req.body.interval) || 1
      };
    }
    
    // Agendar sincronização
    const job = await youtubeSyncService.scheduleSync({
      userId,
      companyId,
      channelId,
      jobType: 'full_sync',
      params: jobParams,
      priority: 5, // Prioridade média-alta para jobs manuais
      source: 'manual',
      initiatedBy: userId,
      isRecurring,
      recurrenceConfig
    });
    
    res.status(201).json({
      success: true,
      message: 'Sincronização iniciada com sucesso',
      jobId: job._id,
      status: job.status
    });
  } catch (error) {
    console.error('Erro ao iniciar sincronização:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao iniciar sincronização',
      error: error.message
    });
  }
};

/**
 * Obtém o status de um job de sincronização
 */
exports.getSyncStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user._id;
    
    // Buscar job no banco de dados
    const job = await YouTubeSyncJob.findOne({
      _id: jobId,
      user: userId
    });
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job de sincronização não encontrado'
      });
    }
    
    // Retornar status e progresso
    res.json({
      success: true,
      job: {
        _id: job._id,
        status: job.status,
        progress: job.progress,
        started_at: job.started_at,
        completed_at: job.completed_at,
        duration_ms: job.duration_ms,
        logs: job.logs.slice(-10) // Retornar apenas os 10 logs mais recentes
      }
    });
  } catch (error) {
    console.error('Erro ao obter status do job:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter status do job',
      error: error.message
    });
  }
};

/**
 * Obtém todos os jobs de sincronização do usuário
 */
exports.getAllJobs = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Parâmetros de paginação
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status || null;
    
    // Construir query
    const query = { user: userId };
    
    // Filtrar por status se especificado
    if (status) {
      query.status = status;
    }
    
    // Contar total de registros para paginação
    const total = await YouTubeSyncJob.countDocuments(query);
    
    // Buscar jobs com paginação e ordenação
    const jobs = await YouTubeSyncJob.find(query)
      .sort({ scheduled_for: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
      
    // Retornar lista de jobs
    res.json({
      success: true,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      jobs: jobs.map(job => ({
        _id: job._id,
        job_type: job.job_type,
        status: job.status,
        progress: job.progress,
        scheduled_for: job.scheduled_for,
        started_at: job.started_at,
        completed_at: job.completed_at,
        channel_id: job.channel_id,
        is_recurring: job.is_recurring
      }))
    });
  } catch (error) {
    console.error('Erro ao listar jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar jobs',
      error: error.message
    });
  }
};

/**
 * Cancela um job de sincronização
 */
exports.cancelJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user._id;
    const reason = req.body.reason || 'Cancelado pelo usuário';
    
    // Buscar job no banco de dados
    const job = await YouTubeSyncJob.findOne({
      _id: jobId,
      user: userId,
      status: { $in: ['pending', 'processing'] }
    });
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job de sincronização não encontrado ou não pode ser cancelado'
      });
    }
    
    // Cancelar job
    await job.cancel(reason);
    
    res.json({
      success: true,
      message: 'Job cancelado com sucesso',
      jobId: job._id,
      status: job.status
    });
  } catch (error) {
    console.error('Erro ao cancelar job:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao cancelar job',
      error: error.message
    });
  }
};

/**
 * Listar estatísticas e totais de conteúdo sincronizado
 */
exports.getSyncStats = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Obter token do YouTube
    const youtubeToken = await YouTubeToken.findOne({ user: userId });
    
    if (!youtubeToken) {
      return res.status(400).json({
        success: false,
        message: 'Você não está conectado ao YouTube.'
      });
    }
    
    const channelId = youtubeToken.channel_id;
    
    // Contar total de vídeos sincronizados
    const totalVideos = await YouTubeVideo.countDocuments({
      user: userId,
      channel_id: channelId,
      is_deleted: false
    });
    
    // Contar total de comentários sincronizados
    const totalComments = await YouTubeComment.countDocuments({
      user: userId,
      channel_id: channelId,
      is_deleted: false
    });
    
    // Obter último vídeo sincronizado
    const lastVideo = await YouTubeVideo.findOne({
      user: userId,
      channel_id: channelId,
      is_deleted: false
    })
    .sort({ last_synced: -1 })
    .select('title video_id last_synced');
    
    // Obter estatísticas totais do canal
    let totalStats = {
      views: 0,
      likes: 0,
      comments: 0
    };
    
    // Agregar estatísticas de todos os vídeos
    const statsAggregation = await YouTubeVideo.aggregate([
      {
        $match: {
          user: userId,
          channel_id: channelId,
          is_deleted: false
        }
      },
      {
        $group: {
          _id: null,
          totalViews: { $sum: '$stats.views' },
          totalLikes: { $sum: '$stats.likes' },
          totalComments: { $sum: '$stats.comments' }
        }
      }
    ]);
    
    if (statsAggregation.length > 0) {
      totalStats.views = statsAggregation[0].totalViews;
      totalStats.likes = statsAggregation[0].totalLikes;
      totalStats.comments = statsAggregation[0].totalComments;
    }
    
    // Obter status do último job de sincronização
    const lastJob = await YouTubeSyncJob.findOne({
      user: userId,
      channel_id: channelId
    })
    .sort({ scheduled_for: -1 })
    .select('status job_type scheduled_for completed_at progress');
    
    // Retornar estatísticas
    res.json({
      success: true,
      stats: {
        channel_id: channelId,
        total_videos: totalVideos,
        total_comments: totalComments,
        metrics: totalStats,
        last_sync: lastJob ? {
          status: lastJob.status,
          job_type: lastJob.job_type,
          scheduled_for: lastJob.scheduled_for,
          completed_at: lastJob.completed_at,
          progress: lastJob.progress
        } : null,
        last_video: lastVideo
      }
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas de sincronização:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter estatísticas de sincronização',
      error: error.message
    });
  }
};

/**
 * Listar vídeos sincronizados do canal
 */
exports.getVideos = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Parâmetros de paginação e filtros
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const sortBy = req.query.sortBy || 'published_at';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const search = req.query.search || '';
    
    // Obter token do YouTube
    const youtubeToken = await YouTubeToken.findOne({ user: userId });
    
    if (!youtubeToken) {
      return res.status(400).json({
        success: false,
        message: 'Você não está conectado ao YouTube.'
      });
    }
    
    const channelId = youtubeToken.channel_id;
    
    // Construir query
    const query = {
      user: userId,
      channel_id: channelId,
      is_deleted: false
    };
    
    // Adicionar busca se fornecida
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Contar total de registros para paginação
    const total = await YouTubeVideo.countDocuments(query);
    
    // Definir ordenação
    const sort = {};
    sort[sortBy] = sortOrder;
    
    // Buscar vídeos com paginação e ordenação
    const videos = await YouTubeVideo.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit);
      
    // Retornar lista de vídeos
    res.json({
      success: true,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      videos: videos.map(video => ({
        _id: video._id,
        video_id: video.video_id,
        title: video.title,
        thumbnail_url: video.thumbnail_url,
        published_at: video.published_at,
        stats: video.stats,
        last_synced: video.last_synced
      }))
    });
  } catch (error) {
    console.error('Erro ao listar vídeos sincronizados:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar vídeos sincronizados',
      error: error.message
    });
  }
};

/**
 * Obter detalhes de um vídeo específico
 */
exports.getVideoDetails = async (req, res) => {
  try {
    const userId = req.user._id;
    const { videoId } = req.params;
    
    // Buscar vídeo no banco de dados
    const video = await YouTubeVideo.findOne({
      user: userId,
      video_id: videoId,
      is_deleted: false
    });
    
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Vídeo não encontrado'
      });
    }
    
    // Obter comentários do vídeo
    const comments = await YouTubeComment.find({
      user: userId,
      video_id: videoId,
      is_deleted: false,
      parent_id: null // Apenas comentários de nível superior
    })
    .sort({ published_at: -1 })
    .limit(50);
    
    // Retornar detalhes do vídeo
    res.json({
      success: true,
      video: {
        _id: video._id,
        video_id: video.video_id,
        title: video.title,
        description: video.description,
        thumbnail_url: video.thumbnail_url,
        published_at: video.published_at,
        stats: video.stats,
        stats_history: video.stats_history,
        tags: video.tags,
        duration: video.duration,
        definition: video.definition,
        privacy_status: video.privacy_status,
        last_synced: video.last_synced
      },
      comments: comments.map(comment => ({
        _id: comment._id,
        comment_id: comment.comment_id,
        author_name: comment.author_name,
        author_profile_image: comment.author_profile_image,
        text: comment.text,
        published_at: comment.published_at,
        like_count: comment.like_count,
        is_replied: comment.is_replied
      }))
    });
  } catch (error) {
    console.error('Erro ao obter detalhes do vídeo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter detalhes do vídeo',
      error: error.message
    });
  }
};

/**
 * Processar jobs pendentes (endpoint para admin)
 */
exports.processPendingJobs = async (req, res) => {
  try {
    // Verificar se o usuário é admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Apenas administradores podem executar esta ação'
      });
    }
    
    // Processar jobs pendentes
    const limit = parseInt(req.query.limit) || 5;
    const jobsProcessed = await youtubeSyncService.processPendingJobs(limit);
    
    res.json({
      success: true,
      message: `${jobsProcessed} jobs foram iniciados`,
      jobsProcessed
    });
  } catch (error) {
    console.error('Erro ao processar jobs pendentes:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar jobs pendentes',
      error: error.message
    });
  }
};
