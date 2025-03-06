const mongoose = require('mongoose');

const YouTubeMetricsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  channelId: {
    type: String,
    required: true,
    index: true
  },
  date: {
    type: Date,
    default: Date.now,
    index: true
  },
  totalStats: {
    views: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    },
    comments: {
      type: Number,
      default: 0
    },
    subscribers: {
      type: Number,
      default: 0
    },
    videos: {
      type: Number,
      default: 0
    }
  },
  videosStats: [{
    videoId: {
      type: String,
      required: true
    },
    title: {
      type: String
    },
    publishedAt: {
      type: Date
    },
    views: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    },
    comments: {
      type: Number,
      default: 0
    }
  }],
  rawData: {
    type: mongoose.Schema.Types.Mixed,
    select: false  // Não retornar por padrão (economizar banda)
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Índices compostos para pesquisas comuns
YouTubeMetricsSchema.index({ company: 1, date: -1 });
YouTubeMetricsSchema.index({ user: 1, date: -1 });

// Método para calcular crescimento em relação à métrica anterior
YouTubeMetricsSchema.methods.calculateGrowth = async function(days = 7) {
  try {
    const currentDate = this.date;
    const previousDate = new Date(currentDate);
    previousDate.setDate(previousDate.getDate() - days);
    
    // Buscar métrica anterior mais próxima
    const previousMetric = await this.constructor.findOne({
      channelId: this.channelId,
      date: { $lt: currentDate, $gte: previousDate }
    }).sort({ date: -1 });
    
    if (!previousMetric) {
      return {
        views: 0,
        likes: 0,
        comments: 0,
        subscribers: 0,
        videos: 0
      };
    }
    
    // Calcular diferenças percentuais
    const growth = {
      views: calculatePercentage(this.totalStats.views, previousMetric.totalStats.views),
      likes: calculatePercentage(this.totalStats.likes, previousMetric.totalStats.likes),
      comments: calculatePercentage(this.totalStats.comments, previousMetric.totalStats.comments),
      subscribers: calculatePercentage(this.totalStats.subscribers, previousMetric.totalStats.subscribers),
      videos: calculatePercentage(this.totalStats.videos, previousMetric.totalStats.videos)
    };
    
    return growth;
  } catch (error) {
    console.error('Erro ao calcular crescimento:', error);
    return null;
  }
};

// Função auxiliar para calcular percentuais
function calculatePercentage(current, previous) {
  if (!previous || previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

// Método estático para obter métricas agregadas por período
YouTubeMetricsSchema.statics.getMetricsByPeriod = async function(channelId, startDate, endDate) {
  try {
    const metrics = await this.find({
      channelId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });
    
    // Preparar arrays para gráficos
    const labels = [];
    const views = [];
    const likes = [];
    const comments = [];
    const subscribers = [];
    
    metrics.forEach(metric => {
      labels.push(metric.date.toISOString().split('T')[0]);
      views.push(metric.totalStats.views);
      likes.push(metric.totalStats.likes);
      comments.push(metric.totalStats.comments);
      subscribers.push(metric.totalStats.subscribers);
    });
    
    return {
      labels,
      datasets: {
        views,
        likes,
        comments,
        subscribers
      }
    };
  } catch (error) {
    console.error('Erro ao obter métricas por período:', error);
    throw error;
  }
};

module.exports = mongoose.model('YouTubeMetrics', YouTubeMetricsSchema);