/**
 * Serviço de integração com LinkedIn
 * Responsável por gerenciar autenticação e publicação no LinkedIn
 */

const axios = require('axios');

class LinkedInService {
  constructor() {
    this.baseUrl = 'https://api.linkedin.com/v2';
    this.authBaseUrl = 'https://www.linkedin.com/oauth/v2';
  }

  /**
   * Gera URL de autorização para o LinkedIn
   * @param {string} redirectUri - URI de redirecionamento após autorização
   * @returns {string} URL para autorização
   */
  getAuthUrl(redirectUri) {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    if (!clientId) {
      throw new Error('LinkedIn Client ID não configurado');
    }

    const scopes = [
      'r_liteprofile',
      'r_emailaddress',
      'w_member_social'
    ];

    return `${this.authBaseUrl}/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes.join(' '))}`;
  }

  /**
   * Obtém tokens a partir do código de autorização
   * @param {string} code - Código de autorização
   * @param {string} redirectUri - URI de redirecionamento
   * @returns {Promise<Object>} Tokens de acesso
   */
  async getTokensFromCode(code, redirectUri) {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('LinkedIn Client ID ou Client Secret não configurados');
    }

    try {
      const response = await axios.post(`${this.authBaseUrl}/accessToken`, null, {
        params: {
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return {
        access_token: response.data.access_token,
        expires_in: response.data.expires_in,
        refresh_token: response.data.refresh_token || null,
        expiry_date: Date.now() + response.data.expires_in * 1000
      };
    } catch (error) {
      console.error('Erro ao obter tokens do LinkedIn:', error.response?.data || error.message);
      throw new Error(`Falha ao obter tokens: ${error.message}`);
    }
  }

  /**
   * Obtém informações do perfil do usuário
   * @param {string} accessToken - Token de acesso
   * @returns {Promise<Object>} Informações do perfil
   */
  async getProfile(accessToken) {
    try {
      const response = await axios.get(`${this.baseUrl}/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      // Buscar informações adicionais do perfil
      const emailResponse = await axios.get(`${this.baseUrl}/emailAddress?q=members&projection=(elements*(handle~))`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      return {
        id: response.data.id,
        firstName: response.data.localizedFirstName,
        lastName: response.data.localizedLastName,
        email: emailResponse.data.elements[0]['handle~'].emailAddress,
        profileUrl: `https://www.linkedin.com/in/${response.data.id}`
      };
    } catch (error) {
      console.error('Erro ao obter perfil do LinkedIn:', error.response?.data || error.message);
      throw new Error(`Falha ao obter perfil: ${error.message}`);
    }
  }

  /**
   * Publica um texto no LinkedIn
   * @param {string} accessToken - Token de acesso
   * @param {string} text - Texto a ser publicado
   * @returns {Promise<Object>} Resultado da publicação
   */
  async shareText(accessToken, text) {
    try {
      // Obter o ID da pessoa (author)
      const profile = await this.getProfile(accessToken);
      const personId = profile.id;

      const payload = {
        author: `urn:li:person:${personId}`,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: text
            },
            shareMediaCategory: "NONE"
          }
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        }
      };

      const response = await axios.post(`${this.baseUrl}/ugcPosts`, payload, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      });

