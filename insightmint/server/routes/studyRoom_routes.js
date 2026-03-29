const express  = require('express');
const router   = express.Router();
const auth     = require('../middleware/auth');
const crypto   = require('crypto');
const { StudyRoom, RoomMessage, RoomShare } = require('../models/StudyRoom');

// ── Helper: generate unique invite code ──────────────────────
const genCode = () => crypto.randomBytes(4).toString('hex').toUpperCase();

// ════════════════════════════════════════
//  ROOM MANAGEMENT
// ════════════════════════════════════════

// POST /api/study-rooms — Create room
router.post('/', auth, async (req, res) => {
  const { name, topic, description, visibility } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Room name required' });
  try {
    let inviteCode = null;
    if (visibility === 'private') {
      // ensure unique code
      let attempts = 0;
      do { inviteCode = genCode(); attempts++; }
      while (attempts < 5 && await StudyRoom.findOne({ inviteCode }));
    }
    const room = await StudyRoom.create({
      name, topic: topic || '', description: description || '',
      visibility: visibility || 'public',
      inviteCode,
      createdBy: req.userId,
      members: [{ userId: req.userId, name: req.userName || 'User', role: 'owner' }],
    });
    // System message
    await RoomMessage.create({
      roomId: room._id.toString(), senderId: 'system', senderName: 'System',
      type: 'system', content: `Room "${name}" created. Welcome! 🎉`,
    });
    res.status(201).json({ room: formatRoom(room) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/study-rooms — List public rooms
router.get('/', auth, async (req, res) => {
  try {
    const { topic, search } = req.query;
    const filter = { visibility: 'public', isActive: true };
    if (topic)  filter.topic  = { $regex: topic, $options: 'i' };
    if (search) filter.name   = { $regex: search, $options: 'i' };
    const rooms = await StudyRoom.find(filter)
      .sort({ lastActivity: -1 }).limit(30);
    res.json({ rooms: rooms.map(formatRoom) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/study-rooms/my — Rooms I belong to
router.get('/my', auth, async (req, res) => {
  try {
    const rooms = await StudyRoom.find({ 'members.userId': req.userId, isActive: true })
      .sort({ lastActivity: -1 });
    res.json({ rooms: rooms.map(formatRoom) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/study-rooms/:id — Room details
router.get('/:id', auth, async (req, res) => {
  try {
    const room = await StudyRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    const isMember = room.members.some(m => m.userId === req.userId);
    if (room.visibility === 'private' && !isMember)
      return res.status(403).json({ error: 'Private room — use invite code to join' });
    res.json({ room: formatRoom(room) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/study-rooms/join — Join via invite code
router.post('/join', auth, async (req, res) => {
  const { inviteCode, roomId, userName } = req.body;
  try {
    const query = inviteCode ? { inviteCode } : { _id: roomId };
    const room = await StudyRoom.findOne(query);
    if (!room) return res.status(404).json({ error: 'Room not found. Check your invite code.' });
    if (!room.isActive) return res.status(400).json({ error: 'This room is no longer active.' });
    if (room.members.length >= room.maxMembers)
      return res.status(400).json({ error: 'Room is full.' });

    const alreadyMember = room.members.some(m => m.userId === req.userId);
    if (!alreadyMember) {
      room.members.push({ userId: req.userId, name: userName || 'User', role: 'member' });
      room.lastActivity = new Date();
      await room.save();
      await RoomMessage.create({
        roomId: room._id.toString(), senderId: 'system', senderName: 'System',
        type: 'system', content: `${userName || 'Someone'} joined the room 👋`,
      });
    }
    res.json({ room: formatRoom(room), alreadyMember });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/study-rooms/:id/leave
router.delete('/:id/leave', auth, async (req, res) => {
  try {
    const room = await StudyRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    const member = room.members.find(m => m.userId === req.userId);
    if (!member) return res.status(400).json({ error: 'You are not in this room' });
    if (member.role === 'owner' && room.members.length > 1)
      return res.status(400).json({ error: 'Transfer ownership before leaving' });
    room.members = room.members.filter(m => m.userId !== req.userId);
    if (room.members.length === 0) room.isActive = false;
    await room.save();
    await RoomMessage.create({
      roomId: room._id.toString(), senderId: 'system', senderName: 'System',
      type: 'system', content: `${member.name} left the room.`,
    });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════
//  CHAT MESSAGES
// ════════════════════════════════════════

// GET /api/study-rooms/:id/messages
router.get('/:id/messages', auth, async (req, res) => {
  try {
    const room = await StudyRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    const isMember = room.members.some(m => m.userId === req.userId);
    if (!isMember) return res.status(403).json({ error: 'Join this room to see messages' });

    const { before, limit = 50 } = req.query;
    const query = { roomId: req.params.id };
    if (before) query.createdAt = { $lt: new Date(before) };
    const messages = await RoomMessage.find(query)
      .sort({ createdAt: -1 }).limit(parseInt(limit));
    res.json({ messages: messages.reverse().map(formatMessage) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/study-rooms/:id/messages
router.post('/:id/messages', auth, async (req, res) => {
  const { content, type, attachment, senderName } = req.body;
  if (!content?.trim() && !attachment) return res.status(400).json({ error: 'Message cannot be empty' });
  try {
    const room = await StudyRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    const member = room.members.find(m => m.userId === req.userId);
    if (!member) return res.status(403).json({ error: 'Join this room to send messages' });

    const msg = await RoomMessage.create({
      roomId:     req.params.id,
      senderId:   req.userId,
      senderName: senderName || member.name || 'User',
      type:       type || 'text',
      content:    content || '',
      attachment: attachment || null,
    });
    room.lastActivity = new Date();
    await room.save();
    res.status(201).json({ message: formatMessage(msg) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════
//  SHARED CONTENT
// ════════════════════════════════════════

// POST /api/study-rooms/:id/share
router.post('/:id/share', auth, async (req, res) => {
  const { type, data, title, sharerName } = req.body;
  if (!type || !data) return res.status(400).json({ error: 'Type and data required' });
  try {
    const room = await StudyRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    const member = room.members.find(m => m.userId === req.userId);
    if (!member) return res.status(403).json({ error: 'Join this room first' });

    const share = await RoomShare.create({
      roomId:     req.params.id,
      sharedBy:   req.userId,
      sharerName: sharerName || member.name,
      type, data, title: title || type,
    });
    // Also post as chat message
    const typeLabels = { note: '📝 Note', quiz: '🧠 Quiz Result', roadmap: '🗺️ Roadmap Progress' };
    await RoomMessage.create({
      roomId:     req.params.id,
      senderId:   req.userId,
      senderName: sharerName || member.name,
      type,
      content:    `Shared ${typeLabels[type] || type}: ${title || ''}`,
      attachment: { ...data, shareId: share._id.toString() },
    });
    room.lastActivity = new Date();
    await room.save();
    res.status(201).json({ share: formatShare(share) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/study-rooms/:id/shares
router.get('/:id/shares', auth, async (req, res) => {
  try {
    const shares = await RoomShare.find({ roomId: req.params.id })
      .sort({ createdAt: -1 }).limit(50);
    res.json({ shares: shares.map(formatShare) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Formatters ───────────────────────────────────────────────
const formatRoom = r => ({
  id:           r._id.toString(),
  name:         r.name,
  topic:        r.topic,
  description:  r.description,
  visibility:   r.visibility,
  inviteCode:   r.inviteCode || null,
  memberCount:  r.members.length,
  members:      r.members.map(m => ({ userId: m.userId, name: m.name, role: m.role, online: m.online })),
  createdBy:    r.createdBy,
  isActive:     r.isActive,
  lastActivity: r.lastActivity,
  createdAt:    r.createdAt,
});

const formatMessage = m => ({
  id:         m._id.toString(),
  roomId:     m.roomId,
  senderId:   m.senderId,
  senderName: m.senderName,
  type:       m.type,
  content:    m.content,
  attachment: m.attachment,
  createdAt:  m.createdAt,
});

const formatShare = s => ({
  id:         s._id.toString(),
  roomId:     s.roomId,
  sharedBy:   s.sharedBy,
  sharerName: s.sharerName,
  type:       s.type,
  data:       s.data,
  title:      s.title,
  createdAt:  s.createdAt,
});

module.exports = router;