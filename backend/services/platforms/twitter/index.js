/**
 * Serviço de integração com a API do Twitter (X)
 * Suporta OAuth 1.0a (antiga API) e OAuth 2.0 (nova API v2)
 * Documentação: https://developer.twitter.com/en/docs/twitter-api
 */

const axios = require('axios');
const crypto = require('crypto');
const OAuth = require('oauth-1.0a');
const { URLSearchParams } = require('url');

// Base URLs
const API_URL = 'https://api.twitter.com/2';
const OAUTH1_URL = 'https://api.twitter.com/oauth';
const OAUTH2_URL = 'https://api.twitter.com/oauth2';
const UPLOAD_URL = 'https://upload.twitter.com/1.1/media/upload.json';

// Estado global para OAuth 2.0
const oauthStateMap = new Map();

/**
 * Gera a assinatura OAuth 1.0a
 * @param {Object} config - Configuração (consumerKey, consumerSecret)
 * @returns {Object} - Instância OAuth
 */
const createOAuthInstance = (config) => {
  return OAuth({
    consumer: {
      key: config.consumerKey,
      secret: config.consumerSecret
    },
    signature_method: 'HMAC-SHA1',
    hash_function(base_string, key) {
      return crypto
        .createHmac('sha1', key)
        .update(base_string)
        .digest('base64');
    }
  });
};

/**
 * Gera URL para iniciar processo de autenticação OAuth 2.0
 * @param {string} clientId - Client ID da API do Twitter
 * @param {string} redirectUri - URL de redirecionamento após autorização
 * @returns {Promise<Object>} - URL de autorização e estado para segurança CSRF
 */
