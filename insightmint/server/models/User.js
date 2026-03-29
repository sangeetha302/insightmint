const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar:   { type: String, default: '' },
  learningHistory: [{
    topic:       String,
    videoId:     String,
    videoTitle:  String,
    thumbnail:   String,
    source:      { type: String, default: 'youtube' },
    embedUrl:    { type: String, default: '' },
    channel:     { type: String, default: '' },
    duration:    { type: String, default: '' },
    completedAt: { type: Date, default: Date.now },
    quizScore:   Number
  }],
  savedRoadmaps: [{
    topic:     String,
    roadmap:   [String],
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function(password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);