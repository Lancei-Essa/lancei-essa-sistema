// Script para testar autenticação com YouTube
// Path: /Users/rogerioresende/Desktop/lancei-essa-sistema/backend/scripts/test-youtube-auth-fixed.js

// Carregar variáveis de ambiente do arquivo .env no diretório raiz do projeto
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { google } = require('googleapis');
const mongoose = require('mongoose');
const readline = require('readline');

// Configuração de interface de terminal
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Verificar variáveis de ambiente
console.log('\n=== VERIFICANDO CONFIGURAÇÃO DE AUTENTICAÇÃO DO YOUTUBE ===\n');
console.log('Credenciais:');
console.log(`- YOUTUBE_CLIENT_ID: ${process.env.YOUTUBE_CLIENT_ID ? '✓ Configurado' : '✗ Não configurado'}`);
console.log(`- YOUTUBE_CLIENT_SECRET: ${process.env.YOUTUBE_CLIENT_SECRET ? '✓ Configurado' : '✗ Não configurado'}`);
console.log(`- YOUTUBE_REDIRECT_URI: ${process.env.YOUTUBE_REDIRECT_URI}`);
console.log(`- YOUTUBE_API_KEY: ${process.env.YOUTUBE_API_KEY ? '✓ Configurado' : '✗ Não configurado'}`);
console.log(`- MONGODB_URI: ${process.env.MONGODB_URI ? '✓ Configurado' : '✗ Não configurado'}`);

// Função principal
async function main() {
  try {
    // Conectar ao MongoDB
    console.log('\nConectando ao MongoDB...');
    
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI não está configurada. Verifique o arquivo .env');
    }
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Conectado ao MongoDB com sucesso.');
    
    // Criar cliente OAuth2
    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT_URI
    );

    // Definir escopos
    const scopes = [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.upload'
    ];
    
    // Gerar URL de autenticação
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      include_granted_scopes: true
    });
    
    console.log('\n=== URL DE AUTENTICAÇÃO ===');
    console.log(authUrl);
    
    // Teste básico da API (não autenticado)
    console.log('\n=== TESTANDO API COM CHAVE API_KEY (NÃO AUTENTICADO) ===');
    if (!process.env.YOUTUBE_API_KEY) {
      console.log('YOUTUBE_API_KEY não configurada. Pulando este teste.');
    } else {
      try {
        const youtube = google.youtube({
          version: 'v3',
          auth: process.env.YOUTUBE_API_KEY
        });
        
        const response = await youtube.videos.list({
          part: 'snippet',
          chart: 'mostPopular',
          regionCode: 'BR',
          maxResults: 3
        });
        
        console.log(`Sucesso! Encontrados ${response.data.items.length} vídeos populares.`);
        console.log('Primeiro vídeo:', response.data.items[0].snippet.title);
      } catch (error) {
        console.error('Erro ao testar API com API_KEY:', error.message);
      }
    }

    // Perguntar se deseja gerar um novo token
    rl.question('\nDeseja criar um novo token agora? (S/N): ', async (answer) => {
      if (answer.toLowerCase() === 's') {
        console.log(`\nAcesse a URL abaixo no navegador e faça login:\n${authUrl}`);
        rl.question('\nCole o código recebido após autorização: ', async (code) => {
          try {
            const { tokens } = await oauth2Client.getToken(code);
            
            // Configurar cliente
            oauth2Client.setCredentials(tokens);
            
            // Obter informações do canal
            const youtube = google.youtube({
              version: 'v3',
              auth: oauth2Client
            });
            
            const response = await youtube.channels.list({
              part: 'snippet',
              mine: true
            });
            
            const channelId = response.data.items[0].id;
            const channelTitle = response.data.items[0].snippet.title;
            
            console.log(`\nCanal encontrado: ${channelTitle} (${channelId})`);
            console.log('\nTokens obtidos:');
            console.log('- access_token:', tokens.access_token.substring(0, 10) + '...');
            console.log('- refresh_token:', tokens.refresh_token ? tokens.refresh_token.substring(0, 10) + '...' : 'Não fornecido');
            console.log('- expiry_date:', new Date(tokens.expiry_date).toLocaleString());
            
            rl.close();
            mongoose.connection.close();
          } catch (error) {
            console.error('Erro ao obter token:', error.message);
            rl.close();
            mongoose.connection.close();
          }
        });
      } else {
        rl.close();
        mongoose.connection.close();
      }
    });
  } catch (error) {
    console.error('Erro:', error);
    rl.close();
    mongoose.connection.close();
  }
}

// Executar
main();
