/**
 * Serviço de integração com Spotify
 * Responsável por gerenciar autenticação e publicação no Spotify
 */

const axios = require('axios');
const querystring = require('querystring');

class SpotifyService {
  constructor() {
    this.baseUrl = 'https://api.spotify.com/v1';
    this.authUrl = 'https://accounts.spotify.com/api/token';
    this.authorizationUrl = 'https://accounts.spotify.com/authorize';
  }

  /**
   * Gera URL de autorização para o Spotify
   * @param {string} redirectUri - URI de redirecionamento após autorização
   * @returns {string} URL para autorização
   */
  getAuthUrl(redirectUri) {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    if (!clientId) {
      throw new Error('Spotify Client ID não configurado');
    }

    const scopes = [
      'user-read-private',
      'user-read-email',
      'playlist-modify-public',
      'playlist-modify-private',
      'playlist-read-private'
    ];

    const params = querystring.stringify({
      response_type: 'code',
      client_id: clientId,
      scope: scopes.join(' '),
      redirect_uri: redirectUri,
      show_dialog: true
    });

    return `${this.authorizationUrl}?${params}`;
  }

  /**
   * Obtém tokens a partir do código de autorização
   * @param {string} code - Código de autorização
   * @param {string} redirectUri - URI de redirecionamento
   * @returns {Promise<Object>} Tokens de acesso
   */
  async getTokensFromCode(code, redirectUri) {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Spotify Client ID ou Client Secret não configurados');
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    try {
      const response = await axios.post(
        this.authUrl,
        querystring.stringify({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri
        }),
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in,
        expiry_date: Date.now() + response.data.expires_in * 1000,
        scope: response.data.scope
      };
    } catch (error) {
      console.error('Erro ao obter tokens do Spotify:', error.response?.data || error.message);
      throw new Error(`Falha ao obter tokens: ${error.message}`);
    }
  }

  /**
   * Renova um token de acesso usando o refresh token
   * @param {string} refreshToken - Refresh token para renovar o acesso
   * @param {string} clientId - ID do cliente Spotify 
   * @param {string} clientSecret - Segredo do cliente Spotify
   * @returns {Promise<Object>} Tokens renovados
   */
  async refreshToken(refreshToken, clientId, clientSecret) {
    if (!clientId || !clientSecret) {
      throw new Error('Spotify Client ID ou Client Secret não configurados');
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    try {
      const response = await axios.post(
        this.authUrl,
        querystring.stringify({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        }),
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return {
        success: true,
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token || refreshToken, // Spotify pode não retornar um novo refresh token
        expires_in: response.data.expires_in,
        expiry_date: Date.now() + response.data.expires_in * 1000,
        scope: response.data.scope
      };
    } catch (error) {
      console.error('Erro ao renovar tokens do Spotify:', error.response?.data || error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Renova um token de acesso usando o refresh token (método legado por compatibilidade)
   * @param {string} refreshToken - Refresh token para renovar o acesso
   * @returns {Promise<Object>} Tokens renovados
   */
  async refreshAccessToken(refreshToken) {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    
    const result = await this.refreshToken(refreshToken, clientId, clientSecret);
    
    if (!result.success) {
      throw new Error(`Falha ao renovar tokens: ${result.error}`);
    }
    
    return {
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      expires_in: result.expires_in,
      expiry_date: result.expiry_date,
      scope: result.scope
    };
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

      return {
        id: response.data.id,
        display_name: response.data.display_name,
        email: response.data.email,
        href: response.data.href,
        uri: response.data.uri,
        profile_image_url: response.data.images && response.data.images.length > 0 ? response.data.images[0].url : null
      };
    } catch (error) {
      console.error('Erro ao obter perfil do Spotify:', error.response?.data || error.message);
      throw new Error(`Falha ao obter perfil: ${error.message}`);
    }
  }

  /**
   * Busca podcasts no Spotify
   * @param {string} accessToken - Token de acesso
   * @param {string} query - Termo de busca
   * @param {number} limit - Limite de resultados (máx. 50)
   * @returns {Promise<Object>} Resultados da busca
   */
  async searchPodcasts(accessToken, query, limit = 20) {
    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          q: query,
          type: 'show',
          limit: Math.min(limit, 50)
        }
      });

      return response.data.shows;
    } catch (error) {
      console.error('Erro ao buscar podcasts no Spotify:', error.response?.data || error.message);
      throw new Error(`Falha ao buscar podcasts: ${error.message}`);
    }
  }

