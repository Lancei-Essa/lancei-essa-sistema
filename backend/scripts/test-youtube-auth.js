// Script para testar autenticação com YouTube
// Path: /Users/rogerioresende/Desktop/lancei-essa-sistema/backend/scripts/test-youtube-auth.js

require('dotenv').config();
const { google } = require('googleapis');
const YouTubeToken = require('../models/YouTubeToken');
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

// Função principal
async function main() {
  try {
    // Conectar ao MongoDB
    console.log('\nConectando ao MongoDB...');
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
    
    // Verificar tokens existentes
    console.log('\n=== VERIFICANDO TOKENS EXISTENTES ===');
    const tokens = await YouTubeToken.find().select('+access_token +refresh_token');
    
    if (tokens.length === 0) {
      console.log('Nenhum token encontrado no banco de dados.');
      
      // Perguntar se deseja criar um novo
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
              
              // Perguntar ID do usuário
              rl.question('\nInforme o ID do usuário (MongoDB _id): ', async (userId) => {
                
                // Perguntar ID da empresa
                rl.question('Informe o ID da empresa (MongoDB _id): ', async (companyId) => {
                  // Criar novo token
                  const youtubeToken = new YouTubeToken({
                    user: userId,
                    company: companyId,
                    access_token: tokens.access_token,
                    refresh_token: tokens.refresh_token,
                    expiry_date: tokens.expiry_date,
                    token_scope: tokens.scope,
                    channel_id: channelId,
                    is_valid: true
                  });
                  
                  await youtubeToken.save();
                  console.log('Token salvo com sucesso no banco de dados!');
                  
                  rl.close();
                  mongoose.connection.close();
                });
              });
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
    } else {
      console.log(`Encontrados ${tokens.length} tokens:`);
      
      tokens.forEach((token, index) => {
        console.log(`\n[${index + 1}] Token: ${token._id}`);
        console.log(`- Usuário: ${token.user}`);
        console.log(`- Canal: ${token.channel_id || 'Não definido'}`);
        console.log(`- Válido: ${token.is_valid ? 'Sim' : 'Não'}`);
        
        // Verificar se está expirado
        const now = Date.now();
        const isExpired = token.expiry_date < now;
        console.log(`- Status: ${isExpired ? 'Expirado' : 'Válido'}`);
        
        if (token.expiry_date) {
          const expiryDate = new Date(token.expiry_date);
          console.log(`- Expira em: ${expiryDate.toLocaleString()}`);
        }
      });
      
      // Perguntar se deseja renovar algum token
      rl.question('\nDeseja renovar algum token? (S/N): ', async (answer) => {
        if (answer.toLowerCase() === 's') {
          rl.question('Digite o número do token a renovar: ', async (tokenIndex) => {
            const index = parseInt(tokenIndex) - 1;
            
            if (isNaN(index) || index < 0 || index >= tokens.length) {
              console.log('Índice inválido.');
              rl.close();
              mongoose.connection.close();
              return;
            }
            
            const token = tokens[index];
            
            // Verificar se tem refresh_token
            if (!token.refresh_token) {
              console.log('Este token não possui refresh_token. Não é possível renovar automaticamente.');
              rl.close();
              mongoose.connection.close();
              return;
            }
            
            try {
              // Descriptografar refresh_token
              const decryptedTokens = token.getDecryptedTokens();
              
              // Renovar token
              oauth2Client.setCredentials({
                refresh_token: decryptedTokens.refresh_token
              });
              
              const { credentials } = await oauth2Client.refreshAccessToken();
              
              // Atualizar token
              token.access_token = credentials.access_token;
              token.refresh_token = credentials.refresh_token || decryptedTokens.refresh_token;
              token.expiry_date = credentials.expiry_date;
              token.last_refreshed = new Date();
              token.is_valid = true;
              
              await token.save();
              
              console.log('Token renovado com sucesso!');
              console.log(`- Novo access_token: ${credentials.access_token.substring(0, 10)}...`);
              console.log(`- Nova data de expiração: ${new Date(credentials.expiry_date).toLocaleString()}`);
              
              // Testar API com o token renovado
              oauth2Client.setCredentials(credentials);
              
              const youtube = google.youtube({
                version: 'v3',
                auth: oauth2Client
              });
              
              const response = await youtube.channels.list({
                part: 'snippet,statistics',
                id: token.channel_id || 'mine'
              });
              
              if (response.data.items && response.data.items.length > 0) {
                const channel = response.data.items[0];
                console.log('\nInformações do canal:');
                console.log(`- Nome: ${channel.snippet.title}`);
                console.log(`- ID: ${channel.id}`);
                console.log(`- Inscritos: ${channel.statistics.subscriberCount}`);
                console.log(`- Visualizações: ${channel.statistics.viewCount}`);
              }
            } catch (error) {
              console.error('Erro ao renovar token:', error.message);
            } finally {
              rl.close();
              mongoose.connection.close();
            }
          });
        } else {
          rl.close();
          mongoose.connection.close();
        }
      });
    }
  } catch (error) {
    console.error('Erro:', error);
    rl.close();
    mongoose.connection.close();
  }
}

// Executar
main();