/**
 * Serviço de integração com Twitter (X)
 * Responsável por gerenciar autenticação e publicação no Twitter
 */

const axios = require('axios');
const crypto = require('crypto');
const OAuth = require('oauth-1.0a');
const querystring = require('querystring');

class TwitterService {
  constructor() {
    this.baseUrl = 'https://api.twitter.com';
    this.apiVersion = '2';
  }

  /**
   * Inicializa o cliente OAuth para o Twitter
   * @returns {OAuth} Cliente OAuth
   */
  _getOAuthClient() {
    return OAuth({
      consumer: {
        key: process.env.TWITTER_API_KEY,
        secret: process.env.TWITTER_API_SECRET
      },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string, key) {
        return crypto
          .createHmac('sha1', key)
          .update(base_string)
          .digest('base64');
      }
    });
  }

  /**
   * Obtém token de requisição
   * @param {string} callbackUrl - URL de callback para autenticação
   * @returns {Promise<Object>} Token de requisição
   */
  async getRequestToken(callbackUrl) {
    const oauth = this._getOAuthClient();
    const requestData = {
      url: `${this.baseUrl}/oauth/request_token`,
      method: 'POST',
      data: { oauth_callback: callbackUrl }
    };

    try {
      const response = await axios.post(
        requestData.url,
        null,
        {
          headers: {
            ...oauth.toHeader(oauth.authorize(requestData)),
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          params: requestData.data
        }
      );

      const data = querystring.parse(response.data);
      
      return {
        oauth_token: data.oauth_token,
        oauth_token_secret: data.oauth_token_secret,
        oauth_callback_confirmed: data.oauth_callback_confirmed === 'true'
      };
    } catch (error) {
      console.error('Erro ao obter token de requisição Twitter:', error.response?.data || error.message);
      throw new Error(`Falha ao obter token de requisição: ${error.message}`);
    }
  }

  /**
   * Gera URL de autorização para o Twitter
   * @param {string} callbackUrl - URL de callback para autenticação
   * @returns {Promise<string>} URL para autorização
   */
  async getAuthUrl(callbackUrl) {
    const requestToken = await this.getRequestToken(callbackUrl);
    return `${this.baseUrl}/oauth/authorize?oauth_token=${requestToken.oauth_token}`;
  }

  /**
   * Obtém token de acesso a partir do token de requisição e verifier
   * @param {string} oauthToken - Token de requisição
   * @param {string} oauthVerifier - Verifier obtido após autorização
   * @returns {Promise<Object>} Token de acesso
   */
  async getAccessToken(oauthToken, oauthVerifier) {
    const oauth = this._getOAuthClient();
    const requestData = {
      url: `${this.baseUrl}/oauth/access_token`,
      method: 'POST',
      data: { 
        oauth_token: oauthToken,
        oauth_verifier: oauthVerifier
      }
    };

    try {
      const response = await axios.post(
        requestData.url,
        null,
        {
          headers: {
            ...oauth.toHeader(oauth.authorize(requestData)),
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          params: requestData.data
        }
      );

      const data = querystring.parse(response.data);
      
      return {
        oauth_token: data.oauth_token,
        oauth_token_secret: data.oauth_token_secret,
        user_id: data.user_id,
        screen_name: data.screen_name
      };
    } catch (error) {
      console.error('Erro ao obter token de acesso Twitter:', error.response?.data || error.message);
      throw new Error(`Falha ao obter token de acesso: ${error.message}`);
    }
  }

  /**
   * Obtém informações do usuário autenticado
   * @param {string} oauthToken - Token de acesso
   * @param {string} oauthTokenSecret - Secret do token de acesso
   * @returns {Promise<Object>} Informações do usuário
   */
  async getUserInfo(oauthToken, oauthTokenSecret) {
    const oauth = this._getOAuthClient();
    const requestData = {
      url: `${this.baseUrl}/${this.apiVersion}/users/me`,
      method: 'GET'
    };

    const token = {
      key: oauthToken,
      secret: oauthTokenSecret
    };

    try {
      const response = await axios.get(
        requestData.url,
        {
          headers: {
            ...oauth.toHeader(oauth.authorize(requestData, token)),
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.data;
    } catch (error) {
      console.error('Erro ao obter informações do usuário Twitter:', error.response?.data || error.message);
      throw new Error(`Falha ao obter informações do usuário: ${error.message}`);
    }
  }

  /**
   * Publica um tweet de texto
   * @param {string} oauthToken - Token de acesso
   * @param {string} oauthTokenSecret - Secret do token de acesso
   * @param {string} text - Texto a ser publicado
   * @returns {Promise<Object>} Resultado da publicação
   */
  async tweet(oauthToken, oauthTokenSecret, text) {
    const oauth = this._getOAuthClient();
    const requestData = {
      url: `${this.baseUrl}/${this.apiVersion}/tweets`,
      method: 'POST',
      data: { text }
    };

    const token = {
      key: oauthToken,
      secret: oauthTokenSecret
    };

    try {
      const response = await axios.post(
        requestData.url,
        requestData.data,
        {
          headers: {
            ...oauth.toHeader(oauth.authorize(requestData, token)),
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        id: response.data.data.id,
        text: response.data.data.text,
        status: 'published'
      };
    } catch (error) {
      console.error('Erro ao publicar tweet:', error.response?.data || error.message);
      throw new Error(`Falha ao publicar tweet: ${error.message}`);
    }
  }

  /**
   * Obtém métricas de um tweet específico
   * @param {string} oauthToken - Token de acesso
   * @param {string} oauthTokenSecret - Secret do token de acesso
   * @param {string} tweetId - ID do tweet
   * @returns {Promise<Object>} Métricas do tweet
   */
  async getTweetMetrics(oauthToken, oauthTokenSecret, tweetId) {
    const oauth = this._getOAuthClient();
    const requestData = {
      url: `${this.baseUrl}/${this.apiVersion}/tweets/${tweetId}`,
      method: 'GET',
      params: {
        'tweet.fields': 'public_metrics'
      }
    };

    const token = {
      key: oauthToken,
      secret: oauthTokenSecret
    };

    try {
      const response = await axios.get(
        requestData.url,
        {
          headers: {
            ...oauth.toHeader(oauth.authorize(requestData, token)),
            'Content-Type': 'application/json'
          },
          params: requestData.params
        }
      );

      return {
        retweets: response.data.data.public_metrics.retweet_count,
        likes: response.data.data.public_metrics.like_count,
        replies: response.data.data.public_metrics.reply_count,
        quotes: response.data.data.public_metrics.quote_count
      };
    } catch (error) {
      console.error('Erro ao obter métricas do tweet:', error.response?.data || error.message);
      throw new Error(`Falha ao obter métricas: ${error.message}`);
    }
  }
  
  /**
   * Faz upload de mídia para o Twitter
   * @param {string} oauthToken - Token de acesso
   * @param {string} oauthTokenSecret - Secret do token de acesso
   * @param {Buffer} mediaData - Dados binários da mídia
   * @param {string} mimeType - Tipo MIME da mídia
   * @returns {Promise<string>} ID da mídia carregada
   */
  async uploadMedia(oauthToken, oauthTokenSecret, mediaData, mimeType) {
    const oauth = this._getOAuthClient();
    
    // API de upload de mídia usa v1.1
    const requestData = {
      url: 'https://upload.twitter.com/1.1/media/upload.json',
      method: 'POST'
    };

    const token = {
      key: oauthToken,
      secret: oauthTokenSecret
    };

    try {
      // Codificar a mídia em base64
      const mediaBase64 = mediaData.toString('base64');
      
      // Fazer upload da mídia
      const formData = new FormData();
      formData.append('media_data', mediaBase64);
      
      const response = await axios.post(
        requestData.url,
        formData,
        {
          headers: {
            ...oauth.toHeader(oauth.authorize(requestData, token)),
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      return response.data.media_id_string;
    } catch (error) {
      console.error('Erro ao fazer upload de mídia para o Twitter:', error.response?.data || error.message);
      throw new Error(`Falha ao fazer upload de mídia: ${error.message}`);
    }
  }

  /**
   * Posta um tweet com mídia
   * @param {string} oauthToken - Token de acesso
   * @param {string} oauthTokenSecret - Secret do token de acesso
   * @param {string} text - Texto do tweet
   * @param {string} mediaId - ID da mídia carregada previamente
   * @returns {Promise<Object>} Resultado da publicação
   */
  async postTweetWithMedia(oauthToken, oauthTokenSecret, text, mediaId) {
    const oauth = this._getOAuthClient();
    const requestData = {
      url: `${this.baseUrl}/${this.apiVersion}/tweets`,
      method: 'POST',
      data: { 
        text, 
        media: { 
          media_ids: [mediaId] 
        } 
      }
    };

    const token = {
      key: oauthToken,
      secret: oauthTokenSecret
    };

    try {
      const response = await axios.post(
        requestData.url,
        requestData.data,
        {
          headers: {
            ...oauth.toHeader(oauth.authorize(requestData, token)),
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        data: {
          id: response.data.data.id,
          text: response.data.data.text
        }
      };
    } catch (error) {
      console.error('Erro ao postar tweet com mídia:', error.response?.data || error.message);
      throw new Error(`Falha ao postar tweet com mídia: ${error.message}`);
    }
  }
  
  /**
   * Agenda um tweet para publicação futura (usando a API do Twitter v2 com scheduled tweets)
   * @param {string} oauthToken - Token de acesso
   * @param {string} oauthTokenSecret - Secret do token de acesso
   * @param {string} text - Texto do tweet
   * @param {Date} scheduledTime - Data e hora agendada para publicação
   * @param {string} mediaId - ID da mídia (opcional)
   * @returns {Promise<Object>} Resultado do agendamento
   */
  async scheduleTweet(oauthToken, oauthTokenSecret, text, scheduledTime, mediaId = null) {
    const oauth = this._getOAuthClient();
    
    // Converter a data para o formato ISO 8601
    const isoTime = scheduledTime.toISOString();
    
    // Preparar dados do tweet
    const tweetData = {
      text,
      scheduled_time: isoTime
    };
    
    // Adicionar mídia se fornecida
    if (mediaId) {
      tweetData.media = {
        media_ids: [mediaId]
      };
    }
    
    const requestData = {
      url: `${this.baseUrl}/${this.apiVersion}/tweets`,
      method: 'POST',
      data: tweetData
    };

    const token = {
      key: oauthToken,
      secret: oauthTokenSecret
    };

    try {
      const response = await axios.post(
        requestData.url,
        requestData.data,
        {
          headers: {
            ...oauth.toHeader(oauth.authorize(requestData, token)),
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        scheduled_id: response.data.data.id,
        text: response.data.data.text,
        scheduled_time: scheduledTime,
        status: 'scheduled'
      };
    } catch (error) {
      console.error('Erro ao agendar tweet:', error.response?.data || error.message);
      throw new Error(`Falha ao agendar tweet: ${error.message}`);
    }
  }
}

module.exports = new TwitterService();