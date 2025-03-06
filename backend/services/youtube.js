const { google } = require('googleapis');
const fs = require('fs');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);

// Verificar se as variáveis de ambiente estão configuradas
if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET || !process.env.YOUTUBE_REDIRECT_URI) {
  console.error('Erro: Variáveis de ambiente do YouTube não configuradas corretamente.');
  console.error('Por favor, configure YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET e YOUTUBE_REDIRECT_URI no .env');
}

// Configuração OAuth
const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  process.env.YOUTUBE_REDIRECT_URI
);

// YouTube API client
const youtube = google.youtube({
  version: 'v3',
  auth: oauth2Client
});

// Gerar URL de autorização
const getAuthUrl = () => {
  // Verificar se as credenciais estão configuradas
  if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET || !process.env.YOUTUBE_REDIRECT_URI) {
    throw new Error('Credenciais do YouTube não configuradas. Configure YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET e YOUTUBE_REDIRECT_URI.');
  }
  
  const scopes = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.readonly'
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    include_granted_scopes: true
  });
};

// Obter tokens a partir do código de autorização
const getTokensFromCode = async (code) => {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  return tokens;
};

// Renovar um token de acesso usando o refresh token
const refreshAccessToken = async (refreshToken) => {
  try {
    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });
    
    const { credentials } = await oauth2Client.refreshAccessToken();
    return {
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token || refreshToken, // Em caso de não retornar um novo refresh token
      expiry_date: credentials.expiry_date
    };
  } catch (error) {
    console.error('Erro ao renovar token do YouTube:', error);
    throw error;
  }
};

// Configurar credenciais
const setCredentials = (tokens) => {
  oauth2Client.setCredentials(tokens);
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
  getVideoStats
};