      return {
        id: response.data.id,
        status: 'published',
        url: `https://www.linkedin.com/feed/update/${response.data.id}`
      };
    } catch (error) {
      console.error('Erro ao publicar no LinkedIn:', error.response?.data || error.message);
      throw new Error(`Falha na publicação: ${error.message}`);
    }
  }

  /**
   * Compartilha uma URL no LinkedIn
   * @param {string} accessToken - Token de acesso
   * @param {string} text - Texto do compartilhamento
   * @param {string} url - URL para compartilhar
   * @param {string} title - Título do link
   * @param {string} description - Descrição do link
   * @returns {Promise<Object>} Resultado do compartilhamento
   */
  async shareUrl(accessToken, text, url, title, description) {
    try {
      // Obter o ID da pessoa (author)
      const profile = await this.getProfile(accessToken);
      const personId = profile.id;

      const payload = {
        author: `urn:li:person:${personId}`,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: text
            },
            shareMediaCategory: "ARTICLE",
            media: [
              {
                status: "READY",
                originalUrl: url,
                title: title,
                description: description
              }
            ]
          }
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        }
      };

      const response = await axios.post(`${this.baseUrl}/ugcPosts`, payload, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      });

      return {
        id: response.data.id,
        status: 'published',
        url: `https://www.linkedin.com/feed/update/${response.data.id}`
      };
    } catch (error) {
      console.error('Erro ao compartilhar URL no LinkedIn:', error.response?.data || error.message);
      throw new Error(`Falha no compartilhamento: ${error.message}`);
    }
  }

  /**
   * Obtém métricas básicas de uma publicação
   * @param {string} accessToken - Token de acesso
   * @param {string} postId - ID da publicação
   * @returns {Promise<Object>} Métricas da publicação
   */
  async getPostMetrics(accessToken, postId) {
    try {
      const response = await axios.get(`${this.baseUrl}/socialActions/${postId}`, {
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
      throw new Error(`Falha ao obter métricas: ${error.message}`);
    }
  }
  
  /**
   * Compõe um post no LinkedIn com imagem
   * Este método faz upload da imagem e depois cria o post
   * @param {string} accessToken - Token de acesso
   * @param {Buffer} imageData - Dados da imagem
   * @param {string} text - Texto do post
   * @param {string} title - Título da imagem
   * @returns {Promise<Object>} Resultado da publicação
   */
  async shareImage(accessToken, imageData, text, title) {
    try {
      // Obter o ID da pessoa (author)
      const profile = await this.getProfile(accessToken);
      const personId = profile.id;
      
      // Fase 1: Iniciar o upload da imagem
      const registerUploadResponse = await axios.post(
        `${this.baseUrl}/assets?action=registerUpload`,
        {
          registerUploadRequest: {
            owner: `urn:li:person:${personId}`,
            serviceRelationships: [
              {
                relationshipType: "OWNER",
                identifier: "urn:li:userGeneratedContent"
              }
            ],
            recipes: [
              "urn:li:digitalmediaRecipe:feedshare-image"
            ],
            supportedUploadMechanism: [
              "SYNCHRONOUS_UPLOAD"
            ]
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );
      
      const uploadUrl = registerUploadResponse.data.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
      const assetId = registerUploadResponse.data.value.asset;
      
      // Fase 2: Fazer upload da imagem
      await axios.put(
        uploadUrl,
        imageData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'image/jpeg' // Adaptar conforme o tipo de imagem
          }
        }
      );
      
      // Fase 3: Criar o post com a imagem
      const shareResponse = await axios.post(
        `${this.baseUrl}/ugcPosts`,
        {
          author: `urn:li:person:${personId}`,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: {
                text: text
              },
              shareMediaCategory: "IMAGE",
              media: [
                {
                  status: "READY",
                  description: {
                    text: title || "Imagem compartilhada"
                  },
                  media: assetId
                }
              ]
            }
          },
          visibility: {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );
      
      return {
        id: shareResponse.data.id,
        status: 'published',
        url: `https://www.linkedin.com/feed/update/${shareResponse.data.id}`
      };
    } catch (error) {
      console.error('Erro ao compartilhar imagem no LinkedIn:', error.response?.data || error.message);
      throw new Error(`Falha ao compartilhar imagem: ${error.message}`);
    }
  }
  
  /**
   * Obtém estatísticas detalhadas de conteúdo
   * @param {string} accessToken - Token de acesso
   * @param {string} organizationId - ID da organização (se disponível)
   * @returns {Promise<Object>} Estatísticas de conteúdo
   */
  async getContentStatistics(accessToken, organizationId) {
    try {
      // Esta API requer uma conta de organização
      if (!organizationId) {
        throw new Error('ID da organização é necessário para obter estatísticas de conteúdo');
      }
      
      const response = await axios.get(
        `${this.baseUrl}/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:${organizationId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );
      
      return {
        totalShareStatistics: response.data.elements[0].totalShareStatistics,
        shareStatistics: response.data.elements[0].shareStatistics
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas de conteúdo no LinkedIn:', error.response?.data || error.message);
      throw new Error(`Falha ao obter estatísticas: ${error.message}`);
    }
  }
  
  /**
   * Renova um token de acesso usando o fluxo de renovação de OAuth 2.0
   * @param {string} refreshToken - Token de atualização
   * @returns {Promise<Object>} Novo token de acesso e informações relacionadas
   */
  async refreshToken(refreshToken) {
    try {
      const clientId = process.env.LINKEDIN_CLIENT_ID;
      const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        throw new Error('LinkedIn Client ID ou Client Secret não configurados');
      }
      
      const response = await axios.post(
        `${this.authBaseUrl}/accessToken`,
        null,
        {
          params: {
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      return {
        access_token: response.data.access_token,
        expires_in: response.data.expires_in,
        refresh_token: response.data.refresh_token || refreshToken,
        expiry_date: Date.now() + response.data.expires_in * 1000
      };
    } catch (error) {
      console.error('Erro ao renovar token do LinkedIn:', error.response?.data || error.message);
      throw new Error(`Falha ao renovar token: ${error.message}`);
    }
  }
}

module.exports = new LinkedInService();