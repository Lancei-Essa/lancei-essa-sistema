// Inicializador do sistema de sincronização do YouTube
// Path: /backend/services/youtube/initializer.js

const youtubeSyncService = require('./sync');
const youtubeSyncScheduler = require('./scheduler');

/**
 * Responsável por inicializar o sistema de sincronização do YouTube
 */
class YouTubeSyncInitializer {
  constructor() {
    this.initialized = false;
    this.service = youtubeSyncService;
    this.scheduler = youtubeSyncScheduler;
    this.checkRecurringInterval = null;
  }

  /**
   * Inicializa o sistema de sincronização
   * @param {boolean} startScheduler - Se o agendador deve ser iniciado
   */
  initialize(startScheduler = true) {
    if (this.initialized) {
      console.log('[YouTubeSyncInitializer] Sistema já inicializado');
      return;
    }

    console.log('[YouTubeSyncInitializer] Iniciando sistema de sincronização do YouTube...');

    try {
      // Iniciar sistema
      this.initialized = true;

      // Iniciar agendador se solicitado
      if (startScheduler) {
        setTimeout(() => {
          console.log('[YouTubeSyncInitializer] Iniciando agendador de sincronização...');
          this.scheduler.start();

          // Configurar verificação periódica de jobs recorrentes (a cada hora)
          this.checkRecurringInterval = setInterval(() => {
            this.scheduler.checkRecurringJobs();
          }, 60 * 60 * 1000); // 1 hora
        }, 10000); // 10 segundos de delay para garantir que o sistema esteja pronto
      }

      console.log('[YouTubeSyncInitializer] Sistema de sincronização inicializado com sucesso');
      return true;
    } catch (error) {
      console.error('[YouTubeSyncInitializer] Erro ao inicializar sistema de sincronização:', error);
      this.initialized = false;
      return false;
    }
  }

  /**
   * Desliga o sistema de sincronização
   */
  shutdown() {
    if (!this.initialized) {
      return;
    }

    console.log('[YouTubeSyncInitializer] Desligando sistema de sincronização...');

    // Parar agendador
    this.scheduler.stop();

    // Parar verificação de jobs recorrentes
    if (this.checkRecurringInterval) {
      clearInterval(this.checkRecurringInterval);
      this.checkRecurringInterval = null;
    }

    this.initialized = false;
    console.log('[YouTubeSyncInitializer] Sistema de sincronização desligado');
  }

  /**
   * Retorna status do sistema
   */
  getStatus() {
    return {
      initialized: this.initialized,
      scheduler: this.scheduler.getStatus()
    };
  }

  /**
   * Força verificação de jobs pendentes
   */
  async forceSyncCheck() {
    if (!this.initialized) {
      console.log('[YouTubeSyncInitializer] Sistema não inicializado');
      return false;
    }

    await this.scheduler.checkPendingJobs();
    return true;
  }
}

// Exportar instância singleton
const initializer = new YouTubeSyncInitializer();
module.exports = initializer;