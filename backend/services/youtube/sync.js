const { google } = require('googleapis');
const YouTubeToken = require('../../models/YouTubeToken');
const YouTubeVideo = require('../../models/youtube/YouTubeVideo');
const YouTubeComment = require('../../models/youtube/YouTubeComment');
const YouTubeSyncJob = require('../../models/youtube/YouTubeSyncJob');
const tokenManager = require('../../utils/tokenManager');

class YouTubeSyncService {
  constructor() {
    this.pageSize = 50; // Tamanho padrão para paginação
    this.activeJobs = new Map(); // Rastrear jobs ativos por ID
  }

  /**
   * Inicializa o cliente OAuth2 com as credenciais corretas
   * @param {string} userId - ID do usuário
   * @returns {Object} Cliente YouTube configurado
   */
  async initYoutubeClient(userId) {
    try {
      // Obter token do YouTube
      const youtubeToken = await YouTubeToken.findOne({ user: userId }).select('+access_token +refresh_token');
      
      if (!youtubeToken) {
        throw new Error('Tokens do YouTube não encontrados para este usuário');
      }
      
      // Verificar se o token expirou
      if (youtubeToken.isExpired()) {
        // Obter tokens descriptografados
        const decryptedTokens = youtubeToken.getDecryptedTokens();
        
        // Atualizar usando o serviço existente
        const youtubeService = require('../youtube');
        const refreshedTokens = await youtubeService.refreshAccessToken(decryptedTokens.refresh_token);
        
        // Atualizar token no banco de dados
        youtubeToken.access_token = refreshedTokens.access_token;
        youtubeToken.refresh_token = refreshedTokens.refresh_token || decryptedTokens.refresh_token;
        youtubeToken.expiry_date = refreshedTokens.expiry_date;
        youtubeToken.last_refreshed = Date.now();
        
        await youtubeToken.save();
      }
      
      // Configurar cliente OAuth2
      const oauth2Client = new google.auth.OAuth2(
        process.env.YOUTUBE_CLIENT_ID,
        process.env.YOUTUBE_CLIENT_SECRET,
        process.env.YOUTUBE_REDIRECT_URI
      );
      
      // Obter tokens descriptografados
      const tokens = youtubeToken.getDecryptedTokens();
      
      // Configurar credenciais
      oauth2Client.setCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date
      });
      
      // Criar cliente YouTube
      const youtube = google.youtube({
        version: 'v3',
        auth: oauth2Client
      });
      
