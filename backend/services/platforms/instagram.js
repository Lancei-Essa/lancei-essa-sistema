const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);

/**
 * Classe de serviço para integração com Instagram
 */
class InstagramService {
  constructor() {
    this.apiBaseUrl = 'https://graph.instagram.com';
    this.oauthBaseUrl = 'https://api.instagram.com/oauth';
  }

  /**
   * Obtém um token de acesso a partir de um código de autorização
   * @param {string} code - Código de autorização do Instagram
   * @param {string} clientId - Client ID da aplicação
   * @param {string} clientSecret - Client Secret da aplicação
   * @param {string} redirectUri - URI de redirecionamento registrada
   * @returns {Promise<Object>} Token de acesso e informações
   */
  async exchangeCodeForToken(code, clientId, clientSecret, redirectUri) {
    try {
      const response = await axios.post(`${this.oauthBaseUrl}/access_token`, null, {
        params: {
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          code: code
        }
      });
      
      return {
        success: true,
        access_token: response.data.access_token,
        user_id: response.data.user_id,
        expires_in: response.data.expires_in || 5184000, // Padrão: 60 dias
      };
    } catch (error) {
      console.error('Erro ao trocar código por token:', error);
      return {
        success: false,
        error: error.response?.data?.error_message || error.message
      };
    }
  }
  
  /**
   * Atualiza um token de acesso existente
   * @param {string} refreshToken - Token de atualização
   * @param {string} clientId - Client ID da aplicação
   * @param {string} clientSecret - Client Secret da aplicação
   * @returns {Promise<Object>} Novo token de acesso
   */
  async refreshToken(refreshToken, clientId, clientSecret) {
    try {
      const response = await axios.post(`${this.oauthBaseUrl}/refresh_access_token`, null, {
        params: {
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        }
      });
      
      return {
        success: true,
        access_token: response.data.access_token,
        expires_in: response.data.expires_in
      };
    } catch (error) {
      console.error('Erro ao atualizar token:', error);
      return {
        success: false,
        error: error.response?.data?.error_message || error.message
      };
    }
  }
  
  /**
   * Revoga um token de acesso
   * @param {string} accessToken - Token de acesso a ser revogado
   * @param {string} clientId - Client ID da aplicação
   * @param {string} clientSecret - Client Secret da aplicação
   * @returns {Promise<Object>} Resultado da operação
   */
  async revokeToken(accessToken, clientId, clientSecret) {
    try {
      await axios.post(`${this.oauthBaseUrl}/revoke_access_token`, null, {
        params: {
          client_id: clientId,
          client_secret: clientSecret,
          token: accessToken
        }
      });
      
      return {
        success: true
      };
    } catch (error) {
      console.error('Erro ao revogar token:', error);
      return {
        success: false,
        error: error.response?.data?.error_message || error.message
      };
    }
  }
  
