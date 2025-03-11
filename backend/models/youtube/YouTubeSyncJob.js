const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const YouTubeSyncJobSchema = new Schema({
  // Associações
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  company: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  channel_id: {
    type: String,
    required: true
  },
  
  // Configuração do job
  job_type: {
    type: String,
    enum: ['full_sync', 'incremental_sync', 'stats_update', 'comments_sync'],
    required: true
  },
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  },
  
  // Parâmetros do job
  params: {
    limit: Number,              // Limite de itens a processar
    since_date: Date,           // Data a partir da qual sincronizar
    specific_video_ids: [String], // Vídeos específicos a sincronizar
    include_comments: Boolean,  // Se deve sincronizar comentários
    comment_limit: Number       // Limite de comentários por vídeo
  },
  
  // Status e progresso
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'canceled'],
    default: 'pending'
  },
  progress: {
    total_items: { type: Number, default: 0 },
    processed_items: { type: Number, default: 0 },
    success_count: { type: Number, default: 0 },
    error_count: { type: Number, default: 0 }
  },
  
  // Logs e erros
  logs: [{
    timestamp: { type: Date, default: Date.now },
    level: { type: String, enum: ['info', 'warning', 'error'] },
    message: String
  }],
  error: {
    message: String,
    stack: String,
    code: String
  },
  
  // Agendamento e execução
  scheduled_for: {
    type: Date,
    default: Date.now
  },
  started_at: Date,
  completed_at: Date,
  duration_ms: Number,
  
  // Origem do job
  source: {
    type: String,
    enum: ['manual', 'scheduled', 'webhook', 'dependency'],
    default: 'manual'
  },
  initiated_by: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Metadados
  is_recurring: {
    type: Boolean,
    default: false
  },
  recurrence_config: {
    frequency: { type: String, enum: ['hourly', 'daily', 'weekly'] },
    interval: { type: Number, default: 1 }, // A cada X horas/dias/semanas
    next_execution: Date
  }
}, {
  timestamps: true
});

// Índices para consultas eficientes
YouTubeSyncJobSchema.index({ user: 1, status: 1, scheduled_for: 1 });
YouTubeSyncJobSchema.index({ company: 1, channel_id: 1, status: 1 });
YouTubeSyncJobSchema.index({ status: 1, scheduled_for: 1 }); // Para o scheduler

// Método para iniciar o job
YouTubeSyncJobSchema.methods.start = async function() {
  this.status = 'processing';
  this.started_at = new Date();
  this.logs.push({
    level: 'info',
    message: `Job iniciado: ${this.job_type}`
  });
  return this.save();
};

// Método para atualizar o progresso
YouTubeSyncJobSchema.methods.updateProgress = async function(itemsProcessed, successCount, errorCount) {
  this.progress.processed_items = itemsProcessed || this.progress.processed_items;
  this.progress.success_count = successCount || this.progress.success_count;
  this.progress.error_count = errorCount || this.progress.error_count;
  
  // Calcular porcentagem de progresso
  const percentComplete = this.progress.total_items > 0
    ? Math.round((this.progress.processed_items / this.progress.total_items) * 100)
    : 0;
  
  this.logs.push({
    level: 'info',
    message: `Progresso: ${percentComplete}% (${this.progress.processed_items}/${this.progress.total_items})`
  });
  
  return this.save();
};

// Método para adicionar log
YouTubeSyncJobSchema.methods.addLog = async function(level, message) {
  this.logs.push({ level, message });
  return this.save();
};

// Método para completar o job
YouTubeSyncJobSchema.methods.complete = async function() {
  this.status = 'completed';
  this.completed_at = new Date();
  this.duration_ms = this.completed_at - this.started_at;
  
  this.logs.push({
    level: 'info',
    message: `Job concluído: ${this.job_type}. Duração: ${this.duration_ms}ms`
  });
  
  // Se for recorrente, agendar próxima execução
  if (this.is_recurring && this.recurrence_config) {
    this.scheduleNextExecution();
  }
  
  return this.save();
};

// Método para falhar o job
YouTubeSyncJobSchema.methods.fail = async function(error) {
  this.status = 'failed';
  this.completed_at = new Date();
  this.duration_ms = this.completed_at - this.started_at;
  
  this.error = {
    message: error.message,
    stack: error.stack,
    code: error.code
  };
  
  this.logs.push({
    level: 'error',
    message: `Job falhou: ${error.message}`
  });
  
  // Se for recorrente, ainda agendar próxima execução mesmo após falha
  if (this.is_recurring && this.recurrence_config) {
    this.scheduleNextExecution();
  }
  
  return this.save();
};

// Método para cancelar o job
YouTubeSyncJobSchema.methods.cancel = async function(reason) {
  this.status = 'canceled';
  this.completed_at = new Date();
  
  this.logs.push({
    level: 'warning',
    message: `Job cancelado: ${reason || 'Sem motivo especificado'}`
  });
  
  return this.save();
};

// Método para agendar próxima execução
YouTubeSyncJobSchema.methods.scheduleNextExecution = function() {
  if (!this.is_recurring || !this.recurrence_config) return;
  
  const now = new Date();
  let nextExecution = new Date(now);
  
  switch (this.recurrence_config.frequency) {
    case 'hourly':
      nextExecution.setHours(now.getHours() + this.recurrence_config.interval);
      break;
    case 'daily':
      nextExecution.setDate(now.getDate() + this.recurrence_config.interval);
      break;
    case 'weekly':
      nextExecution.setDate(now.getDate() + (this.recurrence_config.interval * 7));
      break;
  }
  
  this.recurrence_config.next_execution = nextExecution;
};

// Método estático para criar uma cópia para o próximo agendamento
YouTubeSyncJobSchema.statics.createNextFromRecurring = async function(recurringJob) {
  // Verificar se o job é recorrente e tem próxima execução configurada
  if (!recurringJob.is_recurring || 
      !recurringJob.recurrence_config || 
      !recurringJob.recurrence_config.next_execution) {
    return null;
  }
  
  // Criar novo job com base no recorrente
  const nextJob = new this({
    user: recurringJob.user,
    company: recurringJob.company,
    channel_id: recurringJob.channel_id,
    job_type: recurringJob.job_type,
    priority: recurringJob.priority,
    params: { ...recurringJob.params },
    scheduled_for: recurringJob.recurrence_config.next_execution,
    source: 'scheduled',
    initiated_by: recurringJob.initiated_by,
    is_recurring: true,
    recurrence_config: { ...recurringJob.recurrence_config }
  });
  
  // Resetar campos específicos de execução
  nextJob.logs = [{
    level: 'info',
    message: `Job recorrente agendado para: ${nextJob.scheduled_for}`
  }];
  
  await nextJob.save();
  return nextJob;
};

// Método estático para encontrar jobs pendentes
YouTubeSyncJobSchema.statics.findPendingJobs = async function() {
  const now = new Date();
  
  return this.find({
    status: 'pending',
    scheduled_for: { $lte: now }
  })
  .sort({ priority: -1, scheduled_for: 1 })
  .limit(10);
};

const YouTubeSyncJob = mongoose.model('YouTubeSyncJob', YouTubeSyncJobSchema);

module.exports = YouTubeSyncJob;