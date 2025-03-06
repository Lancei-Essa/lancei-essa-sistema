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
    // Método de emergência - construir a URL manualmente se o OAuth falhar
    if (process.env.YOUTUBE_EMERGENCY_MODE === 'true') {
      console.log('[YouTube Service] Usando modo de emergência para geração de URL');
      
      const clientId = process.env.YOUTUBE_CLIENT_ID;
      const redirectUri = process.env.YOUTUBE_REDIRECT_URI;
      
      if (!clientId || !redirectUri) {
        throw new Error('Credenciais incompletas para modo de emergência. Verifique YOUTUBE_CLIENT_ID e YOUTUBE_REDIRECT_URI.');
      }
      
      const scopes = [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/youtube.readonly'
      ];
      
      const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + 
        `client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        '&response_type=code' +
        `&scope=${encodeURIComponent(scopes.join(' '))}` +
        '&access_type=offline' +
        '&include_granted_scopes=true';
      
      console.log('[YouTube Service] URL gerada em modo de emergência:', authUrl);
      return authUrl;
    }
    
    // Método normal com OAuth2 client
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
    
    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.readonly'
    ];

    console.log('[YouTube Service] Gerando URL com escopos:', scopes);
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
    
    // Tentar método de fallback
    try {
      console.log('[YouTube Service] Tentando método de fallback para geração de URL');
      
      const clientId = process.env.YOUTUBE_CLIENT_ID;
      const redirectUri = process.env.YOUTUBE_REDIRECT_URI;
      
      if (!clientId || !redirectUri) {
        throw new Error('Credenciais incompletas para fallback. Verifique YOUTUBE_CLIENT_ID e YOUTUBE_REDIRECT_URI.');
      }
      
      const scopes = [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/youtube.readonly'
      ];
      
      const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + 
        `client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        '&response_type=code' +
        `&scope=${encodeURIComponent(scopes.join(' '))}` +
        '&access_type=offline' +
        '&include_granted_scopes=true';
      
      console.log('[YouTube Service] URL gerada por fallback:', authUrl);
      return authUrl;
    } catch (fallbackError) {
      console.error('[YouTube Service] Fallback também falhou:', fallbackError);
      throw new Error(`Erro ao gerar URL de autenticação (todos os métodos falharam): ${error.message}`);
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