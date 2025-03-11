const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const YouTubeVideoSchema = new Schema({
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
    required: true,
    index: true
  },
  
  // Dados básicos do vídeo
  video_id: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  thumbnail_url: {
    type: String
  },
  published_at: {
    type: Date,
    required: true,
    index: true
  },
  
  // Metadados adicionais
  tags: [String],
  category_id: String,
  duration: String, // Formato ISO 8601
  definition: String, // 'hd' ou 'sd'
  caption: Boolean, // Se tem legenda
  license: String,
  privacy_status: {
    type: String,
    enum: ['public', 'private', 'unlisted'],
    default: 'public'
  },
  
  // Estatísticas
  stats: {
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    favorites: { type: Number, default: 0 },
    comments: { type: Number, default: 0 }
  },
  
  // Histórico de estatísticas
  stats_history: [{
    date: { type: Date, required: true },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    favorites: { type: Number, default: 0 },
    comments: { type: Number, default: 0 }
  }],
  
  // Metadados de sincronização
  last_synced: {
    type: Date,
    default: Date.now
  },
  sync_status: {
    type: String,
    enum: ['pending', 'synced', 'error'],
    default: 'pending'
  },
  sync_error: String,
  
  // Campos para controle
  is_deleted: {
    type: Boolean,
    default: false
  },
  is_linked_to_episode: {
    type: Boolean,
    default: false
  },
  episode: {
    type: Schema.Types.ObjectId,
    ref: 'Episode'
  }
}, {
  timestamps: true
});

// Índice composto para busca eficiente
YouTubeVideoSchema.index({ user: 1, video_id: 1 }, { unique: true });
YouTubeVideoSchema.index({ company: 1, channel_id: 1, published_at: -1 });

// Método para atualizar estatísticas e salvar no histórico
YouTubeVideoSchema.methods.updateStats = async function(newStats) {
  // Adicionar estatísticas atuais ao histórico
  this.stats_history.push({
    date: new Date(),
    views: this.stats.views,
    likes: this.stats.likes,
    dislikes: this.stats.dislikes,
    favorites: this.stats.favorites,
    comments: this.stats.comments
  });
  
  // Limitar o histórico a 100 entradas para evitar crescimento excessivo
  if (this.stats_history.length > 100) {
    this.stats_history = this.stats_history.slice(-100);
  }
  
  // Atualizar estatísticas atuais
  this.stats = newStats;
  this.last_synced = new Date();
  this.sync_status = 'synced';
  
  return this.save();
};

// Método estático para encontrar vídeos que precisam de atualização
YouTubeVideoSchema.statics.findDueForSync = async function(options = {}) {
  const defaultOptions = {
    channel_id: null,      // Filtrar por canal específico
    user: null,            // Filtrar por usuário específico
    company: null,         // Filtrar por empresa específica  
    age: null,             // 'recent', 'medium', 'old' para diferentes frequências
    limit: 50,             // Número máximo de vídeos a retornar
    syncedBefore: null     // Data antes da qual os vídeos são considerados desatualizados
  };
  
  const { channel_id, user, company, age, limit, syncedBefore } = {
    ...defaultOptions,
    ...options
  };
  
  // Construir query base
  const query = { is_deleted: false };
  
  // Adicionar filtros opcionais
  if (channel_id) query.channel_id = channel_id;
  if (user) query.user = user;
  if (company) query.company = company;
  
  // Filtrar baseado na idade do vídeo (para diferentes frequências de sincronização)
  if (age) {
    const now = new Date();
    switch(age) {
      case 'recent': // Vídeos com menos de 7 dias
        const recentDate = new Date();
        recentDate.setDate(now.getDate() - 7);
        query.published_at = { $gte: recentDate };
        break;
      case 'medium': // Vídeos entre 7 e 30 dias
        const mediumStartDate = new Date();
        mediumStartDate.setDate(now.getDate() - 30);
        const mediumEndDate = new Date();
        mediumEndDate.setDate(now.getDate() - 7);
        query.published_at = { $gte: mediumStartDate, $lt: mediumEndDate };
        break;
      case 'old': // Vídeos com mais de 30 dias
        const oldDate = new Date();
        oldDate.setDate(now.getDate() - 30);
        query.published_at = { $lt: oldDate };
        break;
    }
  }
  
  // Filtrar por data de última sincronização
  if (syncedBefore) {
    query.last_synced = { $lt: syncedBefore };
  }
  
  return this.find(query)
    .sort({ last_synced: 1 }) // Priorizar os que não são sincronizados há mais tempo
    .limit(limit);
};

const YouTubeVideo = mongoose.model('YouTubeVideo', YouTubeVideoSchema);

module.exports = YouTubeVideo;