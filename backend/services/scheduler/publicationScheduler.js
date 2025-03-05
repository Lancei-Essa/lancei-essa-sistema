/**
 * Serviço de agendamento de publicações
 * Responsável por verificar periodicamente publicações agendadas e publicá-las nas respectivas plataformas
 */

const Publication = require('../../models/Publication');
const User = require('../../models/User');
const YouTubeToken = require('../../models/YouTubeToken');
const TwitterToken = require('../../models/TwitterToken');
const LinkedInToken = require('../../models/LinkedInToken');
const InstagramToken = require('../../models/InstagramToken');
const SpotifyToken = require('../../models/SpotifyToken');
const TikTokToken = require('../../models/TikTokToken');
const youtubeService = require('../youtube');
const instagramService = require('../platforms/instagram');
const twitterService = require('../platforms/twitter');
const linkedinService = require('../platforms/linkedin');
const spotifyService = require('../platforms/spotify');
const tiktokService = require('../platforms/tiktok');

// Intervalos de verificação (em milissegundos)
const CHECK_INTERVAL = 60000; // 1 minuto
let schedulerActive = false;

/**
 * Inicia o serviço de agendamento
 */
const startScheduler = () => {
  if (schedulerActive) {
    console.log('Scheduler já está em execução');
    return;
  }

  console.log('Iniciando serviço de agendamento de publicações...');
  schedulerActive = true;
  
  // Iniciar verificação periódica
  setInterval(checkScheduledPublications, CHECK_INTERVAL);
  
  // Verificar imediatamente ao iniciar
  checkScheduledPublications();
};

/**
 * Verifica publicações agendadas e publica as que estiverem no momento
 */
const checkScheduledPublications = async () => {
  try {
    console.log('Verificando publicações agendadas...');
    
    // Buscar publicações agendadas que devem ser publicadas agora
    const now = new Date();
    const publications = await Publication.find({
      status: 'scheduled',
      scheduledFor: { $lte: now }
    }).populate('episode');
    
    console.log(`Encontradas ${publications.length} publicações para serem publicadas agora`);
    
    // Publicar cada uma
    for (const publication of publications) {
      try {
        await publishContent(publication);
      } catch (error) {
        console.error(`Erro ao publicar conteúdo: ${publication._id}`, error);
        
        // Atualizar status para falha
        publication.status = 'failed';
        publication.lastError = error.message;
        await publication.save();
      }
    }
  } catch (error) {
    console.error('Erro ao verificar publicações agendadas:', error);
  }
};

/**
 * Publica conteúdo na plataforma específica
 * @param {Publication} publication - Objeto da publicação
 */
const publishContent = async (publication) => {
  console.log(`Publicando conteúdo na plataforma: ${publication.platform}, ID: ${publication._id}`);
  
  // Selecionar o serviço de publicação adequado com base na plataforma
  let result;
  
  switch (publication.platform) {
    case 'youtube':
      result = await publishToYouTube(publication);
      break;
    case 'instagram':
      result = await publishToInstagram(publication);
      break;
    case 'twitter':
      result = await publishToTwitter(publication);
      break;
    case 'linkedin':
      result = await publishToLinkedIn(publication);
      break;
    case 'spotify':
      result = await publishToSpotify(publication);
      break;
    case 'tiktok':
      result = await publishToTikTok(publication);
      break;
    default:
      throw new Error(`Plataforma não suportada: ${publication.platform}`);
  }
  
  // Atualizar publicação com informações de sucesso
  publication.status = 'published';
  publication.publishedAt = new Date();
  publication.platformData = result;
  await publication.save();
  
  console.log(`Publicação ${publication._id} realizada com sucesso na ${publication.platform}`);
  
  return result;
};

/**
 * Publica no YouTube
 * @param {Publication} publication - Objeto da publicação
 */
const publishToYouTube = async (publication) => {
  // Em uma implementação real, precisaríamos:
  // 1. Obter o token do usuário que criou a publicação
  // 2. Configurar as credenciais do YouTube
  // 3. Fazer upload do vídeo ou atualizar um vídeo existente
  
  // Por enquanto, apenas simularemos o processo
  console.log(`Simulando publicação no YouTube para: ${publication._id}`);
  
  // Aguarde 2 segundos para simular processamento
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return {
    videoId: 'youtube-video-id-' + Date.now(),
    url: 'https://youtube.com/watch?v=dummy-id',
    status: 'published'
  };
};

/**
 * Publica no Instagram
 * @param {Publication} publication - Objeto da publicação
 */
