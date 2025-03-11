const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const YouTubeCommentSchema = new Schema({
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
  video_id: {
    type: String,
    required: true,
    index: true
  },
  channel_id: {
    type: String,
    required: true,
    index: true
  },
  
  // Dados do comentário
  comment_id: {
    type: String,
    required: true,
    index: true
  },
  parent_id: {
    type: String,
    default: null,
    index: true
  },
  author_name: {
    type: String,
    required: true
  },
  author_channel_id: {
    type: String
  },
  author_profile_image: String,
  text: {
    type: String,
    required: true
  },
  published_at: {
    type: Date,
    required: true,
    index: true
  },
  updated_at: Date,
  
  // Estatísticas
  like_count: {
    type: Number,
    default: 0
  },
  
  // Resposta do canal (se o proprietário do canal respondeu)
  is_replied: {
    type: Boolean,
    default: false
  },
  reply_id: String,
  
  // Flags para moderação
  is_inappropriate: {
    type: Boolean,
    default: false
  },
  requires_action: {
    type: Boolean,
    default: false
  },
  moderation_notes: String,
  
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
  
  // Status do comentário
  is_deleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Índice composto para busca eficiente
YouTubeCommentSchema.index({ user: 1, comment_id: 1 }, { unique: true });
YouTubeCommentSchema.index({ video_id: 1, published_at: -1 });
YouTubeCommentSchema.index({ channel_id: 1, published_at: -1 });
YouTubeCommentSchema.index({ requires_action: 1 });

// Método para marcar um comentário como respondido
YouTubeCommentSchema.methods.markAsReplied = async function(replyId) {
  this.is_replied = true;
  this.reply_id = replyId;
  return this.save();
};

// Método para atualizar o status de moderação
YouTubeCommentSchema.methods.updateModeration = async function(options = {}) {
  const { isInappropriate, requiresAction, notes } = options;
  
  if (typeof isInappropriate === 'boolean') this.is_inappropriate = isInappropriate;
  if (typeof requiresAction === 'boolean') this.requires_action = requiresAction;
  if (notes) this.moderation_notes = notes;
  
  return this.save();
};

// Método estático para encontrar comentários não moderados
YouTubeCommentSchema.statics.findUnmoderatedComments = async function(options = {}) {
  const defaultOptions = {
    channel_id: null,      // Filtrar por canal específico
    video_id: null,        // Filtrar por vídeo específico
    user: null,            // Filtrar por usuário específico
    company: null,         // Filtrar por empresa específica  
    since: null,           // Data a partir da qual buscar comentários
    limit: 50              // Número máximo de comentários a retornar
  };
  
  const { channel_id, video_id, user, company, since, limit } = {
    ...defaultOptions,
    ...options
  };
  
  // Construir query base
  const query = { 
    is_deleted: false,
    requires_action: false,
    is_inappropriate: false 
  };
  
  // Adicionar filtros opcionais
  if (channel_id) query.channel_id = channel_id;
  if (video_id) query.video_id = video_id;
  if (user) query.user = user;
  if (company) query.company = company;
  
  // Filtrar por data
  if (since) {
    query.published_at = { $gte: since };
  }
  
  return this.find(query)
    .sort({ published_at: -1 }) // Mais recentes primeiro
    .limit(limit);
};

const YouTubeComment = mongoose.model('YouTubeComment', YouTubeCommentSchema);

module.exports = YouTubeComment;