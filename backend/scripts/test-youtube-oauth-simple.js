// Script simplificado para testar a autenticação OAuth2 do YouTube
// Path: /Users/rogerioresende/Desktop/lancei-essa-sistema/backend/scripts/test-youtube-oauth-simple.js

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

console.log('\n=== TESTE DE AUTENTICAÇÃO OAUTH2 DO YOUTUBE ===\n');

// Verificar se as variáveis necessárias estão configuradas
console.log('Verificando variáveis de ambiente:');
console.log(`- YOUTUBE_CLIENT_ID: ${process.env.YOUTUBE_CLIENT_ID ? '✓ Configurado' : '✗ Não configurado'}`);
console.log(`- YOUTUBE_CLIENT_SECRET: ${process.env.YOUTUBE_CLIENT_SECRET ? '✓ Configurado' : '✗ Não configurado'}`);
console.log(`- YOUTUBE_REDIRECT_URI: ${process.env.YOUTUBE_REDIRECT_URI || '✗ Não configurado'}`);

// Se alguma variável estiver faltando, exibir mensagem de erro e sair
if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET || !process.env.YOUTUBE_REDIRECT_URI) {
  console.error('\n✗ Erro: Variáveis de ambiente incompletas. Verifique o arquivo .env.');
  rl.close();
  process.exit(1);
}

// Criar cliente OAuth2
const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  process.env.YOUTUBE_REDIRECT_URI
);

// Definir escopos de autenticação
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
console.log('\nCopie e cole essa URL no seu navegador. Faça login com sua conta do Google e autorize o acesso ao YouTube.');
console.log('Após autorizar, você será redirecionado para uma página com um código. Copie esse código.');

// Solicitar o código de autorização
rl.question('\nCole o código de autorização aqui: ', async (code) => {
  try {
    console.log('\nObtendo tokens...');
    
    // Trocar o código por tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    console.log('\n✓ Tokens obtidos com sucesso:');
    console.log(`- Access Token: ${tokens.access_token.substring(0, 15)}...`);
    console.log(`- Refresh Token: ${tokens.refresh_token ? tokens.refresh_token.substring(0, 15) + '...' : 'Não fornecido'}`);
    console.log(`- Expira em: ${new Date(tokens.expiry_date).toLocaleString()}`);
    
    // Configurar cliente com os tokens
    oauth2Client.setCredentials(tokens);
    
    // Criar cliente YouTube
    const youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client
    });
    
    // Testar a autenticação obtendo informações do canal
    console.log('\nTestando autenticação...');
    const channelResponse = await youtube.channels.list({
      part: 'snippet,statistics',
      mine: true
    });
    
    if (channelResponse.data.items && channelResponse.data.items.length > 0) {
      const channel = channelResponse.data.items[0];
      
      console.log('\n✓ Autenticação bem-sucedida! Informações do canal:');
      console.log(`- Nome: ${channel.snippet.title}`);
      console.log(`- ID: ${channel.id}`);
      console.log(`- URL customizada: ${channel.snippet.customUrl || 'Não definida'}`);
      console.log(`- Inscritos: ${channel.statistics.subscriberCount}`);
      console.log(`- Visualizações: ${channel.statistics.viewCount}`);
      console.log(`- Total de vídeos: ${channel.statistics.videoCount}`);
      
      // Salvar os tokens em um arquivo para uso futuro (apenas para teste)
      if (tokens.refresh_token) {
        const fs = require('fs');
        const tokenFile = path.resolve(__dirname, '../youtube_tokens.json');
        
        fs.writeFileSync(tokenFile, JSON.stringify({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: tokens.expiry_date,
          channel_id: channel.id
        }, null, 2));
        
        console.log(`\nTokens salvos em: ${tokenFile}`);
        console.log('NOTA: Este arquivo contém informações sensíveis. Não o compartilhe e não o adicione ao controle de versão.');
      }
    } else {
      console.log('\n✗ Erro: Não foi possível obter informações do canal.');
    }
  } catch (error) {
    console.error('\n✗ Erro ao obter tokens:');
    console.error(error.message);
    
    if (error.response && error.response.data) {
      console.error('\nDetalhes do erro:');
      console.error(JSON.stringify(error.response.data, null, 2));
    }
  } finally {
    rl.close();
  }
});
