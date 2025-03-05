const mongoose = require('mongoose');

const EpisodeSchema = new mongoose.Schema({
  number: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  guests: [{
    name: String,
    socialMedia: {
      instagram: String,
      linkedin: String,
      twitter: String
    }
  }],
  recordingDate: {
    type: Date,
    required: true
  },
  publishDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['planned', 'recorded', 'editing', 'published'],
    default: 'planned'
  },
  mediaLinks: {
    raw: String,
    edited: String,
    youtube: String,
    driveFolder: String
  },
  topics: [String],
  timestamps: [{
    time: String,
    description: String
  }],
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

module.exports = mongoose.model('Episode', EpisodeSchema);