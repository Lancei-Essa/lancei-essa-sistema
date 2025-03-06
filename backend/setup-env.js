// Este script garante que as variáveis de ambiente estejam configuradas corretamente
console.log('Configurando variáveis de ambiente para o YouTube...');

// Definir API_BASE_URL caso não esteja configurada
if (!process.env.API_BASE_URL) {
  process.env.API_BASE_URL = process.env.RENDER_EXTERNAL_URL || 
                             process.env.RENDER_INTERNAL_URL || 
                             `http://localhost:${process.env.PORT || 5002}`;
  console.log(`API_BASE_URL não configurada, usando valor automático: ${process.env.API_BASE_URL}`);
} else {
  console.log(`API_BASE_URL configurada: ${process.env.API_BASE_URL}`);
}

// Verificar e corrigir YOUTUBE_REDIRECT_URI
if (!process.env.YOUTUBE_REDIRECT_URI || 
    (process.env.YOUTUBE_REDIRECT_URI.includes('${API_BASE_URL}') || 
     !process.env.YOUTUBE_REDIRECT_URI.includes(process.env.API_BASE_URL))) {
  
  const oldValue = process.env.YOUTUBE_REDIRECT_URI;
  process.env.YOUTUBE_REDIRECT_URI = `${process.env.API_BASE_URL}/api/youtube/oauth2callback`;
  
  console.log('YOUTUBE_REDIRECT_URI configurada incorretamente.');
  console.log(`Valor anterior: ${oldValue || 'não definido'}`);
  console.log(`Novo valor: ${process.env.YOUTUBE_REDIRECT_URI}`);
}

// Configurar os aliases do Google para compatibilidade
process.env.GOOGLE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
process.env.GOOGLE_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
process.env.GOOGLE_REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI;

// Imprimir configuração final do YouTube
console.log('\n=== Configuração final do YouTube ===');
console.log('YOUTUBE_CLIENT_ID:', process.env.YOUTUBE_CLIENT_ID ? 'Configurado ✓' : 'NÃO CONFIGURADO ✗');
console.log('YOUTUBE_CLIENT_SECRET:', process.env.YOUTUBE_CLIENT_SECRET ? 'Configurado ✓' : 'NÃO CONFIGURADO ✗');
console.log('YOUTUBE_REDIRECT_URI:', process.env.YOUTUBE_REDIRECT_URI);
console.log('YOUTUBE_API_KEY:', process.env.YOUTUBE_API_KEY ? 'Configurado ✓' : 'Não configurado');

// Verificar problemas críticos
let errors = 0;
if (!process.env.YOUTUBE_CLIENT_ID) {
  console.error('ERRO CRÍTICO: YOUTUBE_CLIENT_ID não configurado!');
  errors++;
}
if (!process.env.YOUTUBE_CLIENT_SECRET) {
  console.error('ERRO CRÍTICO: YOUTUBE_CLIENT_SECRET não configurado!');
  errors++;
}
if (!process.env.YOUTUBE_REDIRECT_URI) {
  console.error('ERRO CRÍTICO: YOUTUBE_REDIRECT_URI não configurado!');
  errors++;
}

// Exibir resultado final
if (errors === 0) {
  console.log('\n✅ Configuração do YouTube concluída com sucesso.');
} else {
  console.error(`\n❌ Configuração do YouTube concluída com ${errors} erro(s).`);
}