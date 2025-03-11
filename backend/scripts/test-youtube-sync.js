// Script para testar a sincronização de dados do YouTube
// Path: /Users/rogerioresende/Desktop/lancei-essa-sistema/backend/scripts/test-youtube-sync.js

require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');
const YouTubeToken = require('../models/YouTubeToken');
const YouTubeVideo = require('../models/youtube/YouTubeVideo');
const YouTubeComment = require('../models/youtube/YouTubeComment');
const YouTubeSyncJob = require('../models/youtube/YouTubeSyncJob');
const youtubeSyncService = require('../services/youtube/sync');

// Configuração de interface de terminal
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Conectar ao MongoDB
async function connectToDB() {
  try {
    console.log('Conectando ao MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Conectado ao MongoDB com sucesso!');
    return true;
  } catch (error) {
    console.error('Erro ao conectar ao MongoDB:', error);
    return false;
  }
}

// Listar tokens disponíveis
async function listAvailableTokens() {
  try {
    const tokens = await YouTubeToken.find({ is_valid: true })
      .populate('user', 'name email')
      .select('+access_token +refresh_token');

    if (tokens.length === 0) {
      console.log('Nenhum token válido encontrado. Execute test-youtube-auth.js para criar um token.');
      return [];
    }

    console.log(`\nEncontrados ${tokens.length} tokens válidos:`);
    tokens.forEach((token, index) => {
      console.log(`[${index + 1}] Usuário: ${token.user ? token.user.email : token.user}`);
      console.log(`    Canal: ${token.channel_id || 'Não definido'}`);
      const expiryDate = new Date(token.expiry_date);
      console.log(`    Expira em: ${expiryDate.toLocaleString()}`);
      console.log('');
    });

    return tokens;
  } catch (error) {
    console.error('Erro ao listar tokens:', error);
    return [];
  }
}

// Criar job de sincronização
async function createSyncJob(userId, companyId, channelId) {
  try {
    // Verificar se já existe um job pendente ou em andamento
    const existingJob = await YouTubeSyncJob.findOne({
      user: userId,
      channel_id: channelId,
      status: { $in: ['pending', 'processing'] }
    });

    if (existingJob) {
      console.log(`\nJá existe um job pendente ou em andamento para este canal: ${existingJob._id} (${existingJob.status})`);
      return { job: existingJob, isNew: false };
    }

    // Criar novo job
    const job = await youtubeSyncService.scheduleSync({
      userId,
      companyId,
      channelId,
      jobType: 'full_sync',
      params: {
        include_comments: true,
        comment_limit: 50,
        limit: 30 // Limitar para teste
      },
      priority: 10, // Alta prioridade
      source: 'manual',
      initiatedBy: userId
    });

    console.log(`\nNovo job de sincronização criado com sucesso: ${job._id} (${job.status})`);
    return { job, isNew: true };
  } catch (error) {
    console.error('Erro ao criar job de sincronização:', error);
    throw error;
  }
}

// Monitorar progresso do job
async function monitorJobProgress(jobId) {
  let finished = false;
  let intervalId;

  try {
    intervalId = setInterval(async () => {
      if (finished) return;

      try {
        const job = await YouTubeSyncJob.findById(jobId);
        
        if (!job) {
          console.log('\nJob não encontrado!');
          clearInterval(intervalId);
          finished = true;
          return;
        }

        // Calcular percentual de progresso
        const progressPercent = job.progress.total_items > 0
          ? Math.round((job.progress.processed_items / job.progress.total_items) * 100)
          : 0;

        // Mostrar progresso
        console.log(`\nStatus: ${job.status} - Progresso: ${progressPercent}% (${job.progress.processed_items}/${job.progress.total_items})`);
        console.log(`Sucessos: ${job.progress.success_count}, Erros: ${job.progress.error_count}`);
        
        // Mostrar logs recentes
        if (job.logs && job.logs.length > 0) {
          const recentLogs = job.logs.slice(-3); // Últimos 3 logs
          console.log('\nLogs recentes:');
          recentLogs.forEach(log => {
            const date = new Date(log.timestamp).toLocaleTimeString();
            console.log(`[${date}] [${log.level}] ${log.message}`);
          });
        }

        // Verificar se o job terminou
        if (['completed', 'failed', 'canceled'].includes(job.status)) {
          console.log(`\nJob ${job.status}!`);
          
          if (job.status === 'completed') {
            // Mostrar estatísticas
            const videoCount = await YouTubeVideo.countDocuments({ 
              user: job.user,
              channel_id: job.channel_id 
            });
            
            const commentCount = await YouTubeComment.countDocuments({ 
              user: job.user,
              channel_id: job.channel_id 
            });
            
            console.log('\n=== RESULTADOS DA SINCRONIZAÇÃO ===');
            console.log(`Total de vídeos: ${videoCount}`);
            console.log(`Total de comentários: ${commentCount}`);
            
            // Mostrar alguns vídeos
            const videos = await YouTubeVideo.find({ 
              user: job.user,
              channel_id: job.channel_id 
            })
            .sort({ published_at: -1 })
            .limit(5);
            
            if (videos.length > 0) {
              console.log('\nÚltimos vídeos sincronizados:');
              videos.forEach(video => {
                console.log(`- ${video.title} (${video.video_id})`);
                console.log(`  Publicado: ${new Date(video.published_at).toLocaleString()}`);
                console.log(`  Visualizações: ${video.stats.views}, Likes: ${video.stats.likes}, Comentários: ${video.stats.comments}`);
              });
            }
          }
          
          if (job.error) {
            console.log('\nErro:', job.error.message);
          }
          
          // Terminar monitoramento
          clearInterval(intervalId);
          finished = true;
          rl.close();
          mongoose.connection.close();
        }
      } catch (error) {
        console.error('Erro ao buscar status do job:', error);
      }
    }, 3000); // Atualizar a cada 3 segundos
  } catch (error) {
    console.error('Erro ao iniciar monitoramento:', error);
    if (intervalId) clearInterval(intervalId);
    finished = true;
  }
}

// Função principal
async function main() {
  try {
    // Conectar ao banco de dados
    const connected = await connectToDB();
    if (!connected) {
      rl.close();
      return;
    }

    // Listar tokens disponíveis
    const tokens = await listAvailableTokens();
    if (tokens.length === 0) {
      rl.close();
      mongoose.connection.close();
      return;
    }

    // Selecionar token
    rl.question('\nSelecione um token para sincronização (número): ', async (answer) => {
      const index = parseInt(answer) - 1;
      
      if (isNaN(index) || index < 0 || index >= tokens.length) {
        console.log('Seleção inválida!');
        rl.close();
        mongoose.connection.close();
        return;
      }

      try {
        const selectedToken = tokens[index];
        console.log(`\nToken selecionado: Canal ${selectedToken.channel_id}`);

        // Criar ou retomar job de sincronização
        const { job, isNew } = await createSyncJob(
          selectedToken.user._id || selectedToken.user,
          selectedToken.company,
          selectedToken.channel_id
        );

        console.log('\nIniciando sincronização...');
        
        // Se for um novo job, iniciar processamento
        if (isNew) {
          await youtubeSyncService.executeJobInBackground(job._id);
        }

        // Iniciar monitoramento
        console.log('\nMonitorando progresso:');
        monitorJobProgress(job._id);

      } catch (error) {
        console.error('Erro ao iniciar sincronização:', error);
        rl.close();
        mongoose.connection.close();
      }
    });
  } catch (error) {
    console.error('Erro:', error);
    rl.close();
    mongoose.connection.close();
  }
}

// Executar
main();