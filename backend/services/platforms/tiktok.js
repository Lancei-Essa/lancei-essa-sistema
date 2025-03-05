/**
 * Serviço de integração com TikTok
 * Responsável por gerenciar autenticação e publicação no TikTok
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);

class TikTokService {
  constructor() {
    this.baseUrl = 'https://open-api.tiktok.com';
    this.videoUploadUrl = 'https://open-api.tiktok.com/share/video/upload/';
    this.authUrl = 'https://open-api.tiktok.com/oauth/authorize/';
    this.accessTokenUrl = 'https://open-api.tiktok.com/oauth/access_token/';
    this.refreshTokenUrl = 'https://open-api.tiktok.com/oauth/refresh_token/';
  }

  /**
   * Gera URL de autorização para o TikTok
   * @param {string} redirectUri - URI de redirecionamento após autorização
   * @returns {string} URL para autorização
   */
  getAuthUrl(redirectUri) {
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    if (!clientKey) {
      throw new Error('TikTok Client Key não configurado');
    }

    const scopes = [
      'user.info.basic',
      'user.info.profile',
      'user.info.stats',
      'video.list',
      'video.upload'
    ];

    const params = new URLSearchParams({
      client_key: clientKey,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: scopes.join(','),
      state: 'state' // Um valor de estado para verificação anti-CSRF
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  /**
   * Obtém tokens a partir do código de autorização
   * @param {string} code - Código de autorização
   * @param {string} redirectUri - URI de redirecionamento
   * @returns {Promise<Object>} Tokens de acesso
   */
  async getTokensFromCode(code) {
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

    if (!clientKey || !clientSecret) {
      throw new Error('TikTok Client Key ou Client Secret não configurados');
    }

    try {
      const response = await axios.post(this.accessTokenUrl, {
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code'
      });

      const data = response.data.data;
      
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        open_id: data.open_id,
        expires_in: data.expires_in,
        expiry_date: Date.now() + data.expires_in * 1000,
        scope: data.scope
      };
    } catch (error) {
      console.error('Erro ao obter tokens do TikTok:', error.response?.data || error.message);
      throw new Error(`Falha ao obter tokens: ${error.message}`);
    }
  }

  /**
   * Renova um token de acesso usando o refresh token
   * @param {string} refreshToken - Token de renovação
   * @param {string} clientKey - Chave do cliente TikTok
   * @param {string} clientSecret - Segredo do cliente TikTok
   * @returns {Promise<Object>} Novos tokens
   */
  async refreshToken(refreshToken, clientKey, clientSecret) {
    if (!clientKey || !clientSecret) {
      throw new Error('TikTok Client Key ou Client Secret não configurados');
    }

    try {
      const response = await axios.post(this.refreshTokenUrl, {
        client_key: clientKey,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      });

      const data = response.data.data;
      
      return {
        success: true,
        access_token: data.access_token,
        refresh_token: data.refresh_token || refreshToken,
        open_id: data.open_id,
        expires_in: data.expires_in,
        expiry_date: Date.now() + data.expires_in * 1000,
        scope: data.scope
      };
    } catch (error) {
      console.error('Erro ao renovar token do TikTok:', error.response?.data || error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Renova um token de acesso usando o refresh token (método legado por compatibilidade)
   * @param {string} refreshToken - Token de renovação
   * @returns {Promise<Object>} Novos tokens
   */
  async refreshAccessToken(refreshToken) {
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
    
    const result = await this.refreshToken(refreshToken, clientKey, clientSecret);
    
    if (!result.success) {
      throw new Error(`Falha ao renovar token: ${result.error}`);
    }
    
    return {
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      open_id: result.open_id,
      expires_in: result.expires_in,
      expiry_date: result.expiry_date,
      scope: result.scope
    };
  }

  /**
   * Obtém informações do perfil do usuário
   * @param {string} accessToken - Token de acesso
   * @param {string} openId - ID aberto do usuário
   * @returns {Promise<Object>} Informações do perfil
   */
  async getUserInfo(accessToken, openId) {
    try {
      const response = await axios.get(`${this.baseUrl}/user/info/`, {
        params: {
          access_token: accessToken,
          open_id: openId,
          fields: 'open_id,union_id,avatar_url,avatar_url_100,avatar_large_url,display_name,bio_description,profile_deep_link,follower_count,following_count,likes_count,video_count'
        }
      });

      const data = response.data.data;
      return {
        open_id: data.open_id,
        union_id: data.union_id,
        display_name: data.display_name,
        avatar_url: data.avatar_url,
        bio: data.bio_description,
        profile_link: data.profile_deep_link,
        follower_count: data.follower_count,
        following_count: data.following_count,
        likes_count: data.likes_count,
        video_count: data.video_count
      };
    } catch (error) {
      console.error('Erro ao obter informações do usuário TikTok:', error.response?.data || error.message);
      throw new Error(`Falha ao obter informações do usuário: ${error.message}`);
    }
  }

  /**
   * Publica um vídeo no TikTok
   * @param {string} accessToken - Token de acesso
   * @param {string} openId - ID aberto do usuário
   * @param {string} videoPath - Caminho do arquivo de vídeo
   * @param {Object} videoInfo - Informações do vídeo (título, descrição, etc.)
   * @returns {Promise<Object>} Resultado da publicação
   */
  async uploadVideo(accessToken, openId, videoPath, videoInfo = {}) {
    try {
      // Leitura do arquivo de vídeo
      const videoBuffer = await readFileAsync(videoPath);
      
      // Preparação do FormData
      const formData = new FormData();
      formData.append('access_token', accessToken);
      formData.append('open_id', openId);
      formData.append('video', videoBuffer, { filename: 'video.mp4', contentType: 'video/mp4' });
      
      if (videoInfo.title) {
        formData.append('title', videoInfo.title);
      }
      
      if (videoInfo.description) {
        formData.append('description', videoInfo.description);
      }
      
      // Hashtags como array de strings
      if (videoInfo.hashtags && Array.isArray(videoInfo.hashtags)) {
        videoInfo.hashtags.forEach(tag => {
          formData.append('hashtag_names', tag);
        });
      }
      
      if (videoInfo.privacy_level) {
        formData.append('privacy_level', videoInfo.privacy_level); // "public", "private", "friends"
      }
      
      if (videoInfo.disable_comment !== undefined) {
        formData.append('disable_comment', videoInfo.disable_comment ? 'true' : 'false');
      }
      
      if (videoInfo.disable_duet !== undefined) {
        formData.append('disable_duet', videoInfo.disable_duet ? 'true' : 'false');
      }
      
      if (videoInfo.disable_stitch !== undefined) {
        formData.append('disable_stitch', videoInfo.disable_stitch ? 'true' : 'false');
      }
      
      // Envio da requisição
      const response = await axios.post(this.videoUploadUrl, formData, {
        headers: {
          ...formData.getHeaders(),
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const data = response.data.data;
      return {
        video_id: data.video_id,
        share_id: data.share_id,
        create_time: data.create_time,
        video_status: data.video_status
      };
    } catch (error) {
      console.error('Erro ao fazer upload de vídeo para o TikTok:', error.response?.data || error.message);
      throw new Error(`Falha ao fazer upload de vídeo: ${error.message}`);
    }
  }

  /**
   * Obtém vídeos do usuário
   * @param {string} accessToken - Token de acesso
   * @param {string} openId - ID aberto do usuário
   * @param {number} cursor - Cursor para paginação
   * @param {number} maxCount - Número máximo de vídeos a retornar
   * @returns {Promise<Object>} Lista de vídeos
   */
  async getUserVideos(accessToken, openId, cursor = 0, maxCount = 20) {
    try {
      const response = await axios.get(`${this.baseUrl}/video/list/`, {
        params: {
          access_token: accessToken,
          open_id: openId,
          cursor,
          max_count: maxCount
        }
      });
      
      return response.data.data;
    } catch (error) {
      console.error('Erro ao obter vídeos do usuário TikTok:', error.response?.data || error.message);
      throw new Error(`Falha ao obter vídeos do usuário: ${error.message}`);
    }
  }

  /**
   * Obtém métricas de um vídeo específico
   * @param {string} accessToken - Token de acesso
   * @param {string} openId - ID aberto do usuário
   * @param {string} videoId - ID do vídeo
   * @returns {Promise<Object>} Métricas do vídeo
   */
  async getVideoMetrics(accessToken, openId, videoId) {
    try {
      const response = await axios.get(`${this.baseUrl}/video/data/`, {
        params: {
          access_token: accessToken,
          open_id: openId,
          video_id: videoId
        }
      });
      
      const data = response.data.data;
      return {
        video_id: videoId,
        view_count: data.view_count,
        like_count: data.like_count,
        comment_count: data.comment_count,
        share_count: data.share_count,
        download_count: data.download_count,
        play_duration: data.play_duration
      };
    } catch (error) {
      console.error('Erro ao obter métricas do vídeo TikTok:', error.response?.data || error.message);
      throw new Error(`Falha ao obter métricas do vídeo: ${error.message}`);
    }
  }
}

module.exports = new TikTokService();