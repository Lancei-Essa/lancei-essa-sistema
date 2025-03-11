// Script para testar o carregamento das variáveis de ambiente
require('dotenv').config({ path: './backend/.env' });

console.log('=== VERIFICANDO VARIÁVEIS DE AMBIENTE ===');
console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('YOUTUBE_CLIENT_ID:', process.env.YOUTUBE_CLIENT_ID);
console.log('YOUTUBE_CLIENT_SECRET:', process.env.YOUTUBE_CLIENT_SECRET);
console.log('YOUTUBE_REDIRECT_URI:', process.env.YOUTUBE_REDIRECT_URI);
console.log('YOUTUBE_API_KEY:', process.env.YOUTUBE_API_KEY);
