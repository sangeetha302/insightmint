const mongoose = require('mongoose');

// Stores all learning activity that was previously only in localStorage
const userDataSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },

  // Dashboard streak
  streak: {
    count:    { type: Number, default: 0 },
    lastDate: { type: String, default: '' },
  },

  // Study calendar sessions { "2024-01-15": [{title, duration, type}] }
  sessions: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },

  // Activity heatmap { "2024-01-15": 3 }
  activity: { type: Map, of: Number, default: {} },

  // Quiz history
  quizHistory: [{
    topic:    String,
    score:    Number,
    total:    Number,
    difficulty: String,
    date:     { type: Date, default: Date.now },
  }],

  // Roadmap progress { "python": { completed: ["item1","item2"], total: 10 } }
  roadmapProgress: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },

  // Roadmap history (list of generated roadmaps)
  roadmapHistory: [{
    topic:     String,
    stages:    mongoose.Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now },
  }],

  // Dashboard active roadmaps
  dashboardRoadmaps: [{ type: mongoose.Schema.Types.Mixed }],

  // Summarizer history
  summarizerHistory: [{
    title:     String,
    summary:   String,
    type:      String,
    createdAt: { type: Date, default: Date.now },
  }],

  // ML feature tracking
  tabUsage:   { type: Map, of: Number, default: {} },
  voiceUses:  { type: Number, default: 0 },

  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.models.UserData || mongoose.model('UserData', userDataSchema);