const getAuthUrl = async (clientId, redirectUri) => {
  try {
    // Gerar código de verificação PKCE e estado de segurança
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    
    const state = crypto.randomBytes(16).toString('hex');
    
    // Salvar o código de verificação para uso posterior
    oauthStateMap.set(state, { codeVerifier, timestamp: Date.now() });
    
    // Limpar estados antigos (mais de 10 minutos)
    for (const [key, value] of oauthStateMap.entries()) {
      if (Date.now() - value.timestamp > 600000) {
        oauthStateMap.delete(key);
      }
    }
    
    // Construir URL de autorização
    const authUrl = `${OAUTH2_URL}/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=tweet.read%20tweet.write%20users.read%20offline.access&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
    
    return {
      success: true,
      authUrl,
      state
    };
  } catch (error) {
    console.error('Erro ao gerar URL de autenticação Twitter:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Obtém tokens de acesso
 * @param {Object} params - Parâmetros (oauth_token, oauth_verifier, tokenSecret)
 * @param {Object} config - Configuração (consumerKey, consumerSecret)
 * @returns {Promise<Object>} Tokens de acesso
 */
const getAccessToken = async (params, config) => {
  try {
    const { oauth_token, oauth_verifier, tokenSecret } = params;
    const { consumerKey, consumerSecret } = config;
    
    // Criar instância OAuth
    const oauth = createOAuthInstance({ consumerKey, consumerSecret });
    
    // Configurar requisição
    const requestData = {
      url: `${OAUTH_URL}/access_token`,
      method: 'POST'
    };
    
    // Gerar cabeçalhos de autorização
    const headers = oauth.toHeader(oauth.authorize(requestData, {
      key: oauth_token,
      secret: tokenSecret
    }));
    
    // Adicionar verifier ao corpo da requisição
    const formData = new URLSearchParams();
    formData.append('oauth_verifier', oauth_verifier);
    
    // Fazer requisição para obter token de acesso
    const response = await axios.post(
      requestData.url,
      formData.toString(),
      {
        headers: {
          ...headers,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    // Extrair dados da resposta
    const responseData = new URLSearchParams(response.data);
    const accessToken = responseData.get('oauth_token');
    const accessTokenSecret = responseData.get('oauth_token_secret');
    const userId = responseData.get('user_id');
    const screenName = responseData.get('screen_name');
    
    return {
      access_token: accessToken,
      access_token_secret: accessTokenSecret,
      user_id: userId,
      screen_name: screenName
    };
  } catch (error) {
    console.error('Erro ao obter tokens do Twitter:', error.response?.data || error.message);
    throw new Error('Falha ao autenticar com Twitter');
  }
};

/**
 * Obtém informações do perfil
 * @param {Object} tokens - Tokens (access_token, access_token_secret)
 * @param {Object} config - Configuração (consumerKey, consumerSecret)
 * @returns {Promise<Object>} Informações do perfil
 */
const getProfile = async (tokens, config) => {
  try {
    const { access_token, access_token_secret } = tokens;
    const { consumerKey, consumerSecret } = config;
    
    // Criar instância OAuth
    const oauth = createOAuthInstance({ consumerKey, consumerSecret });
    
    // Configurar requisição
    const requestData = {
      url: `${API_URL}/users/me?user.fields=name,username,profile_image_url,description`,
      method: 'GET'
    };
    
    // Gerar cabeçalhos de autorização
    const headers = oauth.toHeader(oauth.authorize(requestData, {
      key: access_token,
      secret: access_token_secret
    }));
    
    // Fazer requisição para obter dados do perfil
    const response = await axios.get(
      requestData.url,
      {
        headers
      }
    );
    
    const userData = response.data.data;
    
    return {
      id: userData.id,
      name: userData.name,
      username: userData.username,
      profileImage: userData.profile_image_url,
      description: userData.description
    };
  } catch (error) {
    console.error('Erro ao obter perfil do Twitter:', error.response?.data || error.message);
    throw new Error('Falha ao buscar perfil do Twitter');
  }
};

/**
 * Publica um tweet
 * @param {Object} tokens - Tokens (access_token, access_token_secret)
 * @param {Object} config - Configuração (consumerKey, consumerSecret)
 * @param {Object} content - Conteúdo do tweet (text, mediaIds)
 * @returns {Promise<Object>} Resultado da publicação
 */
const tweet = async (tokens, config, content) => {
  try {
    const { access_token, access_token_secret } = tokens;
    const { consumerKey, consumerSecret } = config;
    const { text, mediaIds } = content;
    
    // Criar instância OAuth
    const oauth = createOAuthInstance({ consumerKey, consumerSecret });
    
    // Configurar requisição
    const requestData = {
      url: `${API_URL}/tweets`,
      method: 'POST'
    };
    
    // Gerar cabeçalhos de autorização
    const headers = oauth.toHeader(oauth.authorize(requestData, {
      key: access_token,
      secret: access_token_secret
    }));
    
    // Preparar corpo da requisição
    const tweetData = {
      text: text
    };
    
    // Adicionar mídia se fornecida
    if (mediaIds && mediaIds.length > 0) {
      tweetData.media = {
        media_ids: mediaIds
      };
    }
    
    // Fazer requisição para publicar tweet
    const response = await axios.post(
      requestData.url,
      tweetData,
      {
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return {
      id: response.data.data.id,
      text: response.data.data.text,
      status: 'published',
      tweetUrl: `https://twitter.com/i/web/status/${response.data.data.id}`
    };
  } catch (error) {
    console.error('Erro ao publicar tweet:', error.response?.data || error.message);
    throw new Error('Falha ao publicar no Twitter: ' + (error.response?.data?.detail || error.message));
  }
};

/**
 * Faz upload de mídia para o Twitter
 * @param {Object} tokens - Tokens (access_token, access_token_secret)
 * @param {Object} config - Configuração (consumerKey, consumerSecret)
 * @param {Buffer} media - Buffer da mídia
 * @param {string} mediaType - Tipo de mídia (image/jpeg, image/png, video/mp4)
 * @returns {Promise<string>} ID da mídia
 */
