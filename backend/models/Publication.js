const mongoose = require('mongoose');

const PublicationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  episode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Episode',
    required: true
  },
  platform: {
    type: String,
    required: true,
    enum: ['instagram', 'youtube', 'linkedin', 'twitter', 'facebook', 'tiktok', 'spotify']
  },
  contentType: {
    type: String,
    required: true,
    enum: ['full_episode', 'clip', 'image', 'text', 'story', 'playlist']
  },
  content: {
    title: String,
    description: String,
    mediaUrl: String,
    thumbnailUrl: String,
    episodeId: String, // Para publicações relacionadas ao Spotify
    hashtags: String, // Para hashtags do TikTok e outras plataformas
    privacyLevel: {
      type: String,
      enum: ['public', 'private', 'friends', 'unlisted']
    }
  },
  scheduledFor: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'published', 'failed'],
    default: 'draft'
  },
  publishedAt: {
    type: Date
  },
  metrics: {
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware para atualizar o campo updatedAt
PublicationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Método para atualizar métricas
PublicationSchema.methods.updateMetrics = async function(metricData) {
  try {
    // Atualizar apenas os campos fornecidos
    Object.keys(metricData).forEach(key => {
      if (key !== 'lastUpdated' && this.metrics.hasOwnProperty(key)) {
        this.metrics[key] = metricData[key];
      }
    });
    
    // Sempre atualizar a data da última atualização
    this.metrics.lastUpdated = Date.now();
    
    await this.save();
    return this.metrics;
  } catch (error) {
    console.error('Erro ao atualizar métricas da publicação:', error);
    throw error;
  }
};

module.exports = mongoose.model('Publication', PublicationSchema);