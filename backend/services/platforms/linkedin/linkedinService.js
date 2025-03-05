/**
 * Serviço para integração com a API do LinkedIn
 */
const axios = require('axios');
const querystring = require('querystring');

// Configurações da API do LinkedIn
const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:5002/api/linkedin/callback';
const API_URL = 'https://api.linkedin.com/v2';

/**
 * Classe para gerenciar a integração com a API do LinkedIn
 */
class LinkedInService {
  /**
   * Obtém URL para autorização OAuth
   * @returns {string} URL de autorização
   */
  getAuthUrl() {
    const scopes = [
      'r_liteprofile',
      'r_organization_social',
      'rw_organization_admin',
      'w_member_social'
    ];

    const authUrl = 'https://www.linkedin.com/oauth/v2/authorization';
    const params = querystring.stringify({
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: scopes.join(' '),
      state: Math.random().toString(36).substring(2, 15)
    });

    return `${authUrl}?${params}`;
  }
  
  /**
   * Troca o código de autorização por tokens de acesso
   * @param {string} code Código de autorização
   * @returns {Object} Tokens de acesso
   */
  async getTokenFromCode(code) {
    try {
      const response = await axios({
        method: 'post',
        url: 'https://www.linkedin.com/oauth/v2/accessToken',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: querystring.stringify({
          grant_type: 'authorization_code',
          code,
          redirect_uri: REDIRECT_URI,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET
        })
      });
      
      return response.data;
    } catch (error) {
      console.error('Erro ao obter token do LinkedIn:', error.response?.data || error.message);
      throw error;
    }
  }
  
  /**
   * Obtém informações do perfil do usuário
   * @param {string} accessToken Token de acesso
   * @returns {Object} Informações do perfil
   */
  async getProfile(accessToken) {
    try {
      const response = await axios({
        method: 'get',
        url: `${API_URL}/me`,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'cache-control': 'no-cache',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Erro ao obter perfil do LinkedIn:', error.response?.data || error.message);
      throw error;
    }
  }
  
  /**
   * Compartilha conteúdo no feed do LinkedIn
   * @param {string} accessToken Token de acesso
   * @param {Object} content Conteúdo a ser compartilhado
   * @returns {Object} Resposta da API do LinkedIn
   */
  async shareContent(accessToken, content) {
    try {
      // Preparar payload
      const payload = this._prepareSharePayload(content);
      
      const response = await axios({
        method: 'post',
        url: `${API_URL}/shares`,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        },
        data: payload
      });
      
      return response.data;
    } catch (error) {
      console.error('Erro ao compartilhar no LinkedIn:', error.response?.data || error.message);
      throw error;
    }
  }
  
  /**
   * Prepara o payload para compartilhar conteúdo
   * @param {Object} content Conteúdo a ser compartilhado
   * @returns {Object} Payload formatado
   */
  _prepareSharePayload(content) {
    // Texto simples
    if (content.contentType === 'text') {
      return {
        content: {
          contentEntities: [],
          title: content.title || '',
          description: content.description || ''
        },
        distribution: {
          linkedInDistributionTarget: {}
        },
        owner: 'urn:li:person:' + content.authorId,
        subject: content.title,
        text: {
          text: content.description
        }
      };
    }
    
    // Conteúdo com mídia (imagem ou vídeo)
    return {
      content: {
        contentEntities: [
          {
            entityLocation: content.mediaUrl,
            thumbnails: content.thumbnailUrl ? [
              { resolvedUrl: content.thumbnailUrl }
            ] : undefined
          }
        ],
        title: content.title || '',
        description: content.description || ''
      },
      distribution: {
        linkedInDistributionTarget: {}
      },
      owner: 'urn:li:person:' + content.authorId,
      subject: content.title,
      text: {
        text: content.description
      }
    };
  }
  
  /**
   * Obtém métricas de engajamento
   * @param {string} accessToken Token de acesso
   * @param {string} postId ID do post
   * @returns {Object} Métricas de engajamento
   */
  async getEngagementMetrics(accessToken, postId) {
    try {
      const response = await axios({
        method: 'get',
        url: `${API_URL}/socialMetadata/${postId}`,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'cache-control': 'no-cache',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Erro ao obter métricas do LinkedIn:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = new LinkedInService();