const uploadMedia = async (tokens, config, media, mediaType) => {
  try {
    const { access_token, access_token_secret } = tokens;
    const { consumerKey, consumerSecret } = config;
    
    // Criar instância OAuth
    const oauth = createOAuthInstance({ consumerKey, consumerSecret });
    
    // INIT - Iniciar upload
    const initRequestData = {
      url: `${UPLOAD_URL}?command=INIT&total_bytes=${media.length}&media_type=${mediaType}`,
      method: 'POST'
    };
    
    const initHeaders = oauth.toHeader(oauth.authorize(initRequestData, {
      key: access_token,
      secret: access_token_secret
    }));
    
    const initResponse = await axios.post(
      initRequestData.url,
      {},
      { headers: initHeaders }
    );
    
    const mediaId = initResponse.data.media_id_string;
    
    // APPEND - Enviar chunks do arquivo
    const chunkSize = 1000000; // ~1MB chunks
    const numberOfChunks = Math.ceil(media.length / chunkSize);
    
    for (let i = 0; i < numberOfChunks; i++) {
      const chunk = media.slice(i * chunkSize, (i + 1) * chunkSize);
      
      const appendRequestData = {
        url: `${UPLOAD_URL}?command=APPEND&media_id=${mediaId}&segment_index=${i}`,
        method: 'POST'
      };
      
      const appendHeaders = oauth.toHeader(oauth.authorize(appendRequestData, {
        key: access_token,
        secret: access_token_secret
      }));
      
      const formData = new FormData();
      formData.append('media', new Blob([chunk]));
      
      await axios.post(
        appendRequestData.url,
        formData,
        {
          headers: {
            ...appendHeaders,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
    }
    
    // FINALIZE - Finalizar upload
    const finalizeRequestData = {
      url: `${UPLOAD_URL}?command=FINALIZE&media_id=${mediaId}`,
      method: 'POST'
    };
    
    const finalizeHeaders = oauth.toHeader(oauth.authorize(finalizeRequestData, {
      key: access_token,
      secret: access_token_secret
    }));
    
    await axios.post(
      finalizeRequestData.url,
      {},
      { headers: finalizeHeaders }
    );
    
    return mediaId;
  } catch (error) {
    console.error('Erro ao fazer upload de mídia para o Twitter:', error.response?.data || error.message);
    throw new Error('Falha ao fazer upload de mídia para o Twitter');
  }
};

/**
 * Obtém métricas de um tweet
 * @param {Object} tokens - Tokens (access_token, access_token_secret)
 * @param {Object} config - Configuração (consumerKey, consumerSecret)
 * @param {string} tweetId - ID do tweet
 * @returns {Promise<Object>} Métricas do tweet
 */
const getTweetMetrics = async (tokens, config, tweetId) => {
  try {
    const { access_token, access_token_secret } = tokens;
    const { consumerKey, consumerSecret } = config;
    
    // Criar instância OAuth
    const oauth = createOAuthInstance({ consumerKey, consumerSecret });
    
    // Configurar requisição
    const requestData = {
      url: `${API_URL}/tweets/${tweetId}?tweet.fields=public_metrics`,
      method: 'GET'
    };
    
    // Gerar cabeçalhos de autorização
    const headers = oauth.toHeader(oauth.authorize(requestData, {
      key: access_token,
      secret: access_token_secret
    }));
    
    // Fazer requisição para obter métricas
    const response = await axios.get(
      requestData.url,
      {
        headers
      }
    );
    
    const metrics = response.data.data.public_metrics;
    
    return {
      retweets: metrics.retweet_count,
      replies: metrics.reply_count,
      likes: metrics.like_count,
      quotes: metrics.quote_count,
      impressions: metrics.impression_count || 0
    };
  } catch (error) {
    console.error('Erro ao obter métricas do tweet:', error.response?.data || error.message);
    throw new Error('Falha ao buscar métricas do Twitter');
  }
};

/**
 * Troca o código de autorização por tokens de acesso (OAuth 2.0)
 * @param {string} code - Código de autorização recebido do Twitter
 * @param {string} clientId - Client ID (API Key) do Twitter
 * @param {string} clientSecret - Client Secret do Twitter
 * @param {string} redirectUri - URL de redirecionamento
 * @param {string} state - Estado para verificação CSRF
 * @returns {Promise<Object>} Tokens de acesso
 */
const exchangeCodeForToken = async (code, clientId, clientSecret, redirectUri, state) => {
  try {
    // Verificar se temos o estado e código verificador
    if (!oauthStateMap.has(state)) {
      return {
        success: false,
        error: 'Estado inválido ou expirado'
      };
    }
    
    const { codeVerifier } = oauthStateMap.get(state);
    
    // Limpar estado após uso
    oauthStateMap.delete(state);
    
    // Preparar dados para troca de código por token
    const params = new URLSearchParams();
    params.append('code', code);
    params.append('grant_type', 'authorization_code');
    params.append('client_id', clientId);
    params.append('redirect_uri', redirectUri);
    params.append('code_verifier', codeVerifier);
    
    // Fazer requisição para obter tokens
    const response = await axios.post(`${OAUTH2_URL}/token`, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      }
    });
    
    const { access_token, refresh_token, expires_in, scope } = response.data;
    
    return {
      success: true,
      access_token,
      refresh_token,
      expires_in,
      scope
    };
  } catch (error) {
    console.error('Erro ao trocar código por token no Twitter:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error_description || error.message
    };
  }
};

/**
 * Atualiza o token de acesso usando o refresh token (OAuth 2.0)
 * @param {string} refreshToken - Token de atualização
 * @param {string} clientId - Client ID do Twitter
 * @param {string} clientSecret - Client Secret do Twitter
 * @returns {Promise<Object>} Novo token de acesso
 */
const refreshToken = async (refreshToken, clientId, clientSecret) => {
  try {
    // Preparar dados para atualização de token
    const params = new URLSearchParams();
    params.append('refresh_token', refreshToken);
    params.append('grant_type', 'refresh_token');
    params.append('client_id', clientId);
    
    // Fazer requisição para obter novo token
    const response = await axios.post(`${OAUTH2_URL}/token`, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      }
    });
    
    const { access_token, refresh_token, expires_in } = response.data;
    
    return {
      success: true,
      access_token,
      refresh_token: refresh_token || refreshToken, // Usar novo refresh token se fornecido
      expires_in
    };
  } catch (error) {
    console.error('Erro ao atualizar token do Twitter:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error_description || error.message
    };
  }
};

