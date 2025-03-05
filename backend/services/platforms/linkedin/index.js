/**
 * Serviço de integração com a API do LinkedIn
 * Documentação: https://learn.microsoft.com/en-us/linkedin/marketing/
 */

const axios = require('axios');
const crypto = require('crypto');

// Base URLs
const API_URL = 'https://api.linkedin.com/v2';
const AUTH_URL = 'https://www.linkedin.com/oauth/v2';

/**
 * Gera URL para autorização OAuth
 * @param {string} clientId - ID do cliente LinkedIn
 * @param {string} redirectUri - URI de redirecionamento após autenticação
 * @returns {Object} URL para autorização e estado
 */
const getAuthUrl = (clientId, redirectUri) => {
  const scope = 'r_liteprofile r_emailaddress w_member_social';
  const state = crypto.randomBytes(16).toString('hex');
  
  const authUrl = `${AUTH_URL}/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;
  
  return {
    authUrl,
    state
  };
};

/**
 * Obtém tokens a partir do código de autorização
 * @param {string} code - Código de autorização
 * @param {string} clientId - ID do cliente LinkedIn 
 * @param {string} clientSecret - Segredo do cliente LinkedIn
 * @param {string} redirectUri - URI de redirecionamento
 * @returns {Promise<Object>} Tokens de acesso e refresh
 */
const exchangeCodeForToken = async (code, clientId, clientSecret, redirectUri) => {
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('redirect_uri', redirectUri);
    
    const response = await axios.post(`${AUTH_URL}/accessToken`, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    return {
      success: true,
      access_token: response.data.access_token,
      expires_in: response.data.expires_in,
      refresh_token: response.data.refresh_token,
      scope: response.data.scope
    };
  } catch (error) {
    console.error('Erro ao obter tokens do LinkedIn:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error_description || error.message
    };
  }
};

/**
 * Atualiza token de acesso usando refresh token
 * @param {string} refreshToken - Token de atualização
 * @param {string} clientId - ID do cliente LinkedIn
 * @param {string} clientSecret - Segredo do cliente LinkedIn
 * @returns {Promise<Object>} Novos tokens
 */
const refreshToken = async (refreshToken, clientId, clientSecret) => {
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    
    const response = await axios.post(`${AUTH_URL}/accessToken`, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    return {
      success: true,
      access_token: response.data.access_token,
      expires_in: response.data.expires_in,
      refresh_token: response.data.refresh_token || refreshToken,
      scope: response.data.scope
    };
  } catch (error) {
    console.error('Erro ao atualizar tokens do LinkedIn:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error_description || error.message
    };
  }
};

/**
 * Obtém informações do perfil
 * @param {string} accessToken - Token de acesso
 * @returns {Promise<Object>} Informações do perfil
 */
const getProfile = async (accessToken) => {
  try {
    const response = await axios.get(`${API_URL}/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'cache-control': 'no-cache',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });
    
    // Buscar informações adicionais de email
    const emailResponse = await axios.get(`${API_URL}/emailAddress?q=members&projection=(elements*(handle~))`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'cache-control': 'no-cache',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });
    
    // Buscar foto de perfil
    const profilePictureResponse = await axios.get(
      `${API_URL}/me?projection=(profilePicture(displayImage~:playableStreams))`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'cache-control': 'no-cache',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      }
    );
    
    const profileData = response.data;
    const emailData = emailResponse.data.elements?.[0]?.['handle~']?.emailAddress || null;
    
    // Extrair URL da imagem do perfil (usar a maior disponível)
    let profilePicture = null;
    if (profilePictureResponse.data.profilePicture && 
        profilePictureResponse.data.profilePicture['displayImage~'] &&
        profilePictureResponse.data.profilePicture['displayImage~'].elements) {
      const elements = profilePictureResponse.data.profilePicture['displayImage~'].elements;
      const largestImage = elements.reduce((prev, current) => 
        (prev.data['com.linkedin.digitalmedia.mediaartifact.StillImage'].storageSize.width > 
         current.data['com.linkedin.digitalmedia.mediaartifact.StillImage'].storageSize.width) 
        ? prev : current, elements[0]);
      
      profilePicture = largestImage.identifiers[0].identifier;
    }
    
    return {
      success: true,
      data: {
        id: profileData.id,
        firstName: profileData.localizedFirstName,
        lastName: profileData.localizedLastName,
        email: emailData,
        profilePicture: profilePicture,
        headline: profileData.headline || '',
        vanityName: profileData.vanityName || profileData.id
      }
    };
  } catch (error) {
    console.error('Erro ao obter perfil do LinkedIn:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

/**
 * Publica conteúdo no LinkedIn
 * @param {string} accessToken - Token de acesso
 * @param {Object} content - Conteúdo a ser publicado
 * @returns {Promise<Object>} Resultado da publicação
 */
const shareContent = async (accessToken, content) => {
  try {
    const { text, mediaUrl, title, description } = content;
    
    // Obter ID de pessoa
    const profileResponse = await axios.get(`${API_URL}/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });
    
    const personUrn = `urn:li:person:${profileResponse.data.id}`;
    
    // Construir corpo da requisição
    let postBody = {
      author: personUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: text || ''
          },
          shareMediaCategory: 'NONE'
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    };
    
    // Adicionar mídia se fornecida
    if (mediaUrl) {
      postBody.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'ARTICLE';
      postBody.specificContent['com.linkedin.ugc.ShareContent'].media = [
        {
          status: 'READY',
          description: {
            text: description || ''
          },
          originalUrl: mediaUrl,
          title: {
            text: title || 'Compartilhado via Lancei Essa'
          }
        }
      ];
    }
    
    const response = await axios.post(`${API_URL}/ugcPosts`, postBody, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });
    
    return {
      id: response.data.id,
      status: 'published',
      shareUrl: `https://www.linkedin.com/feed/update/${response.data.id.replace('urn:li:share:', '')}`
    };
  } catch (error) {
    console.error('Erro ao publicar no LinkedIn:', error.response?.data || error.message);
    throw new Error('Falha ao publicar no LinkedIn: ' + (error.response?.data?.message || error.message));
  }
};

/**
 * Obtém métricas de uma publicação
 * @param {string} accessToken - Token de acesso
 * @param {string} postId - ID da publicação
 * @returns {Promise<Object>} Métricas da publicação
 */
const getPostMetrics = async (accessToken, postId) => {
  try {
    const response = await axios.get(`${API_URL}/socialActions/${postId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });
    
    return {
      likes: response.data.likesSummary?.totalLikes || 0,
      comments: response.data.commentsSummary?.totalComments || 0,
      shares: response.data.sharesSummary?.totalShares || 0
    };
  } catch (error) {
    console.error('Erro ao obter métricas do LinkedIn:', error.response?.data || error.message);
    throw new Error('Falha ao buscar métricas do LinkedIn');
  }
};

module.exports = {
  getAuthUrl,
  exchangeCodeForToken,
  refreshToken,
  getProfile,
  shareContent,
  getPostMetrics
};