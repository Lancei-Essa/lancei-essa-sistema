const { google } = require('googleapis');
const fs = require('fs');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);

// Verificar se as variáveis de ambiente estão configuradas
const checkEnvVariables = () => {
  console.log('[YouTube Service] Verificando variáveis de ambiente:');
  console.log('[YouTube Service] YOUTUBE_CLIENT_ID:', process.env.YOUTUBE_CLIENT_ID ? 'Configurado' : 'Não configurado');
  console.log('[YouTube Service] YOUTUBE_CLIENT_SECRET:', process.env.YOUTUBE_CLIENT_SECRET ? 'Configurado' : 'Não configurado');
  console.log('[YouTube Service] YOUTUBE_REDIRECT_URI:', process.env.YOUTUBE_REDIRECT_URI);
  console.log('[YouTube Service] API_BASE_URL:', process.env.API_BASE_URL);
  
  if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET || !process.env.YOUTUBE_REDIRECT_URI) {
    console.error('[YouTube Service] ERRO: Variáveis de ambiente globais do YouTube não configuradas.');
    console.error('[YouTube Service] Será necessário usar credenciais específicas da empresa.');
    return false;
  }
  console.log('[YouTube Service] Todas as variáveis de ambiente estão configuradas corretamente.');
  return true;
};

// Verificamos no início
const envVariablesConfigured = checkEnvVariables();

// Função para criar um cliente OAuth2 com credenciais específicas
const createOAuth2Client = (credentials = null) => {
  const clientId = credentials?.client_id || process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = credentials?.client_secret || process.env.YOUTUBE_CLIENT_SECRET;
  const redirectUri = credentials?.redirect_uri || process.env.YOUTUBE_REDIRECT_URI;
  
  console.log('[YouTube Service] Criando cliente OAuth2:');
  console.log('[YouTube Service] - Client ID: ', clientId ? '[Configurado]' : '[Não configurado]');
  console.log('[YouTube Service] - Client Secret: ', clientSecret ? '[Configurado]' : '[Não configurado]');
  console.log('[YouTube Service] - Redirect URI: ', redirectUri);
  
  if (!clientId || !clientSecret || !redirectUri) {
    const missingFields = [];
    if (!clientId) missingFields.push('Client ID');
    if (!clientSecret) missingFields.push('Client Secret');
    if (!redirectUri) missingFields.push('Redirect URI');
    
    const errorMsg = `Credenciais do YouTube não disponíveis: ${missingFields.join(', ')} não configurado(s). Configure-os no arquivo .env ou forneça credenciais específicas.`;
    console.error('[YouTube Service] ' + errorMsg);
    throw new Error(errorMsg);
  }
  
  console.log('[YouTube Service] Todas as credenciais estão disponíveis, criando cliente OAuth2');
  
  try {
    const client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
    console.log('[YouTube Service] Cliente OAuth2 criado com sucesso');
    return client;
  } catch (error) {
    console.error('[YouTube Service] Erro ao criar cliente OAuth2:', error);
    throw new Error(`Falha ao criar cliente OAuth2: ${error.message}`);
  }
};

// Cliente OAuth padrão (usando variáveis de ambiente)
let oauth2Client;
try {
  console.log('[YouTube Service] Tentando criar cliente OAuth2 padrão...');
  oauth2Client = createOAuth2Client();
  console.log('[YouTube Service] Cliente OAuth2 padrão criado com sucesso');
} catch (error) {
  console.error('[YouTube Service] ERRO ao criar cliente OAuth2 padrão:', error);
  console.error('[YouTube Service] Operações que requerem autenticação falharão até que as credenciais sejam fornecidas');
  
  // Criar um cliente dummy para evitar erros de null pointer
  oauth2Client = {
    generateAuthUrl: () => { throw new Error('Cliente OAuth2 não inicializado devido a credenciais inválidas'); },
    getToken: () => { throw new Error('Cliente OAuth2 não inicializado devido a credenciais inválidas'); },
    setCredentials: () => { console.error('Tentativa de definir credenciais em cliente OAuth2 não inicializado'); }
  };
}

// YouTube API client
const youtube = google.youtube({
  version: 'v3',
  auth: oauth2Client
});

