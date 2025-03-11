#!/usr/bin/env node

/**
 * Script para testar a configuração do YouTube API no ambiente de produção
 * 
 * Como usar:
 * NODE_ENV=production node scripts/test-youtube-production.js
 */

// Carregar variáveis de ambiente de produção
process.env.NODE_ENV = 'production';
require('dotenv').config({ path: '.env.production' });

const { google } = require('googleapis');
const readline = require('readline');

// Configuração de interface de terminal
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n=== TESTE DE CONFIGURAÇÃO DO YOUTUBE API (PRODUÇÃO) ===\n');

// Verificar variáveis de ambiente
console.log('Variáveis de ambiente:');
console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`- API_BASE_URL: ${process.env.API_BASE_URL}`);
console.log(`- YOUTUBE_CLIENT_ID: ${process.env.YOUTUBE_CLIENT_ID ? '✓ Configurado' : '✗ Não configurado'}`);
console.log(`- YOUTUBE_CLIENT_SECRET: ${process.env.YOUTUBE_CLIENT_SECRET ? '✓ Configurado' : '✗ Não configurado'}`);
console.log(`- YOUTUBE_REDIRECT_URI: ${process.env.YOUTUBE_REDIRECT_URI}`);
console.log(`- YOUTUBE_API_KEY: ${process.env.YOUTUBE_API_KEY ? '✓ Configurado' : '✗ Não configurado'}`);

// Testar API Key
async function testApiKey() {
  console.log('\n=== TESTANDO API KEY ===');
  
  try {
    const youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY
    });
    
    console.log('Buscando vídeos populares...');
    
    const response = await youtube.videos.list({
      part: 'snippet',
      chart: 'mostPopular',
      regionCode: 'BR',
      maxResults: 3
    });
    
    console.log(`✓ Sucesso! Encontrados ${response.data.items.length} vídeos populares.`);
    console.log(`Primeiro vídeo: "${response.data.items[0].snippet.title}"`);
    return true;
  } catch (error) {
    console.error(`✗ Erro ao testar API Key: ${error.message}`);
    return false;
  }
}

// Testar OAuth2
async function testOAuth2() {
  console.log('\n=== TESTANDO CONFIGURAÇÃO OAUTH2 ===');
  
  try {
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
    
    console.log('✓ URL de autenticação gerada com sucesso:');
    console.log(authUrl);
    
    console.log('\nPara testar o fluxo completo de OAuth2:');
    console.log('1. Copie esta URL e abra em um navegador');
    console.log('2. Faça login com sua conta Google e autorize o acesso');
    console.log('3. Você será redirecionado para a URI configurada');
    console.log('4. Verifique se o redirecionamento funciona corretamente');
    
    return true;
  } catch (error) {
    console.error(`✗ Erro ao testar configuração OAuth2: ${error.message}`);
    return false;
  }
}

// Função principal
async function main() {
  try {
    // Testar API Key
    const apiKeySuccess = await testApiKey();
    
    // Testar OAuth2
    const oauth2Success = await testOAuth2();
    
    // Resumo
    console.log('\n=== RESUMO DOS TESTES ===');
    console.log(`- API Key: ${apiKeySuccess ? '✓ OK' : '✗ Falha'}`);
    console.log(`- OAuth2: ${oauth2Success ? '✓ OK' : '✗ Falha'}`);
    
    if (apiKeySuccess && oauth2Success) {
      console.log('\n✅ Todos os testes passaram! A configuração do YouTube API está correta.');
      console.log('Você pode prosseguir com o deploy para produção.');
    } else {
      console.log('\n❌ Alguns testes falharam. Verifique os erros acima e corrija a configuração.');
    }
  } catch (error) {
    console.error('Erro no teste:', error);
  } finally {
    rl.close();
  }
}

// Executar testes
main();