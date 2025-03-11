// Script para testar a API do YouTube com a nova chave API
// Path: /Users/rogerioresende/Desktop/lancei-essa-sistema/backend/scripts/test-youtube-api.js

// Carregar variáveis de ambiente
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { google } = require('googleapis');

// Verificar configuração
console.log('\n=== TESTANDO CONFIGURAÇÃO DO YOUTUBE ===\n');
console.log(`YOUTUBE_API_KEY: ${process.env.YOUTUBE_API_KEY ? process.env.YOUTUBE_API_KEY.substring(0, 10) + '...' : 'Não configurada'}`);

// Função principal
async function main() {
  try {
    // Criar cliente YouTube com API_KEY
    const youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY
    });
    
    // Testar API buscando vídeos populares
    console.log('\nBuscando vídeos populares...');
    
    const response = await youtube.videos.list({
      part: 'snippet',
      chart: 'mostPopular',
      regionCode: 'BR',
      maxResults: 3
    });
    
    if (response.data && response.data.items) {
      console.log(`\n✓ Sucesso! Encontrados ${response.data.items.length} vídeos.`);
      
      // Mostrar primeiro vídeo
      const firstVideo = response.data.items[0];
      console.log('\nPrimeiro vídeo:');
      console.log(`Título: ${firstVideo.snippet.title}`);
      console.log(`Canal: ${firstVideo.snippet.channelTitle}`);
      console.log(`Publicado em: ${firstVideo.snippet.publishedAt}`);
      
      console.log('\n✓ A API do YouTube está funcionando corretamente!');
    } else {
      console.log('Resposta recebida, mas sem vídeos.');
    }
    
  } catch (error) {
    console.error('\n✗ Erro ao testar a API do YouTube:');
    console.error(error.message);
    
    if (error.response) {
      console.error('\nDetalhes do erro:');
      console.error(JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Executar
main();