// Gerar URL de autorização
const getAuthUrl = (credentials = null) => {
  // Forçar carregamento do .env novamente para garantir que temos os valores mais recentes
  try {
    require('dotenv').config();
    console.log('[YouTube Service] Variáveis de ambiente recarregadas');
  } catch (envError) {
    console.warn('[YouTube Service] Aviso: Não foi possível recarregar variáveis de ambiente:', envError.message);
  }
  
  console.log('[YouTube Service] Iniciando geração de URL de autenticação');
  console.log('[YouTube Service] Credenciais fornecidas:', credentials ? 'Sim' : 'Não');
  
  try {
    // Criar cliente OAuth específico se credenciais forem fornecidas
    let client;
    
    if (credentials) {
      console.log('[YouTube Service] Usando credenciais específicas fornecidas');
      client = createOAuth2Client(credentials);
    } else {
      console.log('[YouTube Service] Usando credenciais globais do ambiente');
      
      // Se não temos as variáveis de ambiente configuradas e não foram fornecidas credenciais específicas
      if (!envVariablesConfigured && !credentials) {
        throw new Error('Credenciais do YouTube não configuradas. Configure as variáveis de ambiente ou forneça credenciais específicas.');
      }
      
      // Recriar cliente OAuth2 para garantir que estamos usando as variáveis de ambiente mais recentes
      try {
        oauth2Client = createOAuth2Client();
        console.log('[YouTube Service] Cliente OAuth2 recriado com sucesso');
      } catch (oauthError) {
        console.error('[YouTube Service] Erro ao recriar cliente OAuth2:', oauthError);
      }
      
      client = oauth2Client;
    }
    
    console.log('[YouTube Service] Gerando URL com escopos');
    
    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.readonly'
    ];
    
    console.log('[YouTube Service] Detalhes do cliente OAuth2:', {
      clientId: Boolean(client._clientId),
      clientSecret: Boolean(client._clientSecret),
      redirectUri: client._redirectUri
    });
    
    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      include_granted_scopes: true
    });
    
    console.log('[YouTube Service] URL de autenticação gerada com sucesso:', authUrl);
    return authUrl;
  } catch (error) {
    console.error('[YouTube Service] ERRO ao gerar URL de autenticação:', error);
    console.error('[YouTube Service] Detalhes do erro:', {
      message: error.message,
      stack: error.stack
    });
    
    // Continuar com métodos de fallback apenas se necessário
    throw error; // Remova este comentário para desativar os fallbacks e forçar o uso correto
    
    // Cliente OAuth de Emergência - Usar ID Público do Google
    try {
      // ... código de fallback existente ...
    } catch (fallbackError) {
      // ... código existente ...
    }
  }
};

// Obter tokens a partir do código de autorização
const getTokensFromCode = async (code, credentials = null) => {
  try {
    // Criar cliente OAuth específico se credenciais forem fornecidas
    const client = credentials ? createOAuth2Client(credentials) : oauth2Client;
    
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);
    return tokens;
  } catch (error) {
    console.error('Erro ao obter tokens do código de autorização:', error);
    throw new Error(`Erro ao obter tokens: ${error.message}`);
  }
};

// Renovar um token de acesso usando o refresh token
const refreshAccessToken = async (refreshToken, credentials = null) => {
  try {
    // Criar cliente OAuth específico se credenciais forem fornecidas
    const client = credentials ? createOAuth2Client(credentials) : oauth2Client;
    
    client.setCredentials({
      refresh_token: refreshToken
    });
    
    const { credentials: newCredentials } = await client.refreshAccessToken();
    return {
      access_token: newCredentials.access_token,
      refresh_token: newCredentials.refresh_token || refreshToken, // Em caso de não retornar um novo refresh token
      expiry_date: newCredentials.expiry_date
    };
  } catch (error) {
    console.error('Erro ao renovar token do YouTube:', error);
    throw error;
  }
};

// Configurar credenciais
const setCredentials = (tokens, client = null) => {
  const oauthClient = client || oauth2Client;
  oauthClient.setCredentials(tokens);
  return oauthClient;
};