/**
 * Revoga um token de acesso (OAuth 2.0)
 * @param {string} token - Token a ser revogado
 * @param {string} clientId - Client ID do Twitter
 * @param {string} clientSecret - Client Secret do Twitter
 * @returns {Promise<Object>} Resultado da operação
 */
const revokeToken = async (token, clientId, clientSecret) => {
  try {
    // Preparar dados para revogação de token
    const params = new URLSearchParams();
    params.append('token', token);
    params.append('token_type_hint', 'access_token');
    params.append('client_id', clientId);
    
    // Fazer requisição para revogar token
    await axios.post(`${OAUTH2_URL}/revoke`, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      }
    });
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Erro ao revogar token do Twitter:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error_description || error.message
    };
  }
};

/**
 * Obtém perfil do usuário com OAuth 2.0
 * @param {string} accessToken - Token de acesso OAuth 2.0
 * @returns {Promise<Object>} Dados do perfil
 */
const getUserProfile = async (accessToken) => {
  try {
    // Fazer requisição para obter perfil
    const response = await axios.get(`${API_URL}/users/me?user.fields=id,name,username,profile_image_url,description,public_metrics`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const user = response.data.data;
    
    return {
      success: true,
      data: {
        id: user.id,
        username: user.username,
        name: user.name,
        profile_image_url: user.profile_image_url,
        description: user.description,
        follower_count: user.public_metrics?.followers_count || 0,
        following_count: user.public_metrics?.following_count || 0,
        tweet_count: user.public_metrics?.tweet_count || 0
      }
    };
  } catch (error) {
    console.error('Erro ao obter perfil do Twitter:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error_description || error.message
    };
  }
};

module.exports = {
  // OAuth 1.0a (legado)
  getAccessToken,
  getProfile,
  
  // OAuth 2.0 (atual)
  getAuthUrl,
  exchangeCodeForToken,
  refreshToken,
  revokeToken,
  getUserProfile,
  
  // Funcionalidades comuns
  tweet,
  uploadMedia,
  getTweetMetrics
};