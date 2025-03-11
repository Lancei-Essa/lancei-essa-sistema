// Script para testar a conexão YouTube com as variáveis configuradas
// Usar os módulos do backend
const { google } = require('./backend/node_modules/googleapis');

// Obter valores dos parâmetros de linha de comando
// Uso: node test-youtube-auth.js CLIENT_ID CLIENT_SECRET REDIRECT_URI
const CLIENT_ID = process.argv[2];
const CLIENT_SECRET = process.argv[3];
const REDIRECT_URI = process.argv[4] || 'http://localhost:5000/api/youtube/callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Uso: node test-youtube-auth.js CLIENT_ID CLIENT_SECRET [REDIRECT_URI]');
  process.exit(1);
}

// Configurar cliente OAuth2 com valores fornecidos
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Escopos que foram configurados
const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.readonly'
];

// Log de configuração
console.log('\n=== CONFIGURAÇÃO ATUAL ===');
console.log('Client ID:', CLIENT_ID ? CLIENT_ID.substring(0, 8) + '...' : 'Não configurado ❌');
console.log('Client Secret:', CLIENT_SECRET ? CLIENT_SECRET.substring(0, 3) + '...' : 'Não configurado ❌');
console.log('Redirect URI:', REDIRECT_URI || 'Não configurado ❌');

// Gerar URL de autenticação
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  include_granted_scopes: true
});

console.log('\n=== URL DE AUTENTICAÇÃO ===');
console.log('URL:', authUrl);
console.log('\nInstruções:');
console.log('1. Acesse a URL acima em seu navegador');
console.log('2. Faça login com sua conta Google');
console.log('3. Autorize o acesso ao YouTube');
console.log('4. Você será redirecionado para o URI configurado com um código na URL');
console.log('5. Copie esse código para usar no próximo passo\n');