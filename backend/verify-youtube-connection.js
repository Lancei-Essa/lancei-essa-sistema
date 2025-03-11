// Script para verificar a conexão do YouTube
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { google } = require('googleapis');

// Carregar variáveis de ambiente
dotenv.config();

// Importar modelos
const YouTubeToken = require('./models/YouTubeToken');
const User = require('./models/User');

// Função para verificar a conexão
async function checkYouTubeConnection() {
  try {
    console.log('Conectando ao banco de dados...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado ao MongoDB com sucesso!');
    
    // Buscar todos os tokens do YouTube
    console.log('\nBuscando tokens do YouTube...');
    const tokens = await YouTubeToken.find();
    
    console.log(`Encontrados ${tokens.length} token(s) no banco de dados.`);
    
    if (tokens.length === 0) {
      console.log('⚠️ Nenhum token do YouTube encontrado no banco de dados.');
      return;
    }
    
    // Para cada token, verificar status e tentar acessar informações do canal
    for (const token of tokens) {
      console.log('\n--------------------------------------------');
      console.log(`Verificando token de ID: ${token._id}`);
      
      // Buscar usuário associado
      const user = await User.findById(token.user);
      console.log(`👤 Usuário: ${user ? user.name : 'Desconhecido'} (${token.user})`);
      
      // Verificar se o token está expirado
      const now = Date.now();
      const expiresAt = new Date(token.expires_at).getTime();
      const isExpired = now > expiresAt;
      
      console.log(`📆 Expira em: ${new Date(token.expires_at).toLocaleString()}`);
      console.log(`🔑 Status: ${isExpired ? '❌ Expirado' : '✅ Válido'}`);
      console.log(`📺 ID do Canal: ${token.channel_id || 'Não disponível'}`);
      
      // Log detalhado do token (substituindo valores sensíveis)
      console.log('\nInformações do token:');
      console.log(`- access_token: ${token.access_token ? '***' + token.access_token.substr(-6) : 'Não disponível'}`);
      console.log(`- refresh_token: ${token.refresh_token ? '***' + token.refresh_token.substr(-6) : 'Não disponível'}`);
      console.log(`- last_refreshed: ${token.last_refreshed ? new Date(token.last_refreshed).toLocaleString() : 'Nunca'}`);
      console.log(`- is_demo: ${token.is_demo ? 'Sim (simulação)' : 'Não (real)'}`);
      console.log(`- is_valid: ${token.is_valid ? 'Sim' : 'Não'}`);
      
      // Se o token está válido, tentar obter informações do canal
      if (!isExpired) {
        try {
          // Configurar cliente OAuth2
          const oauth2Client = new google.auth.OAuth2(
            process.env.YOUTUBE_CLIENT_ID,
            process.env.YOUTUBE_CLIENT_SECRET,
            process.env.YOUTUBE_REDIRECT_URI
          );
          
          // Configurar credenciais com o token
          oauth2Client.setCredentials({
            access_token: token.access_token,
            refresh_token: token.refresh_token
          });
          
          // Criar cliente do YouTube
          const youtube = google.youtube({
            version: 'v3',
            auth: oauth2Client
          });
          
          // Buscar informações do canal
          console.log('\n📡 Tentando acessar a API do YouTube...');
          const channelResponse = await youtube.channels.list({
            part: 'snippet,statistics',
            id: token.channel_id || 'mine'
          });
          
          if (channelResponse.data.items && channelResponse.data.items.length > 0) {
            const channel = channelResponse.data.items[0];
            console.log('\n✅ Conexão com YouTube bem-sucedida!');
            console.log('📊 Dados do canal:');
            console.log(`- Título: ${channel.snippet.title}`);
            console.log(`- Descrição: ${channel.snippet.description?.substring(0, 50)}...`);
            console.log(`- Inscritos: ${channel.statistics.subscriberCount}`);
            console.log(`- Visualizações: ${channel.statistics.viewCount}`);
            console.log(`- Vídeos: ${channel.statistics.videoCount}`);
          } else {
            console.log('⚠️ Nenhum canal encontrado com este ID');
          }
        } catch (apiError) {
          console.error(`❌ Erro ao acessar a API do YouTube: ${apiError.message}`);
          console.error('O token pode precisar ser revalidado.');
        }
      }
    }
    
    // Desconectar do MongoDB
    await mongoose.disconnect();
    console.log('\nDesconectado do MongoDB');
    
  } catch (error) {
    console.error('Erro ao verificar conexão do YouTube:', error);
  }
}

// Executar a verificação
checkYouTubeConnection();