  /**
   * Obtém detalhes de um podcast específico
   * @param {string} accessToken - Token de acesso
   * @param {string} showId - ID do podcast no Spotify
   * @returns {Promise<Object>} Detalhes do podcast
   */
  async getPodcastDetails(accessToken, showId) {
    try {
      const response = await axios.get(`${this.baseUrl}/shows/${showId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Erro ao obter detalhes do podcast:', error.response?.data || error.message);
      throw new Error(`Falha ao obter detalhes do podcast: ${error.message}`);
    }
  }

  /**
   * Obtém os episódios de um podcast
   * @param {string} accessToken - Token de acesso
   * @param {string} showId - ID do podcast no Spotify
   * @param {number} limit - Limite de resultados (máx. 50)
   * @param {number} offset - Offset para paginação
   * @returns {Promise<Object>} Lista de episódios
   */
  async getPodcastEpisodes(accessToken, showId, limit = 20, offset = 0) {
    try {
      const response = await axios.get(`${this.baseUrl}/shows/${showId}/episodes`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          limit: Math.min(limit, 50),
          offset
        }
      });

      return response.data;
    } catch (error) {
      console.error('Erro ao obter episódios do podcast:', error.response?.data || error.message);
      throw new Error(`Falha ao obter episódios do podcast: ${error.message}`);
    }
  }

  /**
   * Obtém métricas de um episódio (disponível apenas para proprietários do podcast)
   * @param {string} accessToken - Token de acesso
   * @param {string} episodeId - ID do episódio
   * @returns {Promise<Object>} Métricas do episódio
   */
  async getEpisodeMetrics(accessToken, episodeId) {
    try {
      // Nota: Esta é uma API hipotética, pois a API pública do Spotify não fornece métricas detalhadas
      // Em um cenário real, esta funcionalidade pode exigir a API de Podcasters do Spotify,
      // que tem critérios específicos de acesso
      const response = await axios.get(`${this.baseUrl}/episodes/${episodeId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      // Como não temos acesso às métricas reais, retornaremos informações básicas
      return {
        name: response.data.name,
        duration_ms: response.data.duration_ms,
        release_date: response.data.release_date,
        url: response.data.external_urls.spotify,
        // As métricas abaixo são simuladas
        plays: "Não disponível na API pública",
        listeners: "Não disponível na API pública",
        followers: "Não disponível na API pública"
      };
    } catch (error) {
      console.error('Erro ao obter métricas do episódio:', error.response?.data || error.message);
      throw new Error(`Falha ao obter métricas do episódio: ${error.message}`);
    }
  }

  /**
   * Cria uma playlist no Spotify (útil para compilar episódios)
   * @param {string} accessToken - Token de acesso
   * @param {string} userId - ID do usuário
   * @param {string} name - Nome da playlist
   * @param {string} description - Descrição da playlist
   * @param {boolean} isPublic - Se a playlist é pública
   * @returns {Promise<Object>} Detalhes da playlist criada
   */
  async createPlaylist(accessToken, userId, name, description, isPublic = true) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/users/${userId}/playlists`,
        {
          name,
          description,
          public: isPublic
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
      console.error('Erro ao criar playlist no Spotify:', error.response?.data || error.message);
      throw new Error(`Falha ao criar playlist: ${error.message}`);
    }
  }
}

module.exports = new SpotifyService();