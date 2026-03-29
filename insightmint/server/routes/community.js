const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// In-memory store (works without MongoDB)
let posts = [
  {
    id: '1', type: 'question', title: 'How to get started with React Hooks?', tag: 'React',
    content: "I'm new to React and confused about when to use useState vs useEffect. Can someone explain the key differences and best practices?",
    author: 'mantrisangeetha045', authorInitial: 'M', likes: 13, likedBy: [],
    replies: [
      { id: 'r1', content: 'useState is for managing local component state, while useEffect handles side effects like API calls, subscriptions, or DOM manipulation. useState triggers re-renders when state changes, useEffect runs after render.', author: 'reactdev', authorInitial: 'R', likes: 5, likedBy: [], createdAt: new Date(Date.now() - 3600000) },
      { id: 'r2', content: 'Great question! Think of useState as "remember this value" and useEffect as "do this after rendering". Start with useState for simple values, useEffect for anything that interacts with the outside world.', author: 'jsexpert', authorInitial: 'J', likes: 8, likedBy: [], createdAt: new Date(Date.now() - 1800000) }
    ],
    createdAt: new Date(Date.now() - 86400000 * 2), views: 145
  },
  {
    id: '2', type: 'tip', title: 'Best resources for learning Machine Learning in 2026', tag: 'Machine Learning',
    content: "I've compiled a list of the best free resources for learning ML:\n1. Andrew Ng's Coursera course\n2. Fast.ai\n3. Google's ML Crash Course\n4. Kaggle Learn\n5. Hugging Face tutorials\n\nAll are free and beginner-friendly!",
    author: 'mllearner', authorInitial: 'M', likes: 47, likedBy: [],
    replies: [{ id: 'r3', content: 'Great list! I would also add the Stanford CS229 lectures on YouTube.', author: 'airesearcher', authorInitial: 'A', likes: 3, likedBy: [], createdAt: new Date(Date.now() - 7200000) }],
    createdAt: new Date(Date.now() - 86400000 * 5), views: 312
  },
  {
    id: '3', type: 'discussion', title: 'Python vs JavaScript for beginners - which to learn first?', tag: 'Python',
    content: "I keep going back and forth on this. Python seems simpler but JS is everywhere on the web. What do you all think is the better starting point for someone with zero programming experience?",
    author: 'newcoder2026', authorInitial: 'N', likes: 29, likedBy: [],
    replies: [],
    createdAt: new Date(Date.now() - 86400000 * 1), views: 89
  },
  {
    id: '4', type: 'tip', title: 'How I memorized 50+ SQL queries using flashcards', tag: 'SQL',
    content: "After struggling with SQL for months, I found that making flashcards for each query type helped enormously. Front: 'Get top 5 highest salaries', Back: 'SELECT * FROM employees ORDER BY salary DESC LIMIT 5'. In 2 weeks I had all common queries memorized!",
    author: 'sqlmaster', authorInitial: 'S', likes: 62, likedBy: [],
    replies: [{ id: 'r4', content: 'This is exactly what InsightMint flashcards are for! Amazing approach.', author: 'studybuddy', authorInitial: 'S', likes: 11, likedBy: [], createdAt: new Date(Date.now() - 43200000) }],
    createdAt: new Date(Date.now() - 86400000 * 3), views: 201
  },
];

let nextId = 10;

// Get all posts
router.get('/', (req, res) => {
  const { type, search, sort = 'latest' } = req.query;
  let result = [...posts];
  if (type && type !== 'all') result = result.filter(p => p.type === type);
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(p => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q) || p.tag?.toLowerCase().includes(q));
  }
  if (sort === 'popular') result.sort((a, b) => b.likes - a.likes);
  else if (sort === 'most-replies') result.sort((a, b) => b.replies.length - a.replies.length);
  else result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ posts: result });
});

// Get single post
router.get('/:id', (req, res) => {
  const post = posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  post.views = (post.views || 0) + 1;
  res.json(post);
});

// Create post
router.post('/', auth, (req, res) => {
  const { title, content, type = 'discussion', tag, author: bodyAuthor } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'Title required' });
  if (!content || !content.trim()) return res.status(400).json({ error: 'Content required' });
  const userId = req.userId || 'guest';
  const author = bodyAuthor || `user_${userId.toString().slice(-6)}`;
  const post = {
    id: (nextId++).toString(), type: type || 'discussion',
    title: title.trim(), content: content.trim(), tag: tag || '',
    author, authorInitial: (author[0] || 'U').toUpperCase(),
    likes: 0, likedBy: [], replies: [], createdAt: new Date(), views: 0
  };
  posts.unshift(post);
  console.log('✅ New post created:', post.title, 'by', author);
  res.json(post);
});

// Like/unlike post
router.post('/:id/like', auth, (req, res) => {
  const post = posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const userId = req.userId;
  if (post.likedBy.includes(userId)) {
    post.likedBy = post.likedBy.filter(id => id !== userId);
    post.likes = Math.max(0, post.likes - 1);
  } else {
    post.likedBy.push(userId);
    post.likes++;
  }
  res.json({ likes: post.likes, liked: post.likedBy.includes(userId) });
});

// Add reply
router.post('/:id/reply', auth, (req, res) => {
  const post = posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content required' });
  const author = req.body.author || `user_${req.userId.toString().slice(-6)}`;
  const reply = {
    id: `r${nextId++}`, content, author,
    authorInitial: author[0].toUpperCase(),
    likes: 0, likedBy: [], createdAt: new Date()
  };
  post.replies.push(reply);
  res.json(reply);
});

// Like reply
router.post('/:id/reply/:rid/like', auth, (req, res) => {
  const post = posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const reply = post.replies.find(r => r.id === req.params.rid);
  if (!reply) return res.status(404).json({ error: 'Reply not found' });
  const userId = req.userId;
  if (reply.likedBy.includes(userId)) {
    reply.likedBy = reply.likedBy.filter(id => id !== userId);
    reply.likes = Math.max(0, reply.likes - 1);
  } else {
    reply.likedBy.push(userId);
    reply.likes++;
  }
  res.json({ likes: reply.likes, liked: reply.likedBy.includes(userId) });
});

// Delete post
router.delete('/:id', auth, (req, res) => {
  const idx = posts.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  posts.splice(idx, 1);
  res.json({ success: true });
});

module.exports = router;