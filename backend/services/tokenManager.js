/**
 * Serviço centralizado para gerenciamento de tokens de autenticação
 * Fornece funções padronizadas para manipulação de tokens
 */

const TokenModels = {
  youtube: require('../models/YouTubeToken'),
  instagram: require('../models/InstagramToken'),
  twitter: require('../models/TwitterToken'),
  linkedin: require('../models/LinkedInToken'),
  spotify: require('../models/SpotifyToken'),
  tiktok: require('../models/TikTokToken')
};

// Serviços de plataforma
const services = {
  youtube: require('./youtube'),
  instagram: require('./platforms/instagram'),
  twitter: require('./platforms/twitter'),
  linkedin: require('./platforms/linkedin'),
  spotify: require('./platforms/spotify'),
  tiktok: require('./platforms/tiktok')
};

/**
 * Obtém um token armazenado para um usuário e plataforma
 * @param {string} platform - A plataforma (youtube, twitter, etc.)
 * @param {string} userId - ID do usuário
 * @param {boolean} includeSecret - Se deve incluir campos secretos (select: false)
 * @returns {Promise<Object>} Documento do token
 */
exports.getToken = async (platform, userId, includeSecret = false) => {
  try {
    if (!TokenModels[platform]) {
      throw new Error(`Plataforma não suportada: ${platform}`);
    }

    const query = TokenModels[platform].findOne({ user: userId });
    
    if (includeSecret) {
      // Para cada plataforma, adicionar campos secretos específicos
      switch (platform) {
        case 'youtube':
        case 'instagram':
        case 'linkedin':
        case 'spotify':
        case 'tiktok':
          query.select('+access_token +refresh_token');
          break;
        case 'twitter':
          query.select('+access_token +refresh_token +oauth_token +oauth_token_secret');
          break;
      }
    }

    const token = await query.exec();
    return token;
  } catch (error) {
    console.error(`Erro ao obter token de ${platform}:`, error);
    throw error;
  }
};

/**
 * Verifica se um token está expirado e tenta renová-lo se necessário
 * @param {string} platform - A plataforma (youtube, twitter, etc.)
 * @param {Object} token - Documento do token
 * @returns {Promise<Object>} Resultado da verificação com tokens atualizados
 */