const publishToInstagram = async (publication) => {
  // Similar ao YouTube, aqui precisaríamos autenticar e publicar
  console.log(`Simulando publicação no Instagram para: ${publication._id}`);
  
  // Aguarde 2 segundos para simular processamento
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return {
    mediaId: 'instagram-media-id-' + Date.now(),
    url: 'https://instagram.com/p/dummy-id',
    status: 'published'
  };
};

/**
 * Publica no Twitter
 * @param {Publication} publication - Objeto da publicação
 */
const publishToTwitter = async (publication) => {
  console.log(`Publicando no Twitter para: ${publication._id}`);
  
  // Obter o usuário que criou a publicação
  const user = await User.findById(publication.createdBy);
  if (!user) {
    throw new Error('Usuário que criou a publicação não encontrado');
  }
  
  // Obter token do Twitter do usuário
  const twitterToken = await TwitterToken.findOne({ user: user._id });
  if (!twitterToken) {
    throw new Error('Token do Twitter não encontrado para o usuário');
  }
  
  // Verificar se o token expirou
  if (twitterToken.isExpired && twitterToken.isExpired()) {
    throw new Error('Token do Twitter expirou');
  }
  
  // Preparar o conteúdo do tweet
  let tweetText = '';
  if (publication.content && publication.content.title) {
    tweetText += publication.content.title + '\n\n';
  }
  
  if (publication.content && publication.content.description) {
    tweetText += publication.content.description;
  } else if (publication.episode && publication.episode.description) {
    // Usar a descrição do episódio se não houver descrição específica
    tweetText += publication.episode.description;
  }
  
  // Limitar a 280 caracteres (limite do Twitter)
  if (tweetText.length > 280) {
    tweetText = tweetText.substring(0, 277) + '...';
  }
  
  let result;
  
  // Verificar se é uma publicação com mídia
  if (publication.content && publication.content.mediaUrl) {
    // Em um sistema real, baixaríamos o arquivo da URL e faríamos upload para o Twitter
    // Para este exemplo, simularemos o processo
    console.log(`[Simulação] Baixando mídia de: ${publication.content.mediaUrl}`);
    
    // Simulando upload e tweet com mídia
    result = {
      id: 'twitter-' + Date.now(),
      text: tweetText,
      url: `https://twitter.com/${twitterToken.profile.username}/status/dummy-id-${Date.now()}`,
      status: 'published'
    };
  } else {
    // Publicar tweet de texto
    try {
      const tweetResult = await twitterService.tweet(
        twitterToken.oauth_token,
        twitterToken.oauth_token_secret,
        tweetText
      );
      
      result = {
        id: tweetResult.id,
        text: tweetResult.text,
        url: `https://twitter.com/${twitterToken.profile.username}/status/${tweetResult.id}`,
        status: 'published'
      };
    } catch (error) {
      console.error('Erro ao publicar no Twitter:', error);
      throw error;
    }
  }
  
  return result;
};

/**
 * Publica no LinkedIn
 * @param {Publication} publication - Objeto da publicação
 */