  /**
   * Obtém informações do perfil do usuário
   * @param {string} accessToken - Token de acesso do Instagram
   * @returns {Promise<Object>} Informações do perfil
   */
  async getUserProfile(accessToken) {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/me`, {
        params: {
          fields: 'id,username,account_type,media_count',
          access_token: accessToken
        }
      });
      
      return {
        success: true,
        data: {
          id: response.data.id,
          username: response.data.username,
          accountType: response.data.account_type,
          mediaCount: response.data.media_count
        }
      };
    } catch (error) {
      console.error('Erro ao obter perfil do usuário:', error);
      return {
        success: false,
        error: error.response?.data?.error_message || error.message
      };
    }
  }

  /**
   * Obtém a lista de mídias do usuário
   * @param {string} accessToken - Token de acesso do Instagram
   * @returns {Promise<Object>} Lista de mídias
   */
  async getUserMedia(accessToken) {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/me/media`, {
        params: {
          fields: 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username',
          access_token: accessToken
        }
      });
      
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Erro ao obter mídia do usuário:', error);
      return {
        success: false,
        error: error.response?.data?.error_message || error.message
      };
    }
  }

  /**
   * Obtém informações sobre uma mídia específica
   * @param {string} mediaId - ID da mídia
   * @param {string} accessToken - Token de acesso do Instagram
   * @returns {Promise<Object>} Informações da mídia
   */
  async getMediaInfo(mediaId, accessToken) {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/${mediaId}`, {
        params: {
          fields: 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username',
          access_token: accessToken
        }
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Erro ao obter informações da mídia:', error);
      return {
        success: false,
        error: error.response?.data?.error_message || error.message
      };
    }
  }

  /**
   * Obtém métricas e insights de um usuário do Instagram
   * @param {string} accessToken - Token de acesso do Instagram
   * @returns {Promise<Object>} Métricas e insights
   */
  async getInsights(accessToken) {
    try {
      // Obter informações do perfil
      const profileResponse = await this.getUserProfile(accessToken);
      
      if (!profileResponse.success) {
        return profileResponse;
      }
      
      // Obter mídia recente
      const mediaResponse = await this.getUserMedia(accessToken);
      
      if (!mediaResponse.success) {
        return mediaResponse;
      }
      
      const profile = profileResponse.data;
      const media = mediaResponse.data;
      
      // Contagem de seguidores (não disponível via Graph API para contas pessoais)
      // Vamos usar valores simulados, já que a API Graph não fornece isso diretamente
      const followerCount = 0; // Indisponível via API pública
      
      return {
        success: true,
        data: {
          profile: {
            id: profile.id,
            username: profile.username,
            accountType: profile.accountType,
            mediaCount: profile.mediaCount,
            followerCount: followerCount
          },
          recentMedia: media.slice(0, 10).map(item => ({
            id: item.id,
            caption: item.caption || '',
            mediaUrl: item.media_url,
            permalink: item.permalink,
            timestamp: item.timestamp,
            mediaType: item.media_type
          }))
        }
      };
    } catch (error) {
      console.error('Erro ao obter insights:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Publica uma foto no Instagram (não disponível via API Graph básica)
   * @param {string} imagePath - Caminho para a imagem
   * @param {string} caption - Legenda da foto
   * @param {string} accessToken - Token de acesso do Instagram
   */
  async publishPhoto(imagePath, caption, accessToken) {
    try {
      // Verificar se o token tem as permissões necessárias
      const permissions = await this.getPermissions(accessToken);
      
      if (!permissions.success || !permissions.data.includes('instagram_content_publish')) {
        return {
          success: false,
          error: 'O token de acesso não tem permissão para publicar conteúdo. É necessário solicitar permissões adicionais.'
        };
      }
      
      // Obter o ID do usuário/página do Instagram
      const userProfile = await this.getUserProfile(accessToken);
      if (!userProfile.success) {
        return userProfile;
      }
      
      const userId = userProfile.data.id;
      
      // 1. Criar contêiner de mídia
      const formData = new FormData();
      formData.append('image_url', fs.createReadStream(imagePath));
      formData.append('caption', caption || '');
      
      const containerResponse = await axios.post(
        `${this.apiBaseUrl}/${userId}/media`,
        formData,
        {
          params: {
            access_token: accessToken
          },
          headers: formData.getHeaders()
        }
      );
      
      if (!containerResponse.data || !containerResponse.data.id) {
        return {
          success: false,
          error: 'Falha ao criar contêiner de mídia'
        };
      }
      
      const containerId = containerResponse.data.id;
      
      // 2. Publicar a mídia
      const publishResponse = await axios.post(
        `${this.apiBaseUrl}/${userId}/media_publish`,
        null,
        {
          params: {
            creation_id: containerId,
            access_token: accessToken
          }
        }
      );
      
      if (!publishResponse.data || !publishResponse.data.id) {
        return {
          success: false,
          error: 'Falha ao publicar mídia'
        };
      }
      
      return {
        success: true,
        mediaId: publishResponse.data.id,
        code: publishResponse.data.id // Instagram não retorna código direto via API
      };
    } catch (error) {
      console.error('Erro ao publicar foto no Instagram:', error);
      return {
        success: false,
        error: error.response?.data?.error_message || error.message
      };
    }
  }

  /**
   * Obtém as permissões do token atual
   * @param {string} accessToken - Token de acesso do Instagram
   * @returns {Promise<Object>} Lista de permissões
   */
  async getPermissions(accessToken) {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/me/permissions`, {
        params: {
          access_token: accessToken
        }
      });
      
      return {
        success: true,
        data: response.data.data.map(perm => perm.permission)
      };
    } catch (error) {
      console.error('Erro ao obter permissões:', error);
      return {
        success: false,
        error: error.response?.data?.error_message || error.message
      };
    }
  }

  /**
   * Verifica as credenciais de um token
   * @param {Object} token - Token com credenciais criptografadas
   * @returns {Promise<Object>} Resultado da verificação
   */
  async verifyToken(token) {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/debug_token`, {
        params: {
          input_token: token.access_token,
          access_token: token.access_token
        }
      });
      
      const data = response.data.data;
      
      return {
        success: true,
        valid: !data.error && data.is_valid,
        expiration: data.expires_at ? new Date(data.expires_at * 1000) : null,
        scopes: data.scopes || []
      };
    } catch (error) {
      console.error('Erro ao verificar token:', error);
      return {
        success: false,
        valid: false,
        error: error.response?.data?.error_message || error.message
      };
    }
  }
  
  /**
   * Autentica-se usando um token previamente salvo
   * @param {Object} token - Objeto de token do banco de dados
   * @returns {Promise<Object>} Resultado do login
   */
  async loginWithToken(token) {
    try {
      // Realizar validação do token
      const verifyResult = await this.verifyToken(token);
      
      if (!verifyResult.success || !verifyResult.valid) {
        return {
          success: false,
          error: 'Token inválido ou expirado'
        };
      }
      
      // Obter perfil do usuário para confirmar acesso
      const profileResponse = await this.getUserProfile(token.access_token);
      
      if (!profileResponse.success) {
        return profileResponse;
      }
      
      return {
        success: true,
        user: profileResponse.data
      };
    } catch (error) {
      console.error('Erro ao fazer login com token:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new InstagramService();