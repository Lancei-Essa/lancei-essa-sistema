/**
 * Sistema de controle de taxa de requisições (Rate Limiting)
 * 
 * Esta classe implementa um sistema de controle para evitar exceder
 * limites de API de redes sociais e outros serviços externos.
 */

class RateLimiter {
  /**
   * Cria uma nova instância de controle de taxa
   * @param {string} service - Nome do serviço (ex: 'twitter', 'instagram')
   * @param {number} maxRequests - Número máximo de requisições
   * @param {number} timeWindow - Janela de tempo em milissegundos
   * @param {number} cooldown - Tempo de espera obrigatório entre requisições (ms)
   */
  constructor(service, maxRequests = 100, timeWindow = 60 * 60 * 1000, cooldown = 50) {
    this.service = service;
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.cooldown = cooldown;
    this.requestTimestamps = [];
    this.lastRequestTime = 0;
    this.queue = [];
    this.processing = false;

    console.log(`RateLimiter iniciado para ${service}: ${maxRequests} requisições a cada ${timeWindow/1000}s`);
  }

  /**
   * Verifica se uma nova requisição pode ser feita
   * @returns {boolean} - true se pode fazer requisição, false caso contrário
   */
  canMakeRequest() {
    const now = Date.now();
    
    // Limpar timestamps antigos fora da janela de tempo
    this.requestTimestamps = this.requestTimestamps.filter(
      timestamp => now - timestamp < this.timeWindow
    );
    
    // Verificar se atingiu o limite de requisições
    if (this.requestTimestamps.length >= this.maxRequests) {
      return false;
    }
    
    // Verificar cooldown entre requisições
    if (now - this.lastRequestTime < this.cooldown) {
      return false;
    }
    
    return true;
  }

  /**
   * Registra uma requisição feita
   */
  registerRequest() {
    const now = Date.now();
    this.requestTimestamps.push(now);
    this.lastRequestTime = now;
  }

  /**
   * Calcula o tempo de espera recomendado antes da próxima requisição
   * @returns {number} - Tempo em milissegundos
   */
  getWaitTime() {
    const now = Date.now();
    
    // Se atingiu o limite de requisições, calcular tempo até liberar uma vaga
    if (this.requestTimestamps.length >= this.maxRequests) {
      // Ordenar timestamps e pegar o mais antigo
      const oldestRequest = [...this.requestTimestamps].sort()[0];
      // Calcular quanto tempo falta para esse request sair da janela
      return (oldestRequest + this.timeWindow) - now;
    }
    
    // Se está no cooldown, calcular tempo restante
    if (now - this.lastRequestTime < this.cooldown) {
      return this.cooldown - (now - this.lastRequestTime);
    }
    
    return 0;
  }

  /**
   * Executa uma função respeitando as limitações de taxa
   * @param {Function} fn - Função a ser executada
   * @param {Array} args - Argumentos para a função
   * @returns {Promise<any>} - Resultado da função
   */
  async execute(fn, ...args) {
    return new Promise((resolve, reject) => {
      // Adicionar à fila
      this.queue.push({
        fn,
        args,
        resolve,
        reject
      });
      
      // Iniciar processamento se não estiver em andamento
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Processa a fila de execução
   */
  async processQueue() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }
    
    this.processing = true;
    
    if (this.canMakeRequest()) {
      const { fn, args, resolve, reject } = this.queue.shift();
      
      this.registerRequest();
      
      try {
        const result = await fn(...args);
        resolve(result);
      } catch (error) {
        reject(error);
      }
      
      // Processar próximo item da fila
      this.processQueue();
    } else {
      // Esperar antes de tentar novamente
      const waitTime = this.getWaitTime();
      console.log(`RateLimiter (${this.service}): Aguardando ${waitTime}ms antes da próxima requisição`);
      
      setTimeout(() => this.processQueue(), waitTime);
    }
  }

  /**
   * Limpa a fila e reseta o limitador
   */
  reset() {
    this.queue = [];
    this.requestTimestamps = [];
    this.lastRequestTime = 0;
    this.processing = false;
  }
}

// Criar instâncias para diferentes serviços
const limiters = {
  youtube: new RateLimiter('youtube', 100, 24 * 60 * 60 * 1000), // 100 requests por dia
  twitter: new RateLimiter('twitter', 1500, 15 * 60 * 1000, 100), // 1500 requests/15min (~100/min)
  instagram: new RateLimiter('instagram', 200, 60 * 60 * 1000), // 200 requests por hora
  linkedin: new RateLimiter('linkedin', 100, 60 * 60 * 1000), // 100 requests por hora
  tiktok: new RateLimiter('tiktok', 1000, 60 * 60 * 1000) // 1000 requests por hora
};

/**
 * Executa uma função com controle de taxa
 * @param {string} service - Nome do serviço
 * @param {Function} fn - Função a ser executada
 * @param  {...any} args - Argumentos para a função
 * @returns {Promise<any>} - Resultado da função
 */
const executeWithRateLimit = async (service, fn, ...args) => {
  if (!limiters[service]) {
    throw new Error(`Serviço não configurado: ${service}`);
  }
  
  return limiters[service].execute(fn, ...args);
};

module.exports = {
  RateLimiter,
  limiters,
  executeWithRateLimit
};