      return { youtube, oauth2Client, channelId: youtubeToken.channel_id };
    } catch (error) {
      console.error('Erro ao inicializar cliente YouTube:', error);
      throw error;
    }
  }

  /**
   * Executa uma sincronização completa de todos os vídeos do canal
   * @param {Object} job - Job de sincronização
   * @returns {Promise<Object>} Resultados da sincronização
   */
  async executeFullSync(job) {
    try {
      await job.start();
      
      // Inicializar cliente YouTube
      const { youtube, channelId } = await this.initYoutubeClient(job.user);
      
      // 1. Buscar todos os vídeos do canal
      await job.addLog('info', `Iniciando sincronização completa para o canal: ${channelId}`);
      await job.addLog('info', 'Obtendo lista de vídeos do canal...');
      
      const allVideos = await this.fetchAllChannelVideos(youtube, channelId, job);
      
      // Atualizar o total no progresso do job
      job.progress.total_items = allVideos.length;
      await job.updateProgress(0, 0, 0);
      
      // 2. Processar vídeos em lotes para evitar limite de API
      const BATCH_SIZE = 50; // YouTube API permite 50 vídeos por requisição
      
      let processedCount = 0;
      let successCount = 0;
      let errorCount = 0;
      
      // Processar em lotes
      for (let i = 0; i < allVideos.length; i += BATCH_SIZE) {
        const batch = allVideos.slice(i, i + BATCH_SIZE);
        const videoIds = batch.map(v => v.videoId);
        
        try {
          // Obter detalhes completos dos vídeos
          const videoDetails = await this.fetchVideoDetails(youtube, videoIds);
          
          // Processar e salvar cada vídeo no banco de dados
          for (const video of videoDetails) {
            try {
              await this.saveVideoToDatabase(video, job.user, job.company, channelId);
              successCount++;
            } catch (videoError) {
              errorCount++;
              await job.addLog('error', `Erro ao salvar vídeo ${video.id}: ${videoError.message}`);
            }
          }
          
          processedCount += batch.length;
          await job.updateProgress(processedCount, successCount, errorCount);
          
        } catch (batchError) {
          errorCount += batch.length;
          await job.addLog('error', `Erro ao processar lote de vídeos: ${batchError.message}`);
          await job.updateProgress(processedCount, successCount, errorCount);
        }
        
        // Pausa breve para não exceder limites de taxa da API
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // 3. Sincronizar comentários se solicitado
      if (job.params && job.params.include_comments) {
        await job.addLog('info', 'Iniciando sincronização de comentários...');
        await this.syncAllVideoComments(job, youtube, channelId);
      }
      
      // 4. Finalizar job com sucesso
      await job.complete();
      
      return {
        success: true,
        processedVideos: processedCount,
        successCount,
        errorCount
      };
    } catch (error) {
      await job.fail(error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtém todos os vídeos do canal usando paginação
   * @param {Object} youtube - Cliente YouTube API
   * @param {string} channelId - ID do canal 
   * @param {Object} job - Job de sincronização
   * @returns {Promise<Array>} Lista de todos os vídeos
   */
  async fetchAllChannelVideos(youtube, channelId, job) {
    let allVideos = [];
    let nextPageToken = null;
    let errorRetries = 0;
    const MAX_RETRIES = 3;
    let pageCount = 0;
    
    do {
      try {
        // Buscar vídeos do canal com paginação
        const response = await youtube.search.list({
          part: 'id,snippet',
          channelId: channelId,
          maxResults: 50, // Máximo permitido pela API
          order: 'date',  // Ordenar por data
          type: 'video',  // Apenas vídeos
          pageToken: nextPageToken
        });
        
        pageCount++;
        
        // Extrair dados dos vídeos
        const videos = response.data.items.map(item => ({
          videoId: item.id.videoId,
          title: item.snippet.title,
          publishedAt: item.snippet.publishedAt
        }));
        
        allVideos = allVideos.concat(videos);
        
        // Atualizar próxima página
        nextPageToken = response.data.nextPageToken;
        
        // Estimar o total se disponível
        if (response.data.pageInfo && response.data.pageInfo.totalResults) {
          const estimatedTotal = response.data.pageInfo.totalResults;
          await job.addLog('info', `Progresso: ${allVideos.length}/${estimatedTotal} vídeos coletados (página ${pageCount})`);
        } else {
          await job.addLog('info', `Progresso: ${allVideos.length} vídeos coletados (página ${pageCount})`);
        }
        
        // Pausa breve para não exceder limites de taxa da API
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Resetar contagem de erros após sucesso
        errorRetries = 0;
        
      } catch (error) {
        errorRetries++;
        await job.addLog('warning', `Erro ao obter página ${pageCount} de vídeos: ${error.message}. Tentativa ${errorRetries}/${MAX_RETRIES}`);
        
        if (errorRetries >= MAX_RETRIES) {
          await job.addLog('error', `Número máximo de tentativas excedido. Continuando com ${allVideos.length} vídeos obtidos.`);
          break;
        }
        
        // Esperar antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } while (nextPageToken);
    
    await job.addLog('info', `Coleta de vídeos concluída. Total: ${allVideos.length} vídeos`);
    return allVideos;
  }

  /**
   * Obtém detalhes completos de vídeos por IDs
   * @param {Object} youtube - Cliente YouTube API
   * @param {Array<string>} videoIds - Lista de IDs de vídeos
   * @returns {Promise<Array>} Lista com detalhes completos dos vídeos
   */
  async fetchVideoDetails(youtube, videoIds) {
    if (!videoIds || videoIds.length === 0) {
      return [];
    }
    
    try {
      // Obter detalhes de vídeos (metadados completos)
      const videoResponse = await youtube.videos.list({
        part: 'snippet,contentDetails,statistics,status',
        id: videoIds.join(',')
      });
      
      return videoResponse.data.items || [];
    } catch (error) {
      console.error('Erro ao obter detalhes dos vídeos:', error);
      throw error;
    }
  }

  /**
   * Salva ou atualiza informações do vídeo no banco de dados
   * @param {Object} videoData - Dados do vídeo da API do YouTube
   * @param {string} userId - ID do usuário
   * @param {string} companyId - ID da empresa
   * @param {string} channelId - ID do canal
   * @returns {Promise<Object>} Documento do vídeo salvo
   */
  async saveVideoToDatabase(videoData, userId, companyId, channelId) {
    try {
      // Verificar se o vídeo já existe no banco
      let video = await YouTubeVideo.findOne({
        user: userId,
        video_id: videoData.id
      });
      
      // Extrair dados do vídeo
      const videoInfo = {
        user: userId,
        company: companyId,
        channel_id: channelId,
        video_id: videoData.id,
        title: videoData.snippet.title,
        description: videoData.snippet.description,
        thumbnail_url: videoData.snippet.thumbnails.high ? 
                      videoData.snippet.thumbnails.high.url : 
                      (videoData.snippet.thumbnails.default ? 
                       videoData.snippet.thumbnails.default.url : ''),
        published_at: new Date(videoData.snippet.publishedAt),
        tags: videoData.snippet.tags || [],
        category_id: videoData.snippet.categoryId,
        duration: videoData.contentDetails ? videoData.contentDetails.duration : '',
        definition: videoData.contentDetails ? videoData.contentDetails.definition : '',
        caption: videoData.contentDetails ? videoData.contentDetails.caption === 'true' : false,
        license: videoData.status ? videoData.status.license : '',
        privacy_status: videoData.status ? videoData.status.privacyStatus : 'public',
        stats: {
          views: videoData.statistics ? parseInt(videoData.statistics.viewCount || 0) : 0,
          likes: videoData.statistics ? parseInt(videoData.statistics.likeCount || 0) : 0,
          dislikes: videoData.statistics ? parseInt(videoData.statistics.dislikeCount || 0) : 0,
          favorites: videoData.statistics ? parseInt(videoData.statistics.favoriteCount || 0) : 0,
          comments: videoData.statistics ? parseInt(videoData.statistics.commentCount || 0) : 0
        },
        last_synced: new Date(),
        sync_status: 'synced'
      };
      
      if (video) {
        // Atualizar vídeo existente
        
        // Verificar se houve mudanças nas estatísticas para registrar no histórico
        const statsChanged = 
          video.stats.views !== videoInfo.stats.views ||
          video.stats.likes !== videoInfo.stats.likes ||
          video.stats.comments !== videoInfo.stats.comments;
        
        if (statsChanged) {
          // Adicionar estatísticas atuais ao histórico
          video.stats_history.push({
            date: new Date(),
            views: video.stats.views,
            likes: video.stats.likes,
            dislikes: video.stats.dislikes,
            favorites: video.stats.favorites,
            comments: video.stats.comments
          });
          
          // Limitar o histórico a 100 entradas
          if (video.stats_history.length > 100) {
            video.stats_history = video.stats_history.slice(-100);
          }
        }
        
        // Atualizar com novos dados
        Object.assign(video, videoInfo);
      } else {
        // Criar novo vídeo
        video = new YouTubeVideo(videoInfo);
        
        // Inicializar o histórico de estatísticas
        video.stats_history = [{
          date: new Date(),
          views: videoInfo.stats.views,
          likes: videoInfo.stats.likes,
          dislikes: videoInfo.stats.dislikes,
          favorites: videoInfo.stats.favorites,
          comments: videoInfo.stats.comments
        }];
      }
      
      // Salvar no banco de dados
      await video.save();
      return video;
    } catch (error) {
      console.error(`Erro ao salvar vídeo ${videoData.id}:`, error);
      throw error;
    }
  }

  /**
   * Sincroniza comentários para todos os vídeos
   * @param {Object} job - Job de sincronização
   * @param {Object} youtube - Cliente YouTube API
   * @param {string} channelId - ID do canal
   * @returns {Promise<Object>} Resultados da sincronização
   */
  async syncAllVideoComments(job, youtube, channelId) {
    try {
      // Obter lista de vídeos no banco de dados para este canal
      const videos = await YouTubeVideo.find({
        user: job.user,
        channel_id: channelId,
        is_deleted: false
      }).sort({ published_at: -1 });
      
      await job.addLog('info', `Sincronizando comentários para ${videos.length} vídeos`);
      
      // Configurar limite de comentários por vídeo
      const commentLimit = job.params.comment_limit || 100;
      
      let totalCommentsSynced = 0;
      let videosProcessed = 0;
      let videosWithError = 0;
      
      // Sincronizar comentários para cada vídeo
      for (const video of videos) {
        try {
          const videoCommentCount = await this.syncVideoComments(
            youtube, 
            video.video_id,
            job.user,
            job.company,
            channelId,
            commentLimit
          );
          
          totalCommentsSynced += videoCommentCount;
          videosProcessed++;
          
          // Atualizar progresso a cada 5 vídeos
          if (videosProcessed % 5 === 0 || videosProcessed === videos.length) {
            await job.addLog('info', `Comentários sincronizados: ${totalCommentsSynced} de ${videosProcessed}/${videos.length} vídeos`);
          }
          
          // Pausa breve para não exceder limites de taxa da API
          await new Promise(resolve => setTimeout(resolve, 300));
          
        } catch (error) {
          videosWithError++;
          await job.addLog('error', `Erro ao sincronizar comentários para vídeo ${video.video_id}: ${error.message}`);
          
          // Continuar mesmo com erros
          continue;
        }
      }
      
      await job.addLog('info', `Sincronização de comentários concluída. Total: ${totalCommentsSynced} comentários de ${videosProcessed} vídeos. Erros: ${videosWithError}`);
      
      return {
        totalCommentsSynced,
        videosProcessed,
        videosWithError
      };
    } catch (error) {
      await job.addLog('error', `Erro ao sincronizar comentários: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sincroniza comentários para um vídeo específico
   * @param {Object} youtube - Cliente YouTube API
   * @param {string} videoId - ID do vídeo
   * @param {string} userId - ID do usuário
   * @param {string} companyId - ID da empresa
   * @param {string} channelId - ID do canal
   * @param {number} maxComments - Número máximo de comentários a sincronizar
   * @returns {Promise<number>} Número de comentários sincronizados
   */
  async syncVideoComments(youtube, videoId, userId, companyId, channelId, maxComments = 100) {
    try {
      let commentCount = 0;
      let nextPageToken = null;
      
      do {
        // Obter comentários do vídeo
        const response = await youtube.commentThreads.list({
          part: 'snippet,replies',
          videoId: videoId,
          maxResults: 100, // Máximo permitido pela API
          pageToken: nextPageToken
        });
        
        if (!response.data.items) {
          break;
        }
        
        // Processar cada thread de comentários (comentário principal + respostas)
        for (const thread of response.data.items) {
          // Processar comentário principal
          const topComment = thread.snippet.topLevelComment;
          await this.saveCommentToDatabase(
            topComment.snippet,
            videoId,
            userId,
            companyId,
            channelId,
            thread.id,
            null // Sem parent_id para comentários de nível superior
          );
          
          commentCount++;
          
          // Processar respostas ao comentário
          if (thread.replies && thread.replies.comments) {
            for (const reply of thread.replies.comments) {
              await this.saveCommentToDatabase(
                reply.snippet,
                videoId,
                userId,
                companyId,
                channelId,
                reply.id,
                thread.id // parent_id é o ID do thread
              );
              
              commentCount++;
            }
          }
          
          // Verificar se atingimos o limite
          if (commentCount >= maxComments) {
            return commentCount;
          }
        }
        
        // Atualizar próxima página
        nextPageToken = response.data.nextPageToken;
        
        // Pausa breve para não exceder limites de taxa da API
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } while (nextPageToken);
      
      return commentCount;
    } catch (error) {
      console.error(`Erro ao sincronizar comentários para vídeo ${videoId}:`, error);
      throw error;
    }
  }

  /**
   * Salva ou atualiza um comentário no banco de dados
   * @param {Object} commentData - Dados do comentário da API do YouTube
   * @param {string} videoId - ID do vídeo
   * @param {string} userId - ID do usuário
   * @param {string} companyId - ID da empresa
   * @param {string} channelId - ID do canal
   * @param {string} commentId - ID do comentário
   * @param {string} parentId - ID do comentário pai (null para comentários de nível superior)
   * @returns {Promise<Object>} Documento do comentário salvo
   */
  async saveCommentToDatabase(commentData, videoId, userId, companyId, channelId, commentId, parentId) {
    try {
      // Verificar se o comentário já existe no banco
      let comment = await YouTubeComment.findOne({
        user: userId,
        comment_id: commentId
      });
      
      // Extrair dados do comentário
      const commentInfo = {
        user: userId,
        company: companyId,
        channel_id: channelId,
        video_id: videoId,
        comment_id: commentId,
        parent_id: parentId,
        author_name: commentData.authorDisplayName,
        author_channel_id: commentData.authorChannelId ? commentData.authorChannelId.value : null,
        author_profile_image: commentData.authorProfileImageUrl,
        text: commentData.textDisplay,
        published_at: new Date(commentData.publishedAt),
        updated_at: commentData.updatedAt ? new Date(commentData.updatedAt) : null,
        like_count: parseInt(commentData.likeCount || 0),
        last_synced: new Date(),
        sync_status: 'synced'
      };
      
      if (comment) {
        // Atualizar comentário existente
        Object.assign(comment, commentInfo);
      } else {
        // Criar novo comentário
        comment = new YouTubeComment(commentInfo);
      }
      
      // Salvar no banco de dados
      await comment.save();
      return comment;
    } catch (error) {
      console.error(`Erro ao salvar comentário ${commentId}:`, error);
      throw error;
    }
  }

  /**
   * Agenda um job de sincronização para execução
   * @param {Object} options - Opções do job de sincronização
   * @returns {Promise<Object>} Job criado
   */
  async scheduleSync(options) {
    const {
      userId,
      companyId,
      channelId,
      jobType = 'full_sync',
      scheduledFor = new Date(),
      params = {},
      priority = 0,
      source = 'manual',
      initiatedBy,
      isRecurring = false,
      recurrenceConfig = null
    } = options;
    
    // Criar novo job
    const job = new YouTubeSyncJob({
      user: userId,
      company: companyId,
      channel_id: channelId,
      job_type: jobType,
      scheduled_for: scheduledFor,
      params,
      priority,
      source,
      initiated_by: initiatedBy,
      is_recurring: isRecurring,
      recurrence_config: recurrenceConfig
    });
    
    // Adicionar log inicial
    job.logs.push({
      level: 'info',
      message: `Job de sincronização criado: ${jobType}`
    });
    
    // Salvar job
    await job.save();
    
    // Se o job deve ser executado imediatamente
    if (scheduledFor <= new Date()) {
      // Iniciar job em segundo plano
      this.executeJobInBackground(job._id);
    }
    
    return job;
  }

  /**
   * Executa um job de sincronização em segundo plano
   * @param {string} jobId - ID do job
   */
  async executeJobInBackground(jobId) {
    // Verificar se o job já está sendo executado
    if (this.activeJobs.has(jobId)) {
      console.log(`Job ${jobId} já está em execução`);
      return;
    }
    
    // Marcar job como ativo
    this.activeJobs.set(jobId, true);
    
    setTimeout(async () => {
      try {
        // Carregar job do banco de dados
        const job = await YouTubeSyncJob.findById(jobId);
        
        if (!job || job.status !== 'pending') {
          console.log(`Job ${jobId} não encontrado ou não está pendente`);
          this.activeJobs.delete(jobId);
          return;
        }
        
        // Executar job com base no tipo
        switch (job.job_type) {
          case 'full_sync':
            await this.executeFullSync(job);
            break;
          case 'incremental_sync':
            // Implementar lógica para sincronização incremental
            break;
          case 'stats_update':
            // Implementar lógica para atualização de estatísticas
            break;
          case 'comments_sync':
            // Implementar lógica para sincronização de comentários
            break;
          default:
            await job.fail(new Error(`Tipo de job não suportado: ${job.job_type}`));
        }
        
      } catch (error) {
        console.error(`Erro ao executar job ${jobId}:`, error);
        
        // Tentar atualizar status do job para falha
        try {
          const job = await YouTubeSyncJob.findById(jobId);
          if (job) {
            await job.fail(error);
          }
        } catch (updateError) {
          console.error(`Erro ao atualizar status do job ${jobId}:`, updateError);
        }
      } finally {
        // Remover job da lista de ativos
        this.activeJobs.delete(jobId);
      }
    }, 0);
  }

  /**
   * Processa jobs pendentes, executando os próximos na fila
   * @param {number} limit - Número máximo de jobs a processar
   * @returns {Promise<number>} Número de jobs iniciados
   */
  async processPendingJobs(limit = 5) {
    try {
      // Encontrar jobs pendentes
      const pendingJobs = await YouTubeSyncJob.findPendingJobs(limit);
      
      if (!pendingJobs || pendingJobs.length === 0) {
        return 0;
      }
      
      console.log(`Processando ${pendingJobs.length} jobs pendentes`);
      
      // Executar cada job em segundo plano
      for (const job of pendingJobs) {
        this.executeJobInBackground(job._id);
      }
      
      return pendingJobs.length;
    } catch (error) {
      console.error('Erro ao processar jobs pendentes:', error);
      return 0;
    }
  }
}

// Exportar instância singleton do serviço
const youtubeSyncService = new YouTubeSyncService();

module.exports = youtubeSyncService;