exports.verifyAndRefreshToken = async (platform, token) => {
  try {
    // Verificar se o token existe
    if (!token) {
      return { success: false, connected: false, status: 'missing' };
    }

    // Verificar se o token expirou
    let expired = false;
    
    if (token.isExpired) {
      expired = token.isExpired();
    } else if (token.expiry_date) {
      expired = token.expiry_date <= Date.now();
    }

    // Se não expirou, apenas atualize o último uso e retorne
    if (!expired) {
      token.last_used = Date.now();
      await token.save();
      
      return { 
        success: true, 
        connected: true, 
        status: 'active',
        token,
        profile: token.profile
      };
    }

    // Se expirou, tente renovar (se suportado pela plataforma)
    if (expired && (token.refresh_token || platform === 'twitter' && token.token_type === 'oauth1')) {
      try {
        // Obter token com campos secretos
        const tokenWithSecrets = await exports.getToken(platform, token.user, true);
        
        if (!tokenWithSecrets) {
          return { success: true, connected: false, status: 'missing' };
        }

        // Renovar token - especificidades por plataforma
        let refreshedTokens;
        let decryptedTokens;
        
        if (tokenWithSecrets.getDecryptedTokens) {
          decryptedTokens = tokenWithSecrets.getDecryptedTokens();
        }

        switch (platform) {
          case 'youtube':
            refreshedTokens = await services.youtube.refreshAccessToken(decryptedTokens.refresh_token);
            break;
          case 'instagram':
            refreshedTokens = await services.instagram.refreshToken(
              decryptedTokens.refresh_token,
              process.env.INSTAGRAM_CLIENT_ID,
              process.env.INSTAGRAM_CLIENT_SECRET
            );
            break;
          case 'twitter':
            // Twitter OAuth 1.0a não precisa ser renovado
            if (token.token_type === 'oauth1') {
              return { 
                success: true, 
                connected: true, 
                status: 'active',
                token: tokenWithSecrets
              };
            }
            
            refreshedTokens = await services.twitter.refreshToken(
              decryptedTokens.refresh_token,
              process.env.TWITTER_API_KEY,
              process.env.TWITTER_API_SECRET
            );
            break;
          case 'linkedin':
            refreshedTokens = await services.linkedin.refreshToken(
              decryptedTokens.refresh_token,
              process.env.LINKEDIN_CLIENT_ID,
              process.env.LINKEDIN_CLIENT_SECRET
            );
            break;
          case 'spotify':
            refreshedTokens = await services.spotify.refreshToken(
              decryptedTokens.refresh_token,
              process.env.SPOTIFY_CLIENT_ID,
              process.env.SPOTIFY_CLIENT_SECRET
            );
            break;
          case 'tiktok':
            refreshedTokens = await services.tiktok.refreshToken(
              decryptedTokens.refresh_token,
              process.env.TIKTOK_CLIENT_KEY,
              process.env.TIKTOK_CLIENT_SECRET
            );
            break;
        }

        // Verificar se a renovação foi bem-sucedida
        if (!refreshedTokens || !refreshedTokens.success) {
          tokenWithSecrets.status = 'expired';
          await tokenWithSecrets.save();
          
          return {
            success: true,
            connected: false,
            expired: true,
            status: 'refresh_failed',
            error: refreshedTokens?.error || 'Falha ao renovar token'
          };
        }

        // Atualizar token no banco de dados
        const expiryDate = new Date();
        expiryDate.setSeconds(expiryDate.getSeconds() + (refreshedTokens.expires_in || 3600));
        
        tokenWithSecrets.access_token = refreshedTokens.access_token;
        
        if (refreshedTokens.refresh_token) {
          tokenWithSecrets.refresh_token = refreshedTokens.refresh_token;
        }
        
        tokenWithSecrets.expires_in = refreshedTokens.expires_in || 3600;
        tokenWithSecrets.expiry_date = expiryDate;
        tokenWithSecrets.status = 'active';
        tokenWithSecrets.last_refreshed = Date.now();
        tokenWithSecrets.last_used = Date.now();
        
        await tokenWithSecrets.save();
        
        return {
          success: true,
          connected: true,
          status: 'refreshed',
          token: tokenWithSecrets,
          profile: tokenWithSecrets.profile
        };
      } catch (refreshError) {
        console.error(`Erro ao renovar token de ${platform}:`, refreshError);
        return {
          success: true,
          connected: false,
          expired: true,
          status: 'refresh_failed',
          error: refreshError.message
        };
      }
    }

    // Token expirado e não foi possível renovar
    return {
      success: true,
      connected: false,
      expired: true,
      status: 'expired',
      token
    };
  } catch (error) {
    console.error(`Erro ao verificar token de ${platform}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Verifica o status de conexão para todas as plataformas de um usuário
 * @param {string} userId - ID do usuário
 * @returns {Promise<Object>} Status de todas as conexões
 */
exports.checkAllConnections = async (userId) => {
  try {
    const platforms = ['youtube', 'instagram', 'twitter', 'linkedin', 'spotify', 'tiktok'];
    const connections = {};
    
    // Verificar cada plataforma em paralelo
    const connectionPromises = platforms.map(async (platform) => {
      try {
        const token = await exports.getToken(platform, userId);
        
        if (!token) {
          connections[platform] = { connected: false };
          return;
        }
        
        // Verificar o status do token
        const verificationResult = await exports.verifyAndRefreshToken(platform, token);
        
        // Adicionar ao resultado
        connections[platform] = {
          connected: verificationResult.connected,
          expired: verificationResult.expired || false,
          status: verificationResult.status,
          profile: token.profile,
          lastUsed: token.last_used,
          lastRefreshed: token.last_refreshed
        };
      } catch (error) {
        console.error(`Erro ao verificar conexão com ${platform}:`, error);
        connections[platform] = { 
          connected: false,
          error: error.message
        };
      }
    });
    
    // Aguardar todas as verificações
    await Promise.all(connectionPromises);
    
    return connections;
  } catch (error) {
    console.error('Erro ao verificar conexões:', error);
    throw error;
  }
};

/**
 * Revogar e remover um token
 * @param {string} platform - A plataforma (youtube, twitter, etc.)
 * @param {string} userId - ID do usuário
 * @returns {Promise<Object>} Resultado da operação
 */
exports.revokeToken = async (platform, userId) => {
  try {
    // Buscar token com campos secretos
    const token = await exports.getToken(platform, userId, true);
    
    if (!token) {
      return { success: true, message: 'Nenhum token encontrado para revogar' };
    }
    
    // Tentar revogar o token na plataforma
    try {
      let decryptedTokens;
      if (token.getDecryptedTokens) {
        decryptedTokens = token.getDecryptedTokens();
      }
      
      switch (platform) {
        case 'youtube':
          // Não há endpoint padrão para revogar token no YouTube
          break;
        case 'instagram':
          await services.instagram.revokeToken(
            decryptedTokens.access_token,
            process.env.INSTAGRAM_CLIENT_ID,
            process.env.INSTAGRAM_CLIENT_SECRET
          );
          break;
        case 'twitter':
          if (token.token_type === 'oauth2') {
            await services.twitter.revokeToken(
              decryptedTokens.access_token,
              process.env.TWITTER_API_KEY,
              process.env.TWITTER_API_SECRET
            );
          }
          break;
        case 'linkedin':
          await services.linkedin.revokeToken(
            decryptedTokens.access_token,
            process.env.LINKEDIN_CLIENT_ID,
            process.env.LINKEDIN_CLIENT_SECRET
          );
          break;
        case 'spotify':
          // Spotify não tem endpoint padrão para revogar token
          break;
        case 'tiktok':
          await services.tiktok.revokeToken(
            decryptedTokens.access_token,
            process.env.TIKTOK_CLIENT_KEY,
            process.env.TIKTOK_CLIENT_SECRET
          );
          break;
      }
    } catch (revokeError) {
      console.warn(`Erro ao revogar token do ${platform}:`, revokeError);
      // Continuamos mesmo que a revogação falhe
    }
    
    // Remover token do banco de dados
    await TokenModels[platform].findByIdAndDelete(token._id);
    
    return { 
      success: true, 
      message: `Token do ${platform} revogado com sucesso` 
    };
  } catch (error) {
    console.error(`Erro ao revogar token do ${platform}:`, error);
    return {
      success: false,
      message: `Erro ao revogar token do ${platform}`,
      error: error.message
    };
  }
};

/**
 * Salvar token novo ou atualizado para uma plataforma
 * @param {string} platform - A plataforma (youtube, twitter, etc.)
 * @param {string} userId - ID do usuário
 * @param {Object} tokenData - Dados do token a serem salvos
 * @param {Object} profileData - Dados de perfil do usuário na plataforma
 * @returns {Promise<Object>} Token salvo
 */
exports.saveToken = async (platform, userId, tokenData, profileData = null) => {
  try {
    if (!TokenModels[platform]) {
      throw new Error(`Plataforma não suportada: ${platform}`);
    }
    
    // Buscar token existente
    let tokenDoc = await exports.getToken(platform, userId);
    
    // Calcular data de expiração
    const expiryDate = new Date();
    expiryDate.setSeconds(expiryDate.getSeconds() + (tokenData.expires_in || 3600));
    
    // Se token já existe, atualizar
    if (tokenDoc) {
      // Campos comuns para OAuth 2.0
      if (tokenData.access_token) {
        tokenDoc.access_token = tokenData.access_token;
      }
      
      if (tokenData.refresh_token) {
        tokenDoc.refresh_token = tokenData.refresh_token;
      }
      
      // OAuth 1.0a (Twitter)
      if (platform === 'twitter' && tokenData.oauth_token) {
        tokenDoc.oauth_token = tokenData.oauth_token;
        tokenDoc.oauth_token_secret = tokenData.oauth_token_secret;
        tokenDoc.token_type = 'oauth1';
      } else if (tokenData.token_type) {
        tokenDoc.token_type = tokenData.token_type;
      }
      
      // Propriedades comuns
      tokenDoc.expires_in = tokenData.expires_in || 3600;
      tokenDoc.expiry_date = expiryDate;
      tokenDoc.scope = tokenData.scope || tokenDoc.scope;
      tokenDoc.status = 'active';
      tokenDoc.last_refreshed = Date.now();
      
      // Atualizar perfil se fornecido
      if (profileData) {
        tokenDoc.profile = { ...tokenDoc.profile, ...profileData };
      }
    } else {
      // Criar novo documento de token
      const tokenParams = {
        user: userId,
        status: 'active',
        last_refreshed: Date.now(),
        last_used: Date.now()
      };
      
      // Campos comuns para OAuth 2.0
      if (tokenData.access_token) {
        tokenParams.access_token = tokenData.access_token;
      }
      
      if (tokenData.refresh_token) {
        tokenParams.refresh_token = tokenData.refresh_token;
      }
      
      // Campos específicos para cada plataforma
      switch (platform) {
        case 'twitter':
          if (tokenData.oauth_token) {
            tokenParams.oauth_token = tokenData.oauth_token;
            tokenParams.oauth_token_secret = tokenData.oauth_token_secret;
            tokenParams.token_type = 'oauth1';
          } else {
            tokenParams.token_type = 'oauth2';
          }
          break;
        case 'tiktok':
          tokenParams.open_id = tokenData.open_id;
          break;
      }
      
      // Propriedades comuns
      tokenParams.expires_in = tokenData.expires_in || 3600;
      tokenParams.expiry_date = expiryDate;
      tokenParams.scope = tokenData.scope;
      
      // Adicionar perfil se fornecido
      if (profileData) {
        tokenParams.profile = profileData;
      }
      
      tokenDoc = new TokenModels[platform](tokenParams);
    }
    
    // Salvar no banco de dados
    await tokenDoc.save();
    
    return tokenDoc;
  } catch (error) {
    console.error(`Erro ao salvar token de ${platform}:`, error);
    throw error;
  }
};