const publishToLinkedIn = async (publication) => {
  console.log(`Publicando no LinkedIn para: ${publication._id}`);
  
  // Obter o usuário que criou a publicação
  const user = await User.findById(publication.createdBy);
  if (!user) {
    throw new Error('Usuário que criou a publicação não encontrado');
  }
  
  // Obter token do LinkedIn do usuário
  const linkedinToken = await LinkedInToken.findOne({ user: user._id });
  if (!linkedinToken) {
    throw new Error('Token do LinkedIn não encontrado para o usuário');
  }
  
  // Verificar se o token expirou
  if (linkedinToken.isExpired()) {
    // Tentar renovar o token
    try {
      const newTokens = await linkedinService.refreshToken(linkedinToken.refresh_token);
      linkedinToken.access_token = newTokens.access_token;
      linkedinToken.refresh_token = newTokens.refresh_token || linkedinToken.refresh_token;
      linkedinToken.expiry_date = newTokens.expiry_date;
      linkedinToken.expires_in = newTokens.expires_in;
      await linkedinToken.save();
    } catch (refreshError) {
      console.error('Erro ao renovar token do LinkedIn:', refreshError);
      throw new Error('Token do LinkedIn expirou e não foi possível renová-lo');
    }
  }
  
  // Preparar o conteúdo
  let text = '';
  let title = '';
  
  if (publication.content && publication.content.title) {
    title = publication.content.title;
  } else if (publication.episode && publication.episode.title) {
    title = publication.episode.title;
  }
  
  if (publication.content && publication.content.description) {
    text = publication.content.description;
  } else if (publication.episode && publication.episode.description) {
    text = publication.episode.description;
  }
  
  let result;
  
  // Verificar se é uma publicação com mídia
  if (publication.content && publication.content.mediaUrl) {
    // Em um sistema real, baixaríamos o arquivo da URL e faríamos upload para o LinkedIn
    // Para este exemplo, simularemos o processo para imagem
    if (publication.contentType === 'image') {
      console.log(`[Simulação] Compartilhando imagem: ${publication.content.mediaUrl}`);
      
      // Simulando compartilhamento de imagem
      result = {
        id: 'urn:li:share:' + Date.now(),
        url: `https://www.linkedin.com/feed/update/urn:li:activity:${Date.now()}`,
        status: 'published'
      };
    } else {
      // Para compartilhamento de URL (link)
      try {
        const shareResult = await linkedinService.shareUrl(
          linkedinToken.access_token,
          text,
          publication.content.mediaUrl,
          title,
          text.substring(0, 100) // Descrição curta
        );
        
        result = {
          id: shareResult.id,
          url: shareResult.url,
          status: 'published'
        };
      } catch (error) {
        console.error('Erro ao compartilhar URL no LinkedIn:', error);
        throw error;
      }
    }
  } else {
    // Publicar texto simples
    try {
      const shareResult = await linkedinService.shareText(
        linkedinToken.access_token,
        text
      );
      
      result = {
        id: shareResult.id,
        url: shareResult.url,
        status: 'published'
      };
    } catch (error) {
      console.error('Erro ao publicar no LinkedIn:', error);
      throw error;
    }
  }
  
  return result;
};

/**
 * Publica no Spotify (Observação: Spotify normalmente não permite publicação via API, então este método é mais para obter dados)
 * @param {Publication} publication - Objeto da publicação
 */
