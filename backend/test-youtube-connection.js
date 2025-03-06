// Script para testar a conexão com a API do YouTube
const { google } = require('googleapis');
const dotenv = require('dotenv');
dotenv.config();

// Logs das variáveis de ambiente
console.log('=== Variáveis de ambiente ===');
console.log('YOUTUBE_CLIENT_ID configurado:', !!process.env.YOUTUBE_CLIENT_ID);
console.log('YOUTUBE_CLIENT_SECRET configurado:', !!process.env.YOUTUBE_CLIENT_SECRET);
console.log('YOUTUBE_REDIRECT_URI:', process.env.YOUTUBE_REDIRECT_URI);
console.log('API_BASE_URL:', process.env.API_BASE_URL);

// Função para criar um cliente OAuth2
async function testOAuthClientCreation() {
  console.log('\n=== Teste de criação do cliente OAuth2 ===');
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT_URI
    );
    
    console.log('Cliente OAuth2 criado com sucesso');
    
    // Testar geração de URL de autorização
    const scopes = [
      'https://www.googleapis.com/auth/youtube.readonly'
    ];
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      include_granted_scopes: true
    });
    
    console.log('URL de autorização gerada com sucesso');
    console.log('URL:', authUrl);
    
    return true;
  } catch (error) {
    console.error('Erro ao criar cliente OAuth2:', error);
    return false;
  }
}

// Testar API do YouTube com uma chave de API (não requer OAuth)
async function testYouTubeAPIWithKey() {
  console.log('\n=== Teste da API do YouTube com chave de API ===');
  
  if (!process.env.YOUTUBE_API_KEY) {
    console.log('Nenhuma chave de API configurada, pulando este teste');
    return false;
  }
  
  try {
    const youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY
    });
    
    // Buscar vídeos populares
    const response = await youtube.videos.list({
      part: 'snippet',
      chart: 'mostPopular',
      regionCode: 'BR',
      maxResults: 5
    });
    
    console.log('Conexão com API do YouTube bem-sucedida!');
    console.log(`${response.data.items.length} vídeos recebidos`);
    
    return true;
  } catch (error) {
    console.error('Erro ao acessar API do YouTube:', error.message);
    return false;
  }
}

// Gerar URL de autenticação manualmente
function generateManualAuthUrl() {
  console.log('\n=== Geração manual de URL de autenticação ===');
  
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI;
  
  if (!clientId) {
    console.error('CLIENT_ID não configurado');
    return null;
  }
  
  // Escopos para solicitar
  const scopes = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.readonly'
  ];
  
  // Construir URL manualmente
  const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + 
    `client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    '&response_type=code' +
    `&scope=${encodeURIComponent(scopes.join(' '))}` +
    '&access_type=offline' +
    '&include_granted_scopes=true';
  
  console.log('URL manual gerada:', authUrl);
  return authUrl;
}

// Executar testes
async function runTests() {
  console.log('Iniciando testes de conexão com YouTube API...\n');
  
  let oauthClientCreated = await testOAuthClientCreation();
  let apiKeyTested = await testYouTubeAPIWithKey();
  let manualUrl = generateManualAuthUrl();
  
  console.log('\n=== Resumo dos testes ===');
  console.log('- Criação de cliente OAuth2:', oauthClientCreated ? '✅ Sucesso' : '❌ Falha');
  console.log('- Teste de API com chave:', apiKeyTested ? '✅ Sucesso' : '❌ Falha ou Pulado');
  console.log('- Geração manual de URL:', manualUrl ? '✅ Sucesso' : '❌ Falha');
  
  if (oauthClientCreated && manualUrl) {
    console.log('\n✅ A API do YouTube parece estar configurada corretamente!');
  } else {
    console.log('\n❌ Há problemas na configuração da API do YouTube que precisam ser corrigidos.');
  }
}

runTests().catch(error => {
  console.error('Erro não tratado durante os testes:', error);
  process.exit(1);
});