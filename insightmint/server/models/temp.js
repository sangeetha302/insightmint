const mongoose = require('mongoose');

// ── Study Room ───────────────────────────────────────────────
const studyRoomSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  topic:       { type: String, default: '' },
  description: { type: String, default: '' },
  visibility:  { type: String, enum: ['public', 'private'], default: 'public' },
  inviteCode:  { type: String, unique: true, sparse: true },
  createdBy:   { type: String, required: true },
  members: [{
    userId:   String,
    name:     String,
    role:     { type: String, enum: ['owner', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
    online:   { type: Boolean, default: false },
  }],
  maxMembers:  { type: Number, default: 20 },
  isActive:    { type: Boolean, default: true },
  lastActivity:{ type: Date, default: Date.now },
}, { timestamps: true });

// ── Room Message ─────────────────────────────────────────────
const roomMessageSchema = new mongoose.Schema({
  roomId:      { type: String, required: true, index: true },
  senderId:    { type: String, required: true },
  senderName:  { type: String, required: true },
  type:        { type: String, enum: ['text', 'note', 'quiz', 'roadmap', 'system'], default: 'text' },
  content:     { type: String, default: '' },
  attachment:  { type: mongoose.Schema.Types.Mixed, default: null },
  // attachment shape depends on type:
  // note:    { title, content, topic }
  // quiz:    { topic, score, total, difficulty }
  // roadmap: { topic, progress, stages }
  createdAt:   { type: Date, default: Date.now },
});

// ── Shared Content ───────────────────────────────────────────
const roomShareSchema = new mongoose.Schema({
  roomId:     { type: String, required: true, index: true },
  sharedBy:   { type: String, required: true },
  sharerName: { type: String, required: true },
  type:       { type: String, enum: ['note', 'quiz', 'roadmap'], required: true },
  data:       { type: mongoose.Schema.Types.Mixed, required: true },
  title:      { type: String, default: '' },
  createdAt:  { type: Date, default: Date.now },
});

module.exports = {
  StudyRoom:    mongoose.models.StudyRoom    || mongoose.model('StudyRoom',    studyRoomSchema),
  RoomMessage:  mongoose.models.RoomMessage  || mongoose.model('RoomMessage',  roomMessageSchema),
  RoomShare:    mongoose.models.RoomShare    || mongoose.model('RoomShare',    roomShareSchema),
};