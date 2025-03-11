// Agendador para executar jobs de sincronização do YouTube periodicamente
// Path: /backend/services/youtube/scheduler.js

const YouTubeSyncJob = require('../../models/youtube/YouTubeSyncJob');
const youtubeSyncService = require('./sync');

/**
 * Agendador de sincronização do YouTube
 * Responsável por iniciar jobs pendentes periodicamente
 */
class YouTubeSyncScheduler {
  constructor() {
    this.running = false;
    this.intervalId = null;
    this.checkInterval = 5 * 60 * 1000; // 5 minutos
    this.maxConcurrentJobs = 2; // Número máximo de jobs simultâneos
    this.lastCheck = null;
  }

  /**
   * Inicia o agendador
   */
  start() {
    if (this.intervalId) {
      console.log('[YouTubeSyncScheduler] Agendador já está em execução');
      return;
    }

    console.log(`[YouTubeSyncScheduler] Iniciando agendador (intervalo: ${this.checkInterval / 60000} minutos)`);
    
    // Executar imediatamente
    this.checkPendingJobs();
    
    // Agendar verificações periódicas
    this.intervalId = setInterval(() => this.checkPendingJobs(), this.checkInterval);
  }

  /**
   * Para o agendador
   */
  stop() {
    if (this.intervalId) {
      console.log('[YouTubeSyncScheduler] Parando agendador');
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Verifica a existência de jobs pendentes e os inicia
   */
  async checkPendingJobs() {
    // Evitar execuções concorrentes
    if (this.running) {
      console.log('[YouTubeSyncScheduler] Verificação já em andamento, pulando...');
      return;
    }

    this.running = true;
    this.lastCheck = new Date();

    try {
      console.log('[YouTubeSyncScheduler] Verificando jobs pendentes...');
      
      // Verificar quantos jobs estão em execução
      const runningJobs = await YouTubeSyncJob.countDocuments({ status: 'processing' });
      console.log(`[YouTubeSyncScheduler] Jobs em execução: ${runningJobs}`);
      
      if (runningJobs >= this.maxConcurrentJobs) {
        console.log(`[YouTubeSyncScheduler] Limite de jobs concorrentes atingido (${runningJobs}/${this.maxConcurrentJobs})`);
        this.running = false;
        return;
      }

      // Calcular quantos jobs ainda podem ser iniciados
      const availableSlots = this.maxConcurrentJobs - runningJobs;
      
      // Buscar próximos jobs pendentes
      const pendingJobs = await YouTubeSyncJob.find({
        status: 'pending',
        scheduled_for: { $lte: new Date() }
      })
      .sort({ priority: -1, scheduled_for: 1 })
      .limit(availableSlots);

      if (pendingJobs.length === 0) {
        console.log('[YouTubeSyncScheduler] Nenhum job pendente encontrado');
        this.running = false;
        return;
      }

      console.log(`[YouTubeSyncScheduler] Encontrados ${pendingJobs.length} jobs pendentes`);
      
      // Iniciar cada job
      for (const job of pendingJobs) {
        console.log(`[YouTubeSyncScheduler] Iniciando processamento do job ${job._id} (${job.job_type})`);
        
        // Iniciar processamento em segundo plano
        youtubeSyncService.executeJobInBackground(job._id)
          .catch(error => {
            console.error(`[YouTubeSyncScheduler] Erro ao processar job ${job._id}:`, error);
          });
      }

    } catch (error) {
      console.error('[YouTubeSyncScheduler] Erro ao verificar jobs pendentes:', error);
    } finally {
      this.running = false;
    }
  }

  /**
   * Verifica jobs recorrentes e cria próximas execuções
   */
  async checkRecurringJobs() {
    if (this.running) {
      return;
    }

    this.running = true;

    try {
      console.log('[YouTubeSyncScheduler] Verificando jobs recorrentes...');
      
      // Buscar jobs recorrentes completados ou com falha
      const recurringJobs = await YouTubeSyncJob.find({
        is_recurring: true,
        status: { $in: ['completed', 'failed'] },
        'recurrence_config.next_execution': { $exists: true }
      });

      if (recurringJobs.length === 0) {
        console.log('[YouTubeSyncScheduler] Nenhum job recorrente encontrado');
        this.running = false;
        return;
      }

      console.log(`[YouTubeSyncScheduler] Encontrados ${recurringJobs.length} jobs recorrentes`);
      
      const now = new Date();
      let jobsCreated = 0;

      // Processar cada job recorrente
      for (const job of recurringJobs) {
        try {
          const nextExecution = new Date(job.recurrence_config.next_execution);
          
          // Se a próxima execução já passou, criar novo job
          if (nextExecution <= now) {
            // Verificar se já existe um job pendente ou em processamento para este canal/usuário
            const existingJob = await YouTubeSyncJob.findOne({
              user: job.user,
              channel_id: job.channel_id,
              job_type: job.job_type,
              status: { $in: ['pending', 'processing'] }
            });

            if (existingJob) {
              console.log(`[YouTubeSyncScheduler] Já existe um job pendente/em andamento para canal ${job.channel_id}`);
              continue;
            }

            // Criar próximo job
            const nextJob = await YouTubeSyncJob.createNextFromRecurring(job);
            
            if (nextJob) {
              console.log(`[YouTubeSyncScheduler] Criado novo job recorrente ${nextJob._id} para o canal ${job.channel_id}`);
              jobsCreated++;
            }
          }
        } catch (error) {
          console.error(`[YouTubeSyncScheduler] Erro ao processar job recorrente ${job._id}:`, error);
        }
      }

      console.log(`[YouTubeSyncScheduler] ${jobsCreated} novos jobs recorrentes criados`);

    } catch (error) {
      console.error('[YouTubeSyncScheduler] Erro ao verificar jobs recorrentes:', error);
    } finally {
      this.running = false;
    }
  }

  /**
   * Retorna status do agendador
   */
  getStatus() {
    return {
      running: !!this.intervalId,
      lastCheck: this.lastCheck,
      checkInterval: this.checkInterval,
      maxConcurrentJobs: this.maxConcurrentJobs
    };
  }
}

// Exportar instância singleton
const scheduler = new YouTubeSyncScheduler();
module.exports = scheduler;