// Upload de vídeo para o YouTube
const uploadVideo = async (file, metadata) => {
  try {
    // Verifica se estamos usando express-fileupload (tempFilePath) ou multer (path)
    const filePath = file.tempFilePath || file.path;
    
    if (!filePath) {
      throw new Error('Caminho do arquivo não encontrado');
    }
    
    console.log(`Tentando ler arquivo em: ${filePath}`);
    const fileContent = await readFileAsync(filePath);
    
    const response = await youtube.videos.insert({
      part: 'snippet,status',
      requestBody: {
        snippet: {
          title: metadata.title,
          description: metadata.description,
          tags: metadata.tags,
          categoryId: '22' // Categoria "People & Blogs"
        },
        status: {
          privacyStatus: metadata.privacyStatus || 'unlisted',
          publishAt: metadata.publishAt || undefined,
          selfDeclaredMadeForKids: false
        }
      },
      media: {
        body: fileContent
      }
    });

    return response.data;
  } catch (error) {
    console.error('Erro ao fazer upload do vídeo:', error);
    throw error;
  }
};

// Obter informações de um vídeo
const getVideoInfo = async (videoId) => {
  try {
    const response = await youtube.videos.list({
      part: 'snippet,statistics,status',
      id: videoId
    });

    return response.data.items[0];
  } catch (error) {
    console.error('Erro ao obter informações do vídeo:', error);
    throw error;
  }
};

// Obter informações do canal do usuário autenticado
const getChannelInfo = async () => {
  try {
    // Primeiro, obter canal do usuário autenticado (mine=true)
    const response = await youtube.channels.list({
      part: 'snippet,statistics,contentDetails',
      mine: true
    });

    return response.data;
  } catch (error) {
    console.error('Erro ao obter informações do canal:', error);
    throw error;
  }
};

// Obter estatísticas do canal por ID
const getChannelStats = async (channelId) => {
  try {
    const response = await youtube.channels.list({
      part: 'statistics',
      id: channelId
    });

    return response.data.items[0].statistics;
  } catch (error) {
    console.error('Erro ao obter estatísticas do canal:', error);
    throw error;
  }
};

// Agendar um vídeo para publicação
const scheduleVideo = async (videoId, publishAt) => {
  try {
    const response = await youtube.videos.update({
      part: 'status',
      requestBody: {
        id: videoId,
        status: {
          privacyStatus: 'private',
          publishAt: publishAt
        }
      }
    });

    return response.data;
  } catch (error) {
    console.error('Erro ao agendar vídeo:', error);
    throw error;
  }
};

// Obter estatísticas de um vídeo específico
const getVideoStats = async (videoId) => {
  try {
    const response = await youtube.videos.list({
      part: 'statistics',
      id: videoId
    });

    return response.data;
  } catch (error) {
    console.error('Erro ao obter estatísticas do vídeo:', error);
    throw error;
  }
};

