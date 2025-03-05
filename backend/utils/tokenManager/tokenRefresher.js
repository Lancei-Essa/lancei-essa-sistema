/**
 * Serviço para renovação automática de tokens de API
 * 
 * Este módulo gerencia a renovação de tokens de acesso usando refresh tokens
 * para evitar expiração e garantir a continuidade das operações.
 */

const tokenCache = require('./tokenCache');

// Importar serviços de autenticação de cada plataforma
const youtubeService = require('../../services/youtube');
const twitterService = require('../../services/platforms/twitter');
const linkedinService = require('../../services/platforms/linkedin');
const instagramService = require('../../services/platforms/instagram');
const spotifyService = require('../../services/platforms/spotify');
const tiktokService = require('../../services/platforms/tiktok');

// Importar modelos de tokens
const YouTubeToken = require('../../models/YouTubeToken');
const TwitterToken = require('../../models/TwitterToken');
const LinkedInToken = require('../../models/LinkedInToken');
const InstagramToken = require('../../models/InstagramToken');
const SpotifyToken = require('../../models/SpotifyToken');
const TikTokToken = require('../../models/TikTokToken');
const User = require('../../models/User');

// Configurações
const TWITTER_API_KEY = process.env.TWITTER_API_KEY;
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET;
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const INSTAGRAM_CLIENT_ID = process.env.INSTAGRAM_CLIENT_ID;
const INSTAGRAM_CLIENT_SECRET = process.env.INSTAGRAM_CLIENT_SECRET;
const YOUTUBE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const YOUTUBE_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;

/**
 * Verifica e renova tokens quando necessário
 * @param {string} userId - ID do usuário 
 * @param {string} platform - Nome da plataforma
 * @returns {Promise<Object>} Token atualizado
 */