const publishToSpotify = async (publication) => {
  console.log(`Interagindo com Spotify para: ${publication._id}`);
  
  // Obter o usuário que criou a publicação
  const user = await User.findById(publication.createdBy);
  if (!user) {
    throw new Error('Usuário que criou a publicação não encontrado');
  }
  
  // Obter token do Spotify do usuário
  const spotifyToken = await SpotifyToken.findOne({ user: user._id });
  if (!spotifyToken) {
    throw new Error('Token do Spotify não encontrado para o usuário');
  }
  
  // Verificar se o token expirou
  if (spotifyToken.isExpired()) {
    // Tentar renovar o token
    try {
      const newTokens = await spotifyService.refreshAccessToken(spotifyToken.refresh_token);
      spotifyToken.access_token = newTokens.access_token;
      spotifyToken.refresh_token = newTokens.refresh_token || spotifyToken.refresh_token;
      spotifyToken.expiry_date = newTokens.expiry_date;
      spotifyToken.expires_in = newTokens.expires_in;
      await spotifyToken.save();
    } catch (refreshError) {
      console.error('Erro ao renovar token do Spotify:', refreshError);
      throw new Error('Token do Spotify expirou e não foi possível renová-lo');
    }
  }
  
  // Para Spotify, tipicamente atualizamos dados ou criamos/atualizamos playlists
  // A API do Spotify não permite upload/publicação direta de episódios de podcast
  
  // Verificar o tipo de conteúdo
  let result;
  
  // Simulação: Se for uma publicação sobre um episódio, obtemos informações sobre ele
  if (publication.content && publication.content.episodeId) {
    console.log(`Obtendo informações do episódio: ${publication.content.episodeId}`);
    
    try {
      // Em um sistema real, obteríamos os detalhes do episódio
      // Como isso não está disponível na API pública de forma direta, simulamos
      result = {
        type: 'episode_info',
        episode_id: publication.content.episodeId,
        status: 'fetched',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erro ao obter informações do episódio no Spotify:', error);
      throw error;
    }
  } 
  // Simulação: Criação de playlist
  else if (publication.contentType === 'playlist') {
    console.log(`Criando/atualizando playlist no Spotify`);
    
    try {
      // Em um sistema real, criaríamos uma playlist
      // Simulando esta operação
      result = {
        type: 'playlist',
        playlist_id: 'spotify:playlist:' + Math.random().toString(36).substring(2, 15),
        name: publication.content?.title || 'Playlist Lancei Essa',
        url: 'https://open.spotify.com/playlist/' + Math.random().toString(36).substring(2, 15),
        status: 'created'
      };
    } catch (error) {
      console.error('Erro ao criar playlist no Spotify:', error);
      throw error;
    }
  } else {
    console.log('Tipo de publicação não suportado para Spotify');
    result = {
      type: 'no_action',
      message: 'Nenhuma ação realizada no Spotify para este tipo de publicação',
      status: 'skipped'
    };
  }
  
  return result;
};

/**
 * Publica no TikTok
 * @param {Publication} publication - Objeto da publicação
 */
const publishToTikTok = async (publication) => {
  console.log(`Publicando no TikTok para: ${publication._id}`);
  
  // Obter o usuário que criou a publicação
  const user = await User.findById(publication.createdBy);
  if (!user) {
    throw new Error('Usuário que criou a publicação não encontrado');
  }
  
  // Obter token do TikTok do usuário
  const tiktokToken = await TikTokToken.findOne({ user: user._id });
  if (!tiktokToken) {
    throw new Error('Token do TikTok não encontrado para o usuário');
  }
  
  // Verificar se o token expirou
  if (tiktokToken.isExpired()) {
    // Tentar renovar o token
    try {
      const newTokens = await tiktokService.refreshAccessToken(tiktokToken.refresh_token);
      tiktokToken.access_token = newTokens.access_token;
      tiktokToken.refresh_token = newTokens.refresh_token || tiktokToken.refresh_token;
      tiktokToken.open_id = newTokens.open_id;
      tiktokToken.expiry_date = newTokens.expiry_date;
      tiktokToken.expires_in = newTokens.expires_in;
      await tiktokToken.save();
    } catch (refreshError) {
      console.error('Erro ao renovar token do TikTok:', refreshError);
      throw new Error('Token do TikTok expirou e não foi possível renová-lo');
    }
  }
  
  // Para o TikTok, precisamos de um vídeo
  if (publication.contentType !== 'video' && publication.contentType !== 'clip') {
    throw new Error('Apenas vídeos podem ser publicados no TikTok');
  }
  
  if (!publication.content || !publication.content.mediaUrl) {
    throw new Error('URL de mídia não fornecida para publicação no TikTok');
  }
  
  console.log(`Publicando vídeo no TikTok: ${publication.content.mediaUrl}`);
  
  // Em um sistema real, baixaríamos o vídeo e faríamos upload para o TikTok
  // Para este exemplo, simulamos o processo
  
  // Extrair informações para o vídeo
  let title = '';
  let description = '';
  let hashtags = [];
  
  if (publication.content.title) {
    title = publication.content.title;
  } else if (publication.episode && publication.episode.title) {
    title = publication.episode.title;
  }
  
  if (publication.content.description) {
    description = publication.content.description;
  } else if (publication.episode && publication.episode.description) {
    description = publication.episode.description;
  }
  
  // Adicionar hashtags padrão se não houver
  if (publication.content.hashtags) {
    hashtags = publication.content.hashtags.split(',').map(tag => tag.trim());
  } else {
    hashtags = ['LanceiEssa', 'Podcast', 'Empreendedorismo'];
  }
  
  // Simular upload e publicação
  let result = {
    video_id: 'tiktok-' + Date.now(),
    share_id: 'share-' + Date.now(),
    create_time: new Date().toISOString(),
    video_status: 'published',
    url: `https://www.tiktok.com/@username/video/${Date.now()}`
  };
  
  return result;
};

/**
 * Para publicações de teste, sem afetar o banco de dados
 * @param {Object} publicationData - Dados da publicação
 */
const testPublish = async (publicationData) => {
  const platform = publicationData.platform;
  
  console.log(`Teste de publicação na plataforma: ${platform}`);
  
  let result;
  switch (platform) {
    case 'youtube':
      result = await publishToYouTube(publicationData);
      break;
    case 'instagram':
      result = await publishToInstagram(publicationData);
      break;
    case 'twitter':
      result = await publishToTwitter(publicationData);
      break;
    case 'linkedin':
      result = await publishToLinkedIn(publicationData);
      break;
    case 'spotify':
      result = await publishToSpotify(publicationData);
      break;
    case 'tiktok':
      result = await publishToTikTok(publicationData);
      break;
    default:
      throw new Error(`Plataforma não suportada para teste: ${platform}`);
  }
  
  return {
    success: true,
    message: `Teste de publicação na ${platform} realizado com sucesso`,
    result
  };
};

module.exports = {
  startScheduler,
  checkScheduledPublications,
  publishContent,
  testPublish
};