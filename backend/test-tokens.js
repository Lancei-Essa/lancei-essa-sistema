/**
 * Script de teste para o gerenciador de tokens
 * Verifica as funcionalidades básicas do tokenManager
 */

const mongoose = require('mongoose');
const tokenManager = require('./utils/tokenManager');
const User = require('./models/User');
const SpotifyToken = require('./models/SpotifyToken');
const TikTokToken = require('./models/TikTokToken');
const YouTubeToken = require('./models/YouTubeToken');
const TwitterToken = require('./models/TwitterToken');
const LinkedInToken = require('./models/LinkedInToken');
const InstagramToken = require('./models/InstagramToken');

// Carregar variáveis de ambiente
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lancei-essa';

// Conectar ao MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Conectado ao MongoDB'))
.catch(err => {
  console.error('Erro ao conectar ao MongoDB:', err);
  process.exit(1);
});

// Função principal de teste
const runTests = async () => {
  try {
    console.log('Iniciando testes do tokenManager...');

    // 1. Teste do Cache
    console.log('\n--- Teste de Cache ---');
    const userId = '60d5ec9f1c9d440000cbb7b1'; // ID fictício para teste
    
    // 1.1 Definir um token
    tokenManager.setToken(userId, 'test-platform', {
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      expiryDate: new Date(Date.now() + 3600000) // Token válido por 1 hora
    });
    
    // 1.2 Obter o token
    const cachedToken = tokenManager.getToken(userId, 'test-platform');
    console.log('Token em cache:', cachedToken ? 'Encontrado' : 'Não encontrado');
    
    // 1.3 Verificar expiração (deve ser falso, pois o token ainda é válido)
    const isExpired = tokenManager.isTokenExpired(userId, 'test-platform');
    console.log('Token expirado?', isExpired);
    
    // 1.4 Estatísticas do cache
    const stats = tokenManager.getCacheStats();
    console.log('Estatísticas do cache:', stats);
    
    // 1.5 Limpar token específico
    tokenManager.removeToken(userId, 'test-platform');
    console.log('Token removido do cache');
    
    // 2. Teste de inicialização de tokens para usuário real
    console.log('\n--- Teste de Inicialização de Tokens ---');
    
    // Obter um usuário real do banco de dados (para teste)
    const user = await User.findOne();
    
    if (user) {
      console.log(`Testando com usuário real: ${user._id}`);
      
      // Inicializar tokens para esse usuário
      const initResult = await tokenManager.initUserTokens(user._id);
      console.log('Resultado da inicialização:', initResult);
      
      // Estatísticas após inicialização
      const statsAfterInit = tokenManager.getCacheStats();
      console.log('Estatísticas após inicialização:', statsAfterInit);
    } else {
      console.log('Nenhum usuário encontrado no banco de dados para teste');
    }
    
    // 3. Teste básico de renovação de token (sem chamadas reais)
    console.log('\n--- Teste de Verificação de Token ---');
    
    if (user) {
      // Tenta verificar tokens para cada plataforma (sem realmente fazer chamadas externas)
      const platforms = ['youtube', 'twitter', 'linkedin', 'instagram', 'spotify', 'tiktok'];
      
      for (const platform of platforms) {
        try {
          console.log(`Verificando token para plataforma: ${platform}`);
          // Chama ensureFreshToken apenas para ver se funciona, sem expectativa de sucesso
          // pois podem não haver tokens para todas as plataformas
          const token = await tokenManager.ensureFreshToken(user._id, platform);
          console.log(`- Token para ${platform} encontrado e válido`);
        } catch (error) {
          console.log(`- Erro ao verificar token para ${platform}: ${error.message}`);
        }
      }
    }
    
    // 4. Limpeza do cache ao terminar
    console.log('\n--- Limpeza Final ---');
    tokenManager.clearCache();
    console.log('Cache limpo');
    
    console.log('\nTestes concluídos com sucesso!');
  } catch (error) {
    console.error('Erro durante os testes:', error);
  } finally {
    // Fechar conexão MongoDB
    await mongoose.connection.close();
    console.log('Conexão MongoDB fechada');
  }
};

// Executar testes
runTests();