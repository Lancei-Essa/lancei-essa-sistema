const { google } = require('googleapis');
const fs = require('fs');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);

// Verificar se as variáveis de ambiente estão configuradas
const checkEnvVariables = () => {
  if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET || !process.env.YOUTUBE_REDIRECT_URI) {
    console.error('Aviso: Variáveis de ambiente globais do YouTube não configuradas.');
    console.error('Será necessário usar credenciais específicas da empresa.');
    return false;
  }
  return true;
};

// Verificamos no início
const envVariablesConfigured = checkEnvVariables();

// Função para criar um cliente OAuth2 com credenciais específicas
const createOAuth2Client = (credentials = null) => {
  const clientId = credentials?.client_id || process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = credentials?.client_secret || process.env.YOUTUBE_CLIENT_SECRET;
  const redirectUri = credentials?.redirect_uri || process.env.YOUTUBE_REDIRECT_URI;
  
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Credenciais do YouTube não disponíveis. Configure-as no arquivo .env ou forneça credenciais específicas.');
  }
  
  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );
};

// Cliente OAuth padrão (usando variáveis de ambiente)
const oauth2Client = createOAuth2Client();

// YouTube API client
const youtube = google.youtube({
  version: 'v3',
  auth: oauth2Client
});

// Gerar URL de autorização
const getAuthUrl = (credentials = null) => {
  try {
    // Criar cliente OAuth específico se credenciais forem fornecidas
    const client = credentials ? createOAuth2Client(credentials) : oauth2Client;
    
    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.readonly'
    ];

    return client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      include_granted_scopes: true
    });
  } catch (error) {
    console.error('Erro ao gerar URL de autenticação:', error);
    throw new Error(`Erro ao gerar URL de autenticação: ${error.message}`);
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