const ensureFreshToken = async (userId, platform) => {
  // Verificar se o token está em cache e não está expirado
  if (!tokenCache.isTokenExpired(userId, platform)) {
    return tokenCache.getToken(userId, platform);
  }
  
  // Se expirado ou não existir, buscar do banco de dados e renovar
  let token;
  let refreshedToken;

  switch (platform) {
    case 'youtube':
      token = await YouTubeToken.findOne({ user: userId }).select('+refresh_token');
      if (!token) {
        throw new Error('Token do YouTube não encontrado para este usuário');
      }
      
      // Verificar se o token já expirou
      if (token.isExpired()) {
        // Obter o token descriptografado
        const decryptedTokens = token.getDecryptedTokens();
        
        // Renovar o token usando o refresh token
        const response = await youtubeService.refreshToken(
          decryptedTokens.refresh_token,
          YOUTUBE_CLIENT_ID,
          YOUTUBE_CLIENT_SECRET
        );
        
        if (!response.success) {
          throw new Error(`Falha ao renovar token: ${response.error}`);
        }
        
        // Atualizar no banco de dados
        const expiryDate = new Date();
        expiryDate.setSeconds(expiryDate.getSeconds() + response.expires_in);
        
        token.access_token = response.access_token;
        token.refresh_token = response.refresh_token || decryptedTokens.refresh_token;
        token.expiry_date = expiryDate;
        token.is_valid = true;
        token.last_refreshed = new Date();
        
        await token.save();
        
        // Atualizar status de conexão no usuário
        await User.findByIdAndUpdate(userId, {
          'socialConnections.youtube.lastConnected': new Date()
        });
      }
      
      // Atualizar cache
      const decryptedTokens = token.getDecryptedTokens();
      return tokenCache.setToken(userId, platform, {
        accessToken: decryptedTokens.access_token,
        refreshToken: decryptedTokens.refresh_token,
        expiryDate: token.expiry_date
      });
    
    case 'twitter':
      token = await TwitterToken.findOne({ user: userId, token_type: 'oauth2' }).select('+refresh_token');
      if (!token) {
        throw new Error('Token do Twitter não encontrado para este usuário');
      }
      
      // Verificar se o token já expirou e se tem refresh token
      if (token.isExpired() && token.refresh_token) {
        // Renovar o token usando o refresh token
        const response = await twitterService.refreshToken(
          token.refresh_token,
          TWITTER_API_KEY,
          TWITTER_API_SECRET
        );
        
        if (!response.success) {
          throw new Error(`Falha ao renovar token: ${response.error}`);
        }
        
        // Atualizar no banco de dados
        const expiryDate = new Date();
        expiryDate.setSeconds(expiryDate.getSeconds() + response.expires_in);
        
        token.access_token = response.access_token;
        token.refresh_token = response.refresh_token || token.refresh_token;
        token.expires_in = response.expires_in;
        token.expiry_date = expiryDate;
        token.status = 'active';
        token.updatedAt = new Date();
        
        await token.save();
        
        // Atualizar status de conexão no usuário
        await User.findByIdAndUpdate(userId, {
          'socialConnections.twitter.lastConnected': new Date()
        });
      }
      
      // Atualizar cache
      return tokenCache.setToken(userId, platform, {
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiryDate: token.expiry_date,
        tokenType: token.token_type
      });
      
    case 'linkedin':
      token = await LinkedInToken.findOne({ user: userId }).select('+refresh_token');
      if (!token) {
        throw new Error('Token do LinkedIn não encontrado para este usuário');
      }
      
      // Verificar se o token já expirou e se tem refresh token
      if (token.isExpired() && token.refresh_token) {
        // Renovar o token usando o refresh token
        const response = await linkedinService.refreshToken(
          token.refresh_token,
          LINKEDIN_CLIENT_ID,
          LINKEDIN_CLIENT_SECRET
        );
        
        if (!response.success) {
          throw new Error(`Falha ao renovar token: ${response.error}`);
        }
        
        // Atualizar no banco de dados
        const expiryDate = new Date();
        expiryDate.setSeconds(expiryDate.getSeconds() + response.expires_in);
        
        token.access_token = response.access_token;
        token.refresh_token = response.refresh_token || token.refresh_token;
        token.expires_in = response.expires_in;
        token.expiry_date = expiryDate;
        token.status = 'active';
        token.updatedAt = new Date();
        
        await token.save();
        
        // Atualizar status de conexão no usuário
        await User.findByIdAndUpdate(userId, {
          'socialConnections.linkedin.lastConnected': new Date()
        });
      }
      
      // Atualizar cache
      return tokenCache.setToken(userId, platform, {
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiryDate: token.expiry_date
      });
    
    case 'instagram':
      token = await InstagramToken.findOne({ user: userId }).select('+refresh_token');
      if (!token) {
        throw new Error('Token do Instagram não encontrado para este usuário');
      }
      
      // Verificar se o token já expirou e se tem refresh token
      if (token.isExpired() && token.refresh_token) {
        // Renovar o token usando o refresh token
        const response = await instagramService.refreshToken(
          token.refresh_token,
          INSTAGRAM_CLIENT_ID,
          INSTAGRAM_CLIENT_SECRET
        );
        
        if (!response.success) {
          throw new Error(`Falha ao renovar token: ${response.error}`);
        }
        
        // Atualizar no banco de dados
        const expiryDate = new Date();
        expiryDate.setSeconds(expiryDate.getSeconds() + response.expires_in);
        
        token.access_token = response.access_token;
        token.refresh_token = response.refresh_token || token.refresh_token;
        token.expires_in = response.expires_in;
        token.expiry_date = expiryDate;
        token.status = 'active';
        token.updatedAt = new Date();
        
        await token.save();
        
        // Atualizar status de conexão no usuário
        await User.findByIdAndUpdate(userId, {
          'socialConnections.instagram.lastConnected': new Date()
        });
      }
      
      // Atualizar cache
      return tokenCache.setToken(userId, platform, {
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiryDate: token.expiry_date
      });
    
    case 'spotify':
      token = await SpotifyToken.findOne({ user: userId }).select('+refresh_token');
      if (!token) {
        throw new Error('Token do Spotify não encontrado para este usuário');
      }
      
      // Verificar se o token já expirou e se tem refresh token
      if (token.isExpired() && token.refresh_token) {
        // Renovar o token usando o refresh token
        const response = await spotifyService.refreshToken(
          token.refresh_token,
          SPOTIFY_CLIENT_ID,
          SPOTIFY_CLIENT_SECRET
        );
        
        if (!response.success) {
          throw new Error(`Falha ao renovar token: ${response.error}`);
        }
        
        // Atualizar no banco de dados
        const expiryDate = new Date();
        expiryDate.setSeconds(expiryDate.getSeconds() + response.expires_in);
        
        token.access_token = response.access_token;
        token.refresh_token = response.refresh_token || token.refresh_token;
        token.expires_in = response.expires_in;
        token.expiry_date = expiryDate;
        token.status = 'active';
        token.updatedAt = new Date();
        
        await token.save();
        
        // Atualizar status de conexão no usuário
        await User.findByIdAndUpdate(userId, {
          'socialConnections.spotify.lastConnected': new Date()
        });
      }
      
      // Atualizar cache
      return tokenCache.setToken(userId, platform, {
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiryDate: token.expiry_date
      });
    
    case 'tiktok':
      token = await TikTokToken.findOne({ user: userId }).select('+refresh_token');
      if (!token) {
        throw new Error('Token do TikTok não encontrado para este usuário');
      }
      
      // Verificar se o token já expirou e se tem refresh token
      if (token.isExpired() && token.refresh_token) {
        // Renovar o token usando o refresh token
        const response = await tiktokService.refreshToken(
          token.refresh_token,
          TIKTOK_CLIENT_KEY,
          TIKTOK_CLIENT_SECRET
        );
        
        if (!response.success) {
          throw new Error(`Falha ao renovar token: ${response.error}`);
        }
        
        // Atualizar no banco de dados
        const expiryDate = new Date();
        expiryDate.setSeconds(expiryDate.getSeconds() + response.expires_in);
        
        token.access_token = response.access_token;
        token.refresh_token = response.refresh_token || token.refresh_token;
        token.open_id = response.open_id || token.open_id;
        token.expires_in = response.expires_in;
        token.expiry_date = expiryDate;
        token.status = 'active';
        token.updatedAt = new Date();
        
        await token.save();
        
        // Atualizar status de conexão no usuário
        await User.findByIdAndUpdate(userId, {
          'socialConnections.tiktok.lastConnected': new Date()
        });
      }
      
      // Atualizar cache
      return tokenCache.setToken(userId, platform, {
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiryDate: token.expiry_date,
        openId: token.open_id
      });
      
    default:
      throw new Error(`Plataforma não suportada: ${platform}`);
  }
};

