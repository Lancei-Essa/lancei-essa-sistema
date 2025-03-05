const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'token_warning',      // Aviso de token prestes a expirar
      'token_error',        // Erro com token (expirado, inválido)
      'token_renewed',      // Token renovado com sucesso
      'connection_error',   // Erro de conexão com plataforma
      'publication_success', // Publicação realizada com sucesso
      'publication_error',   // Erro ao publicar
      'publication_scheduled', // Publicação agendada
      'system_notification'  // Notificações gerais do sistema
    ]
  },
  platform: {
    type: String,
    enum: ['youtube', 'twitter', 'linkedin', 'instagram', 'spotify', 'tiktok', 'system'],
    default: 'system'
  },
  message: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['info', 'success', 'warning', 'error'],
    default: 'info'
  },
  read: {
    type: Boolean,
    default: false
  },
  actionLabel: {
    type: String,
    default: null
  },
  actionPath: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Notificações expiram após 30 dias por padrão
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 30);
      return expiry;
    }
  },
  metadata: {
    type: Object,
    default: {}
  }
});

// Índices para otimizar consultas
NotificationSchema.index({ user: 1, read: 1 });
NotificationSchema.index({ user: 1, createdAt: -1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index para expiração automática

// Método para obter notificações não lidas de um usuário
NotificationSchema.statics.getUnreadByUser = function(userId) {
  return this.find({
    user: userId,
    read: false
  }).sort({ createdAt: -1 });
};

// Método para obter todas as notificações de um usuário
NotificationSchema.statics.getAllByUser = function(userId, limit = 50) {
  return this.find({
    user: userId
  })
  .sort({ createdAt: -1 })
  .limit(limit);
};

// Método para marcar notificação como lida
NotificationSchema.statics.markAsRead = function(notificationId, userId) {
  return this.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { read: true },
    { new: true }
  );
};

// Método para marcar todas notificações como lidas
NotificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    { user: userId, read: false },
    { read: true }
  );
};

module.exports = mongoose.model('Notification', NotificationSchema);