// Obter métricas completas para análise e visualizações
const getChannelMetrics = async (userId, client = null) => {
  try {
    console.log(`[YouTube Service] Obtendo métricas para o usuário: ${userId}`);
    
    // Verificar se temos um token válido para este usuário
    const YouTubeToken = require('../models/YouTubeToken');
    const tokenDoc = await YouTubeToken.findOne({ user: userId })
      .select('+access_token +refresh_token');
    
    if (!tokenDoc) {
      throw new Error('Token do YouTube não encontrado para este usuário');
    }
    
    // Verificar se o token expirou
    if (tokenDoc.isExpired()) {
      throw new Error('Token expirado. Por favor, reconecte sua conta.');
    }
    
    // Configurar cliente OAuth2
    const oauthClient = client || oauth2Client;
    
    try {
      // Obter credenciais descriptografadas
      const decryptedTokens = tokenDoc.getDecryptedTokens();
      
      // Configurar credenciais
      oauthClient.setCredentials({
        access_token: decryptedTokens.access_token,
        refresh_token: decryptedTokens.refresh_token
      });
      
      // Criar cliente YouTube com autenticação
      const authenticatedYoutube = google.youtube({
        version: 'v3',
        auth: oauthClient
      });
      
      // Obter informações do canal
      const channelResponse = await authenticatedYoutube.channels.list({
        part: 'snippet,statistics,contentDetails',
        id: tokenDoc.channel_id || 'mine'
      });
      
      if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
        throw new Error('Canal não encontrado');
      }
      
      const channel = channelResponse.data.items[0];
      const uploadsPlaylistId = channel.contentDetails.relatedPlaylists.uploads;
      
      // Obter lista de vídeos do canal
      const playlistItemsResponse = await authenticatedYoutube.playlistItems.list({
        part: 'snippet,contentDetails',
        playlistId: uploadsPlaylistId,
        maxResults: 50
      });
      
      const videoIds = playlistItemsResponse.data.items.map(item => 
        item.contentDetails.videoId
      );
      
      // Obter estatísticas detalhadas dos vídeos
      let videoStats = [];
      if (videoIds.length > 0) {
        const videosResponse = await authenticatedYoutube.videos.list({
          part: 'snippet,statistics,status',
          id: videoIds.join(',')
        });
        
        videoStats = videosResponse.data.items.map(video => ({
          id: video.id,
          title: video.snippet.title,
          publishedAt: video.snippet.publishedAt,
          thumbnail: video.snippet.thumbnails.medium.url,
          statistics: video.statistics,
          status: video.status.privacyStatus
        }));
      }
      
      // Obter dados de comentários para os vídeos mais recentes (limitado a 10)
      let commentData = [];
      
      for (const videoId of videoIds.slice(0, 10)) {
        try {
          const commentsResponse = await authenticatedYoutube.commentThreads.list({
            part: 'snippet',
            videoId: videoId,
            maxResults: 20
          });
          
          if (commentsResponse.data.items && commentsResponse.data.items.length > 0) {
            const videoComments = commentsResponse.data.items.map(comment => ({
              id: comment.id,
              videoId: videoId,
              authorDisplayName: comment.snippet.topLevelComment.snippet.authorDisplayName,
              authorProfileImageUrl: comment.snippet.topLevelComment.snippet.authorProfileImageUrl,
              textDisplay: comment.snippet.topLevelComment.snippet.textDisplay,
              likeCount: comment.snippet.topLevelComment.snippet.likeCount,
              publishedAt: comment.snippet.topLevelComment.snippet.publishedAt
            }));
            
            commentData.push(...videoComments);
          }
        } catch (commentError) {
          console.warn(`[YouTube Service] Erro ao obter comentários para vídeo ${videoId}:`, commentError.message);
          // Continuar mesmo com erro em um vídeo específico
        }
      }
      
      // Agregar dados para gráficos
      const viewsByDate = {};
      const likesByDate = {};
      const commentsByDate = {};
      
      videoStats.forEach(video => {
        const publishDate = new Date(video.publishedAt).toISOString().split('T')[0];
        
        viewsByDate[publishDate] = (viewsByDate[publishDate] || 0) + parseInt(video.statistics.viewCount || 0);
        likesByDate[publishDate] = (likesByDate[publishDate] || 0) + parseInt(video.statistics.likeCount || 0);
        commentsByDate[publishDate] = (commentsByDate[publishDate] || 0) + parseInt(video.statistics.commentCount || 0);
      });
      
      // Converter para formato de array para gráficos
      const chartData = {
        labels: Object.keys(viewsByDate).sort(),
        views: Object.keys(viewsByDate).sort().map(date => viewsByDate[date]),
        likes: Object.keys(likesByDate).sort().map(date => likesByDate[date]),
        comments: Object.keys(commentsByDate).sort().map(date => commentsByDate[date])
      };
      
      // Calcular totais
      const totalStats = {
        views: parseInt(channel.statistics.viewCount || 0),
        likes: videoStats.reduce((sum, video) => sum + parseInt(video.statistics.likeCount || 0), 0),
        comments: videoStats.reduce((sum, video) => sum + parseInt(video.statistics.commentCount || 0), 0),
        subscribers: parseInt(channel.statistics.subscriberCount || 0),
        videos: parseInt(channel.statistics.videoCount || 0)
      };
      
      // Compilar resultados completos
      const metrics = {
        channelInfo: {
          id: channel.id,
          title: channel.snippet.title,
          description: channel.snippet.description,
          thumbnails: channel.snippet.thumbnails,
          statistics: channel.statistics,
          customUrl: channel.snippet.customUrl
        },
        videos: videoStats,
        totalStats: totalStats,
        chartData: chartData,
        recentComments: commentData
      };
      
      return {
        success: true,
        data: metrics
      };
      
    } catch (error) {
      console.error('[YouTube Service] Erro ao obter métricas:', error);
      return {
        success: false,
        error: error.message
      };
    }
  } catch (error) {
    console.error('[YouTube Service] Erro ao inicializar serviço de métricas:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Obter vídeos do canal
const getChannelVideos = async (maxResults = 10) => {
  try {
    // Obter ID do canal
    const channelResponse = await getChannelInfo();
    if (!channelResponse.items || channelResponse.items.length === 0) {
      throw new Error('Não foi possível obter o ID do canal');
    }
    
    const channelId = channelResponse.items[0].id;
    
    // Buscar vídeos do canal
    const response = await youtube.search.list({
      part: 'snippet',
      channelId: channelId,
      maxResults: maxResults,
      order: 'date',
      type: 'video'
    });
    
    return response.data;
  } catch (error) {
    console.error('Erro ao obter vídeos do canal:', error);
    throw error;
  }
};

// Obter estatísticas de vídeos
const getVideosStats = async (videoIds) => {
  try {
    if (!videoIds) {
      return { items: [] };
    }
    
    // Buscar estatísticas dos vídeos
    const response = await youtube.videos.list({
      part: 'statistics',
      id: videoIds
    });
    
    return response.data;
  } catch (error) {
    console.error('Erro ao obter estatísticas dos vídeos:', error);
    throw error;
  }
};

// Obter comentários recentes
const getRecentComments = async (maxResults = 10) => {
  try {
    // Obter vídeos do canal
    const videos = await getChannelVideos(5);
    
    if (!videos.items || videos.items.length === 0) {
      return { items: [] };
    }
    
    // Array para armazenar todos os comentários
    let allComments = [];
    
    // Buscar comentários para cada vídeo
    for (const video of videos.items) {
      try {
        const videoId = video.id.videoId;
        const response = await youtube.commentThreads.list({
          part: 'snippet',
          videoId: videoId,
          maxResults: 5
        });
        
        if (response.data.items && response.data.items.length > 0) {
          const comments = response.data.items.map(item => ({
            id: item.id,
            videoId: videoId,
            authorDisplayName: item.snippet.topLevelComment.snippet.authorDisplayName,
            authorProfileImageUrl: item.snippet.topLevelComment.snippet.authorProfileImageUrl,
            textDisplay: item.snippet.topLevelComment.snippet.textDisplay,
            likeCount: item.snippet.topLevelComment.snippet.likeCount,
            publishedAt: item.snippet.topLevelComment.snippet.publishedAt
          }));
          
          allComments = [...allComments, ...comments];
        }
      } catch (commentError) {
        console.error(`Erro ao obter comentários para o vídeo ${video.id.videoId}:`, commentError);
        // Continuar para o próximo vídeo
      }
    }
    
    // Ordenar por data de publicação (mais recentes primeiro)
    allComments.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    
    // Limitar número de comentários
    allComments = allComments.slice(0, maxResults);
    
    return { items: allComments };
  } catch (error) {
    console.error('Erro ao obter comentários recentes:', error);
    return { items: [] };
  }
};

// Adicionar método para obter métricas históricas
const getHistoricalMetrics = async (metrics, dimensions, startDate, endDate) => {
  try {
    const youtubeAnalytics = google.youtubeAnalytics('v2');
    
    const response = await youtubeAnalytics.reports.query({
      ids: 'channel==MINE',
      startDate: startDate,
      endDate: endDate,
      metrics: metrics.join(','),
      dimensions: dimensions.join(','),
    });
    
    return response.data;
  } catch (error) {
    console.error('Erro ao obter métricas históricas:', error);
    throw error;
  }
};

module.exports = {
  getAuthUrl,
  getTokensFromCode,
  refreshAccessToken,
  setCredentials,
  uploadVideo,
  getVideoInfo,
  getChannelInfo,
  getChannelStats,
  scheduleVideo,
  getVideoStats,
  getChannelMetrics,
  getChannelVideos,
  getVideosStats,
  getRecentComments,
  getHistoricalMetrics
};