/**
 * Inicializa o sistema de tokens para um usuário
 * Carrega todos os tokens disponíveis para o cache
 * @param {string} userId - ID do usuário
 */
const initUserTokens = async (userId) => {
  try {
    // Carregar tokens do YouTube
    const youtubeToken = await YouTubeToken.findOne({ user: userId });
    if (youtubeToken) {
      const decryptedTokens = youtubeToken.getDecryptedTokens();
      tokenCache.setToken(userId, 'youtube', {
        accessToken: decryptedTokens.access_token,
        refreshToken: decryptedTokens.refresh_token,
        expiryDate: youtubeToken.expiry_date
      });
    }
    
    // Carregar tokens do Twitter
    const twitterToken = await TwitterToken.findOne({ user: userId });
    if (twitterToken) {
      tokenCache.setToken(userId, 'twitter', {
        accessToken: twitterToken.token_type === 'oauth2' ? twitterToken.access_token : twitterToken.oauth_token,
        refreshToken: twitterToken.refresh_token,
        tokenType: twitterToken.token_type,
        expiryDate: twitterToken.expiry_date
      });
    }
    
    // Carregar tokens do LinkedIn
    const linkedinToken = await LinkedInToken.findOne({ user: userId });
    if (linkedinToken) {
      tokenCache.setToken(userId, 'linkedin', {
        accessToken: linkedinToken.access_token,
        refreshToken: linkedinToken.refresh_token,
        expiryDate: linkedinToken.expiry_date
      });
    }
    
    // Carregar tokens do Instagram
    const instagramToken = await InstagramToken.findOne({ user: userId });
    if (instagramToken) {
      tokenCache.setToken(userId, 'instagram', {
        accessToken: instagramToken.access_token,
        refreshToken: instagramToken.refresh_token,
        expiryDate: instagramToken.expiry_date
      });
    }
    
    // Carregar tokens do Spotify
    const spotifyToken = await SpotifyToken.findOne({ user: userId });
    if (spotifyToken) {
      tokenCache.setToken(userId, 'spotify', {
        accessToken: spotifyToken.access_token,
        refreshToken: spotifyToken.refresh_token,
        expiryDate: spotifyToken.expiry_date
      });
    }
    
    // Carregar tokens do TikTok
    const tiktokToken = await TikTokToken.findOne({ user: userId });
    if (tiktokToken) {
      tokenCache.setToken(userId, 'tiktok', {
        accessToken: tiktokToken.access_token,
        refreshToken: tiktokToken.refresh_token,
        expiryDate: tiktokToken.expiry_date,
        openId: tiktokToken.open_id
      });
    }
    
    return {
      success: true,
      platforms: tokenCache.getToken(userId) ? Object.keys(tokenCache.getToken(userId)) : []
    };
  } catch (error) {
    console.error('Erro ao inicializar tokens do usuário:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Programa tarefa para verificar e renovar tokens periodicamente
 * @param {number} interval - Intervalo em milissegundos
 */
const scheduleTokenRefresh = (interval = 60 * 60 * 1000) => { // 1 hora padrão
  const refreshAllTokens = async () => {
    try {
      console.log('Iniciando renovação periódica de tokens...');
      
      // Buscar todos os tokens no banco que expiram nas próximas 2 horas
      const twoHoursFromNow = new Date(Date.now() + (2 * 60 * 60 * 1000));
      
      // YouTube tokens
      const youtubeTokens = await YouTubeToken.find({
        expiry_date: { $lte: twoHoursFromNow },
        is_valid: true
      }).select('+refresh_token');
      
      console.log(`Encontrados ${youtubeTokens.length} tokens do YouTube para renovar`);
      
      // Renovar cada token
      for (const token of youtubeTokens) {
        try {
          await ensureFreshToken(token.user, 'youtube');
          console.log(`Token YouTube renovado para usuário ${token.user}`);
        } catch (error) {
          console.error(`Erro ao renovar token do YouTube para usuário ${token.user}:`, error);
        }
      }
      
      // Twitter tokens (OAuth 2.0)
      const twitterTokens = await TwitterToken.find({
        token_type: 'oauth2',
        refresh_token: { $exists: true, $ne: null },
        expiry_date: { $lte: twoHoursFromNow },
        status: 'active'
      }).select('+refresh_token');
      
      console.log(`Encontrados ${twitterTokens.length} tokens do Twitter para renovar`);
      
      // Renovar cada token
      for (const token of twitterTokens) {
        try {
          await ensureFreshToken(token.user, 'twitter');
          console.log(`Token Twitter renovado para usuário ${token.user}`);
        } catch (error) {
          console.error(`Erro ao renovar token do Twitter para usuário ${token.user}:`, error);
        }
      }
      
      // LinkedIn tokens
      const linkedinTokens = await LinkedInToken.find({
        refresh_token: { $exists: true, $ne: null },
        expiry_date: { $lte: twoHoursFromNow },
        status: 'active'
      }).select('+refresh_token');
      
      console.log(`Encontrados ${linkedinTokens.length} tokens do LinkedIn para renovar`);
      
      // Renovar cada token
      for (const token of linkedinTokens) {
        try {
          await ensureFreshToken(token.user, 'linkedin');
          console.log(`Token LinkedIn renovado para usuário ${token.user}`);
        } catch (error) {
          console.error(`Erro ao renovar token do LinkedIn para usuário ${token.user}:`, error);
        }
      }
      
      // Instagram tokens
      const instagramTokens = await InstagramToken.find({
        refresh_token: { $exists: true, $ne: null },
        expiry_date: { $lte: twoHoursFromNow },
        status: 'active'
      }).select('+refresh_token');
      
      console.log(`Encontrados ${instagramTokens.length} tokens do Instagram para renovar`);
      
      // Renovar cada token
      for (const token of instagramTokens) {
        try {
          await ensureFreshToken(token.user, 'instagram');
          console.log(`Token Instagram renovado para usuário ${token.user}`);
        } catch (error) {
          console.error(`Erro ao renovar token do Instagram para usuário ${token.user}:`, error);
        }
      }
      
      // Spotify tokens
      const spotifyTokens = await SpotifyToken.find({
        refresh_token: { $exists: true, $ne: null },
        expiry_date: { $lte: twoHoursFromNow },
        status: 'active'
      }).select('+refresh_token');
      
      console.log(`Encontrados ${spotifyTokens.length} tokens do Spotify para renovar`);
      
      // Renovar cada token
      for (const token of spotifyTokens) {
        try {
          await ensureFreshToken(token.user, 'spotify');
          console.log(`Token Spotify renovado para usuário ${token.user}`);
        } catch (error) {
          console.error(`Erro ao renovar token do Spotify para usuário ${token.user}:`, error);
        }
      }
      
      // TikTok tokens
      const tiktokTokens = await TikTokToken.find({
        refresh_token: { $exists: true, $ne: null },
        expiry_date: { $lte: twoHoursFromNow },
        status: 'active'
      }).select('+refresh_token');
      
      console.log(`Encontrados ${tiktokTokens.length} tokens do TikTok para renovar`);
      
      // Renovar cada token
      for (const token of tiktokTokens) {
        try {
          await ensureFreshToken(token.user, 'tiktok');
          console.log(`Token TikTok renovado para usuário ${token.user}`);
        } catch (error) {
          console.error(`Erro ao renovar token do TikTok para usuário ${token.user}:`, error);
        }
      }
      
    } catch (error) {
      console.error('Erro ao renovar tokens:', error);
    }
  };
  
  // Executar imediatamente na inicialização
  refreshAllTokens();
  
  // Programar execução periódica
  setInterval(refreshAllTokens, interval);
  
  console.log(`Sistema de renovação de tokens iniciado. Intervalo: ${interval/1000/60} minutos`);
};

module.exports = {
  ensureFreshToken,
  initUserTokens,
  scheduleTokenRefresh
};