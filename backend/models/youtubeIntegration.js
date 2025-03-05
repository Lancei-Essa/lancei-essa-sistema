const mongoose = require('mongoose');

const YoutubeIntegrationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String,
    required: true
  },
  channelId: {
    type: String,
    required: true
  },
  tokenExpiry: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('YoutubeIntegration', YoutubeIntegrationSchema);