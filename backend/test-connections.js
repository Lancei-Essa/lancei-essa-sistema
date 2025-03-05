/**
 * Script de teste para verificar conexões com plataformas sociais
 * 
 * Como usar:
 * 1. Configure o arquivo .env com as credenciais necessárias
 * 2. Execute este script com: node test-connections.js [plataforma]
 *    Exemplo: node test-connections.js youtube
 * 
 * Plataformas suportadas: all, youtube, instagram, twitter, linkedin, tiktok, spotify
 */

require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const User = require('./models/User');
const colors = require('colors/safe');

// Configurações
const PORT = process.env.PORT || 5002;
const BASE_URL = `http://localhost:${PORT}/api`;
const PLATFORMS = ['youtube', 'instagram', 'twitter', 'linkedin', 'tiktok', 'spotify'];

// Iniciar conexão MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log(colors.green('MongoDB conectado')))
.catch(err => {
  console.error(colors.red('Erro ao conectar ao MongoDB:'), err);
  process.exit(1);
});

// Função para testar conexão com uma plataforma
async function testConnection(platform) {
  console.log(colors.cyan(`\nTestando conexão com ${platform.toUpperCase()}...`));
  
  try {
    // Verificar se há token no banco de dados
    const tokenModel = require(`./models/${platform.charAt(0).toUpperCase() + platform.slice(1)}Token`);
    const tokens = await tokenModel.find({});
    
    if (tokens.length === 0) {
      console.log(colors.yellow(`- Nenhum token encontrado para ${platform} no banco de dados`));
      console.log(colors.yellow(`- É necessário autenticar com ${platform} primeiro`));
      
      // Mostrar URL de autenticação para a plataforma
      try {
        console.log(colors.yellow(`- Tentando obter URL de autenticação em: ${BASE_URL}/${platform.toLowerCase()}/auth-url`));
        const res = await axios.get(`${BASE_URL}/${platform.toLowerCase()}/auth-url`);
        if (res.data && res.data.authUrl) {
          console.log(colors.green(`- URL para autenticação com ${platform}:`));
          console.log(colors.cyan(res.data.authUrl));
        } else {
          console.log(colors.yellow(`- Resposta recebida mas sem URL de autenticação:`));
          console.log(colors.yellow(JSON.stringify(res.data, null, 2)));
        }
      } catch (authUrlError) {
        console.log(colors.red(`- Erro ao obter URL de autenticação para ${platform}:`));
        console.log(colors.red(`- ${authUrlError.message}`));
        
        if (authUrlError.response) {
          console.log(colors.red(`- Status: ${authUrlError.response.status}`));
          console.log(colors.red(`- Dados: ${JSON.stringify(authUrlError.response.data, null, 2)}`));
        }
      }
      
      return {
        platform,
        status: 'not_connected',
        message: 'Nenhum token encontrado'
      };
    }
    
    // Verificar status da conexão
    try {
      const res = await axios.get(`${BASE_URL}/${platform.toLowerCase()}/check-connection`);
      
      if (res.data && res.data.success) {
        console.log(colors.green(`- Conexão com ${platform} está ATIVA`));
        
        if (res.data.profile) {
          console.log(colors.green(`- Perfil: ${JSON.stringify(res.data.profile, null, 2)}`));
        }
        
        return {
          platform,
          status: 'connected',
          profile: res.data.profile
        };
      } else {
        console.log(colors.yellow(`- Conexão com ${platform} não está ativa`));
        return {
          platform,
          status: 'inactive',
          message: res.data.message || 'Conexão inativa'
        };
      }
    } catch (error) {
      console.log(colors.red(`- Erro ao verificar conexão com ${platform}`));
      console.log(colors.red(`- Detalhes: ${error.message}`));
      console.log(colors.yellow(`- Verifique se o servidor está rodando na porta ${PORT}`));
      
      return {
        platform,
        status: 'error',
        error: error.message
      };
    }
  } catch (error) {
    console.log(colors.red(`- Erro ao testar ${platform}`));
    console.log(colors.red(`- Detalhes: ${error.message}`));
    
    return {
      platform,
      status: 'error',
      error: error.message
    };
  }
}

