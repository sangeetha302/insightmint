const mongoose = require('mongoose');

const summarizerHistorySchema = new mongoose.Schema({
  userId:      { type: String, required: true, index: true },
  type:        { type: String, default: 'text' }, // text, file, youtube, url, image
  title:       { type: String, default: 'Summary' },
  source:      { type: String, default: '' },
  summary:     { type: String, default: '' },      // full summary stored
  thumbnail:   { type: String, default: null },
  channelName: { type: String, default: null },
  videoId:     { type: String, default: null },
  fileLabel:   { type: String, default: null },
  language:    { type: String, default: 'en' },
  createdAt:   { type: Date, default: Date.now },
});

module.exports = mongoose.models.SummarizerHistory ||
  mongoose.model('SummarizerHistory', summarizerHistorySchema);