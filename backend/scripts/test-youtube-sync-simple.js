// Script simplificado para testar a API do YouTube
// Path: /Users/rogerioresende/Desktop/lancei-essa-sistema/backend/scripts/test-youtube-sync-simple.js

// Carregar variáveis de ambiente
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { google } = require('googleapis');
const readline = require('readline');

// Configuração de interface de terminal
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Verificar variáveis de ambiente
console.log('\n=== VERIFICANDO CONFIGURAÇÃO DO YOUTUBE ===\n');
console.log('API_KEY:', process.env.YOUTUBE_API_KEY ? '✓ Configurado' : '✗ Não configurado');

async function testYouTubeAPI() {
  try {
    console.log('\n=== TESTANDO API DO YOUTUBE SEM AUTENTICAÇÃO ===');
    
    // Criar cliente YouTube com API_KEY
    const youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY
    });
    
    // Teste 1: Buscar vídeos populares
    console.log('\nBuscando vídeos populares...');
    const popularVideos = await youtube.videos.list({
      part: 'snippet,statistics',
      chart: 'mostPopular',
      regionCode: 'BR',
      maxResults: 5
    });
    
    console.log(`✓ Sucesso! Encontrados ${popularVideos.data.items.length} vídeos populares.`);
    console.log('\nPrimeiros 3 vídeos populares:');
    
    popularVideos.data.items.slice(0, 3).forEach((video, index) => {
      console.log(`\n[${index + 1}] "${video.snippet.title}"`);
      console.log(`  Canal: ${video.snippet.channelTitle}`);
      console.log(`  Visualizações: ${video.statistics.viewCount}`);
      console.log(`  Likes: ${video.statistics.likeCount}`);
    });
    
    // Teste 2: Buscar canais por palavra-chave
    console.log('\n\nBuscando canais...');
    const searchQuery = await promptUser('\nDigite uma palavra-chave para buscar canais (ex: podcast): ');
    
    const channelSearch = await youtube.search.list({
      part: 'snippet',
      q: searchQuery,
      type: 'channel',
      maxResults: 5
    });
    
    console.log(`\n✓ Sucesso! Encontrados ${channelSearch.data.items.length} canais relacionados a "${searchQuery}".`);
    console.log('\nPrimeiros 3 canais:');
    
    channelSearch.data.items.slice(0, 3).forEach((item, index) => {
      console.log(`\n[${index + 1}] "${item.snippet.title}"`);
      console.log(`  ID: ${item.id.channelId}`);
      console.log(`  Descrição: ${item.snippet.description.substring(0, 100)}...`);
    });
    
    // Teste 3: Obter detalhes de um canal específico
    console.log('\n\nObtendo detalhes de um canal específico...');
    
    // Usar o primeiro canal encontrado na busca ou um ID personalizado
    let channelId = channelSearch.data.items.length > 0 ? 
      channelSearch.data.items[0].id.channelId : 
      'UCX6OQ3DkcsbYNE6H8uQQuVA'; // MrBeast como fallback
    
    const customChannelId = await promptUser(`\nDigite o ID de um canal específico ou pressione Enter para usar: ${channelId}: `);
    if (customChannelId.trim()) {
      channelId = customChannelId.trim();
    }
    
    const channelDetails = await youtube.channels.list({
      part: 'snippet,statistics,contentDetails',
      id: channelId
    });
    
    if (channelDetails.data.items && channelDetails.data.items.length > 0) {
      const channel = channelDetails.data.items[0];
      
      console.log('\n✓ Sucesso! Detalhes do canal:');
      console.log(`\nNome: ${channel.snippet.title}`);
      console.log(`ID: ${channel.id}`);
      console.log(`URL: ${channel.snippet.customUrl ? 'https://youtube.com/' + channel.snippet.customUrl : 'N/A'}`);
      console.log(`Descrição: ${channel.snippet.description.substring(0, 150)}...`);
      console.log(`Inscritos: ${channel.statistics.subscriberCount}`);
      console.log(`Visualizações: ${channel.statistics.viewCount}`);
      console.log(`Vídeos: ${channel.statistics.videoCount}`);
      
      // Teste 4: Listar vídeos do canal
      console.log('\n\nListando vídeos do canal...');
      
      // Obter ID da playlist de uploads
      const uploadsPlaylistId = channel.contentDetails.relatedPlaylists.uploads;
      
      const channelVideos = await youtube.playlistItems.list({
        part: 'snippet,contentDetails',
        playlistId: uploadsPlaylistId,
        maxResults: 10
      });
      
      console.log(`\n✓ Sucesso! Encontrados ${channelVideos.data.items.length} vídeos recentes.`);
      console.log('\nPrimeiros 5 vídeos:');
      
      const videoIds = channelVideos.data.items.slice(0, 5).map(item => item.contentDetails.videoId);
      
      // Obter estatísticas dos vídeos
      const videosDetails = await youtube.videos.list({
        part: 'snippet,statistics',
        id: videoIds.join(',')
      });
      
      videosDetails.data.items.forEach((video, index) => {
        console.log(`\n[${index + 1}] "${video.snippet.title}"`);
        console.log(`  ID: ${video.id}`);
        console.log(`  Publicado: ${new Date(video.snippet.publishedAt).toLocaleString()}`);
        console.log(`  Visualizações: ${video.statistics.viewCount}`);
        console.log(`  Likes: ${video.statistics.likeCount}`);
        console.log(`  Comentários: ${video.statistics.commentCount}`);
      });
      
      // Teste 5: Obter comentários de um vídeo
      if (videoIds.length > 0) {
        console.log('\n\nObtendo comentários de um vídeo...');
        
        const videoId = videoIds[0];
        const videoComments = await youtube.commentThreads.list({
          part: 'snippet',
          videoId: videoId,
          maxResults: 10
        });
        
        if (videoComments.data.items && videoComments.data.items.length > 0) {
          console.log(`\n✓ Sucesso! Encontrados ${videoComments.data.items.length} comentários.`);
          console.log('\nPrimeiros 3 comentários:');
          
          videoComments.data.items.slice(0, 3).forEach((comment, index) => {
            const topComment = comment.snippet.topLevelComment.snippet;
            console.log(`\n[${index + 1}] Autor: ${topComment.authorDisplayName}`);
            console.log(`  Comentário: "${topComment.textDisplay.substring(0, 100)}${topComment.textDisplay.length > 100 ? '...' : ''}"`);
            console.log(`  Likes: ${topComment.likeCount}`);
            console.log(`  Data: ${new Date(topComment.publishedAt).toLocaleString()}`);
          });
        } else {
          console.log('\nNenhum comentário encontrado para este vídeo.');
        }
      }
    } else {
      console.log(`\n✗ Canal não encontrado com o ID: ${channelId}`);
    }
    
    console.log('\n=== TESTE COMPLETO ===');
    console.log('A API do YouTube está funcionando corretamente!');
    
  } catch (error) {
    console.error('\n✗ Erro ao testar a API do YouTube:');
    console.error(error.message);
    
    if (error.code === 403) {
      console.error('\nParece que há um problema com as permissões ou a API KEY.');
      console.error('Verifique se a API KEY é válida e se a API do YouTube está ativada no console do Google Cloud.');
    }
    
    if (error.code === 400) {
      console.error('\nParece que há um problema com os parâmetros da requisição.');
      console.error('Verifique se os IDs de canais/vídeos estão corretos.');
    }
  } finally {
    rl.close();
  }
}

// Função auxiliar para prompts
function promptUser(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Executar o teste
testYouTubeAPI();