// Função para verificar as credenciais no .env
function checkEnvCredentials(platform) {
  console.log(colors.cyan(`\nVerificando credenciais para ${platform.toUpperCase()}...`));
  
  const envVars = {
    youtube: ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REDIRECT_URI'],
    instagram: ['INSTAGRAM_CLIENT_ID', 'INSTAGRAM_CLIENT_SECRET', 'INSTAGRAM_REDIRECT_URI'],
    twitter: ['TWITTER_API_KEY', 'TWITTER_API_SECRET', 'TWITTER_REDIRECT_URI'],
    linkedin: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET', 'LINKEDIN_REDIRECT_URI'],
    tiktok: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET', 'TIKTOK_REDIRECT_URI'],
    spotify: ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET', 'SPOTIFY_REDIRECT_URI']
  };
  
  const requiredVars = envVars[platform];
  const missing = [];
  const incomplete = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    } else if (process.env[varName].includes('seu_') || process.env[varName] === '') {
      incomplete.push(varName);
    }
  }
  
  if (missing.length > 0) {
    console.log(colors.red(`- Variáveis de ambiente ausentes para ${platform}:`));
    missing.forEach(v => console.log(colors.red(`  - ${v}`)));
  }
  
  if (incomplete.length > 0) {
    console.log(colors.yellow(`- Variáveis de ambiente incompletas para ${platform}:`));
    incomplete.forEach(v => console.log(colors.yellow(`  - ${v}`)));
  }
  
  if (missing.length === 0 && incomplete.length === 0) {
    console.log(colors.green(`- Todas as credenciais para ${platform} estão configuradas`));
    return true;
  }
  
  return false;
}

// Função principal
async function main() {
  // Determinar quais plataformas testar
  let platformsToTest = [];
  const arg = process.argv[2] ? process.argv[2].toLowerCase() : 'all';
  
  if (arg === 'all') {
    platformsToTest = PLATFORMS;
  } else if (PLATFORMS.includes(arg)) {
    platformsToTest = [arg];
  } else {
    console.log(colors.red(`Plataforma "${arg}" não reconhecida.`));
    console.log(colors.cyan(`Plataformas disponíveis: ${PLATFORMS.join(', ')}, all`));
    process.exit(1);
  }
  
  console.log(colors.cyan('=== Teste de Conexões com Plataformas Sociais ==='));
  console.log(colors.cyan(`Testando: ${platformsToTest.join(', ')}`));
  
  // Verificar credenciais no .env
  console.log(colors.cyan('\n--- Verificação de Credenciais ---'));
  for (const platform of platformsToTest) {
    checkEnvCredentials(platform);
  }
  
  // Verificar se o servidor está rodando
  try {
    await axios.get(`http://localhost:${PORT}/api/auth/status`);
    console.log(colors.green(`\nServidor está rodando na porta ${PORT}`));
  } catch (error) {
    console.log(colors.yellow(`\nAviso: Não foi possível verificar o status na rota /api/auth/status`));
    
    try {
      // Tentar uma rota alternativa
      await axios.get(`http://localhost:${PORT}/`);
      console.log(colors.green(`Servidor está respondendo na porta ${PORT}`));
    } catch (error2) {
      console.log(colors.red(`\nERRO: Servidor não está acessível na porta ${PORT}`));
      console.log(colors.yellow('Inicie o servidor antes de executar este teste:'));
      console.log(colors.yellow('  npm run dev'));
      console.log(colors.yellow('Detalhes do erro:', error2.message));
      process.exit(1);
    }
  }
  
  // Testar conexões
  console.log(colors.cyan('\n--- Teste de Conexões ---'));
  const results = [];
  
  for (const platform of platformsToTest) {
    const result = await testConnection(platform);
    results.push(result);
  }
  
  // Mostrar resumo
  console.log(colors.cyan('\n=== Resumo do Teste ==='));
  
  let connected = 0;
  let notConnected = 0;
  let errors = 0;
  
  for (const result of results) {
    if (result.status === 'connected') {
      console.log(colors.green(`✓ ${result.platform.toUpperCase()}: Conectado`));
      connected++;
    } else if (result.status === 'not_connected' || result.status === 'inactive') {
      console.log(colors.yellow(`⚠ ${result.platform.toUpperCase()}: Não conectado`));
      notConnected++;
    } else {
      console.log(colors.red(`✗ ${result.platform.toUpperCase()}: Erro - ${result.error}`));
      errors++;
    }
  }
  
  console.log(colors.cyan('\nResultados finais:'));
  console.log(colors.green(`- Plataformas conectadas: ${connected}`));
  console.log(colors.yellow(`- Plataformas não conectadas: ${notConnected}`));
  console.log(colors.red(`- Plataformas com erro: ${errors}`));
  
  // Instruções finais
  if (notConnected > 0) {
    console.log(colors.yellow('\nPara conectar plataformas:'));
    console.log(colors.yellow('1. Configure as credenciais no arquivo .env'));
    console.log(colors.yellow('2. Acesse a interface web em http://localhost:3000'));
    console.log(colors.yellow('3. Vá para a página de Mídias Sociais e clique em "Conectar"'));
    console.log(colors.yellow('4. Ou use as URLs de autenticação fornecidas acima'));
  }
  
  mongoose.disconnect();
}

main().catch(err => {
  console.error(colors.red('Erro durante a execução:'), err);
  mongoose.disconnect();
  process.exit(1);
});