/**
 * Serviço de integração com Twitter/X
 * Responsável por autenticar e publicar conteúdo no Twitter
 */

const axios = require('axios');
const OAuth = require('oauth');

// Configurações do Twitter API v2
const TWITTER_API_URL = 'https://api.twitter.com/2';
const TWITTER_OAUTH_URL = 'https://twitter.com/i/oauth2/authorize';
const TWITTER_TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';

/**
 * Classe de serviço para integração com Twitter
 */
class TwitterService {
  constructor() {
    this.apiKey = process.env.TWITTER_API_KEY;
    this.apiKeySecret = process.env.TWITTER_API_SECRET;
    this.redirectUri = process.env.TWITTER_REDIRECT_URI;
    this.oauth2 = new OAuth.OAuth2(
      this.apiKey,
      this.apiKeySecret,
      'https://api.twitter.com/',
      null,
      TWITTER_TOKEN_URL,
      null
    );
  }

  /**
   * Gera URL de autorização para o Twitter
   * @returns {string} URL de autorização
   */
  getAuthUrl() {
    if (!this.apiKey || !this.apiKeySecret || !this.redirectUri) {
      throw new Error('Credenciais do Twitter não configuradas');
    }

    const scopes = ['tweet.read', 'tweet.write', 'users.read', 'offline.access'];
    
    return this.oauth2.getAuthorizeUrl({
      redirect_uri: this.redirectUri,
      scope: scopes.join(' '),
      response_type: 'code',
      state: 'twitter'
    });
  }

  /**
   * Obtém tokens a partir do código de autorização
   * @param {string} code - Código de autorização
   * @returns {Object} Tokens de acesso
   */
  async getTokensFromCode(code) {
    try {
      const tokenResponse = await new Promise((resolve, reject) => {
        this.oauth2.getOAuthAccessToken(
          code,
          {
            grant_type: 'authorization_code',
            redirect_uri: this.redirectUri
          },
          (err, accessToken, refreshToken, results) => {
            if (err) {
              reject(err);
            } else {
              resolve({
                access_token: accessToken,
                refresh_token: refreshToken,
                results: results
              });
            }
          }
        );
      });

      return {
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token,
        expiry_date: Date.now() + (tokenResponse.results.expires_in * 1000)
      };
    } catch (error) {
      console.error('Erro ao obter tokens do Twitter:', error);
      throw error;
    }
  }

  /**
   * Atualiza o token de acesso usando o refresh token
   * @param {string} refreshToken - Token de atualização
   * @returns {Object} Novos tokens
   */
  async refreshAccessToken(refreshToken) {
    try {
      const tokenResponse = await new Promise((resolve, reject) => {
        this.oauth2.getOAuthAccessToken(
          refreshToken,
          {
            grant_type: 'refresh_token'
          },
          (err, accessToken, refreshToken, results) => {
            if (err) {
              reject(err);
            } else {
              resolve({
                access_token: accessToken,
                refresh_token: refreshToken,
                results: results
              });
            }
          }
        );
      });

      return {
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token || refreshToken,
        expiry_date: Date.now() + (tokenResponse.results.expires_in * 1000)
      };
    } catch (error) {
      console.error('Erro ao atualizar token do Twitter:', error);
      throw error;
    }
  }

  /**
   * Publica um tweet de texto
   * @param {string} accessToken - Token de acesso
   * @param {string} text - Texto do tweet
   * @returns {Object} Dados do tweet publicado
   */
  async postTweet(accessToken, text) {
    try {
      const response = await axios.post(
        `${TWITTER_API_URL}/tweets`,
        { text },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Erro ao publicar tweet:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Publica um tweet com mídia
   * @param {string} accessToken - Token de acesso
   * @param {string} text - Texto do tweet
   * @param {string} mediaId - ID da mídia já carregada
   * @returns {Object} Dados do tweet publicado
   */
  async postTweetWithMedia(accessToken, text, mediaId) {
    try {
      const response = await axios.post(
        `${TWITTER_API_URL}/tweets`,
        {
          text,
          media: {
            media_ids: [mediaId]
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Erro ao publicar tweet com mídia:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Faz upload de mídia para o Twitter
   * @param {string} accessToken - Token de acesso
   * @param {Buffer} mediaData - Dados da mídia
   * @param {string} mimeType - Tipo MIME da mídia
   * @returns {string} ID da mídia
   */
  async uploadMedia(accessToken, mediaData, mimeType) {
    // Implementação de upload de mídia
    // Observação: A API v2 do Twitter tem um processo diferente para upload de mídia
    // Esta é uma versão simplificada
    try {
      // O ideal seria implementar um upload em chunks para arquivos grandes
      const response = await axios.post(
        'https://upload.twitter.com/1.1/media/upload.json',
        mediaData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': mimeType
          }
        }
      );

      return response.data.media_id_string;
    } catch (error) {
      console.error('Erro ao fazer upload de mídia para o Twitter:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Obtém informações do usuário
   * @param {string} accessToken - Token de acesso
   * @returns {Object} Dados do usuário
   */
  async getUserInfo(accessToken) {
    try {
      const response = await axios.get(
        `${TWITTER_API_URL}/users/me`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          params: {
            'user.fields': 'id,name,username,profile_image_url,public_metrics'
          }
        }
      );

      return response.data.data;
    } catch (error) {
      console.error('Erro ao obter informações do usuário do Twitter:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Obtém métricas de um tweet específico
   * @param {string} accessToken - Token de acesso
   * @param {string} tweetId - ID do tweet
   * @returns {Object} Métricas do tweet
   */
  async getTweetMetrics(accessToken, tweetId) {
    try {
      const response = await axios.get(
        `${TWITTER_API_URL}/tweets/${tweetId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          params: {
            'tweet.fields': 'public_metrics,non_public_metrics'
          }
        }
      );

      return response.data.data;
    } catch (error) {
      console.error('Erro ao obter métricas do tweet:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = new TwitterService();