const express = require('express');
const router = express.Router();

// ── Mock YouTube data ─────────────────────────────────────
const MOCK_VIDEOS = {
  'machine learning': [
    { id: 'ukzFI9rgwfU', title: 'Machine Learning for Everybody – Full Course', channel: 'freeCodeCamp.org', thumbnail: 'https://img.youtube.com/vi/ukzFI9rgwfU/mqdefault.jpg', views: '4.2M', duration: '3:52:08' },
    { id: 'i_LwzRVP7bg', title: 'Machine Learning Tutorial Python', channel: 'codebasics', thumbnail: 'https://img.youtube.com/vi/i_LwzRVP7bg/mqdefault.jpg', views: '1.8M', duration: '1:01:38' },
    { id: 'GwIo3gDZCVQ', title: 'Machine Learning Full Course', channel: 'Simplilearn', thumbnail: 'https://img.youtube.com/vi/GwIo3gDZCVQ/mqdefault.jpg', views: '2.1M', duration: '10:52:47' },
  ],
  'python': [
    { id: '_uQrJ0TkZlc', title: 'Python Tutorial - Python Full Course for Beginners', channel: 'Programming with Mosh', thumbnail: 'https://img.youtube.com/vi/_uQrJ0TkZlc/mqdefault.jpg', views: '33M', duration: '6:14:07' },
    { id: 'rfscVS0vtbw', title: 'Learn Python - Full Course for Beginners', channel: 'freeCodeCamp.org', thumbnail: 'https://img.youtube.com/vi/rfscVS0vtbw/mqdefault.jpg', views: '40M', duration: '4:26:52' },
    { id: 'kqtD5dpn9C8', title: 'Python for Beginners – Full Course', channel: 'freeCodeCamp.org', thumbnail: 'https://img.youtube.com/vi/kqtD5dpn9C8/mqdefault.jpg', views: '9M', duration: '4:52:31' },
  ],
  'javascript': [
    { id: 'PkZNo7MFNFg', title: 'Learn JavaScript - Full Course for Beginners', channel: 'freeCodeCamp.org', thumbnail: 'https://img.youtube.com/vi/PkZNo7MFNFg/mqdefault.jpg', views: '17M', duration: '3:26:42' },
    { id: 'W6NZfCO5SIk', title: 'JavaScript Tutorial for Beginners', channel: 'Programming with Mosh', thumbnail: 'https://img.youtube.com/vi/W6NZfCO5SIk/mqdefault.jpg', views: '8M', duration: '48:17' },
    { id: 'jS4aFq5-91M', title: 'JavaScript Full Course', channel: 'Dave Gray', thumbnail: 'https://img.youtube.com/vi/jS4aFq5-91M/mqdefault.jpg', views: '3M', duration: '8:08:48' },
  ],
  'react': [
    { id: 'bMknfKXIFA8', title: "React Course - Beginner's Tutorial", channel: 'freeCodeCamp.org', thumbnail: 'https://img.youtube.com/vi/bMknfKXIFA8/mqdefault.jpg', views: '9M', duration: '11:55:27' },
    { id: 'SqcY0GlETPk', title: 'React Tutorial for Beginners', channel: 'Programming with Mosh', thumbnail: 'https://img.youtube.com/vi/SqcY0GlETPk/mqdefault.jpg', views: '5M', duration: '1:20:00' },
    { id: 'j942wKiXFu8', title: 'React JS Crash Course', channel: 'Traversy Media', thumbnail: 'https://img.youtube.com/vi/j942wKiXFu8/mqdefault.jpg', views: '2M', duration: '1:48:45' },
  ],
  'data science': [
    { id: 'ua-CiDNNj30', title: 'Data Science Full Course', channel: 'freeCodeCamp.org', thumbnail: 'https://img.youtube.com/vi/ua-CiDNNj30/mqdefault.jpg', views: '3M', duration: '6:27:33' },
    { id: 'LHBE6uPs_iM', title: 'Python for Data Science', channel: 'freeCodeCamp.org', thumbnail: 'https://img.youtube.com/vi/LHBE6uPs_iM/mqdefault.jpg', views: '2M', duration: '12:10:00' },
  ],
  'node.js': [
    { id: 'ENrzD9HAZK4', title: 'Node.js and Express.js Full Course', channel: 'freeCodeCamp.org', thumbnail: 'https://img.youtube.com/vi/ENrzD9HAZK4/mqdefault.jpg', views: '3M', duration: '8:16:00' },
    { id: 'Oe421EPjeBE', title: 'Node.js Tutorial for Beginners', channel: 'Programming with Mosh', thumbnail: 'https://img.youtube.com/vi/Oe421EPjeBE/mqdefault.jpg', views: '5M', duration: '1:18:00' },
  ],
  'sql': [
    { id: 'HXV3zeQKqGY', title: 'SQL Tutorial - Full Database Course for Beginners', channel: 'freeCodeCamp.org', thumbnail: 'https://img.youtube.com/vi/HXV3zeQKqGY/mqdefault.jpg', views: '10M', duration: '4:20:00' },
    { id: 'p3qvj9hO_Bo', title: 'MySQL Tutorial for Beginners', channel: 'Programming with Mosh', thumbnail: 'https://img.youtube.com/vi/p3qvj9hO_Bo/mqdefault.jpg', views: '3M', duration: '3:10:00' },
  ],
};

const getMockVideos = (topic) => {
  const t = topic.toLowerCase().trim();
  for (const [key, videos] of Object.entries(MOCK_VIDEOS)) {
    if (t.includes(key) || key.includes(t)) {
      return videos.map(v => ({ ...v, source: 'youtube', sourceLabel: 'YouTube', sourceIcon: '▶️' }));
    }
  }
  return [
    { id: '_uQrJ0TkZlc', title: `${topic} - Full Course for Beginners`, channel: 'EduChannel', thumbnail: 'https://img.youtube.com/vi/_uQrJ0TkZlc/mqdefault.jpg', views: '1.2M', duration: '45:30', source: 'youtube', sourceLabel: 'YouTube', sourceIcon: '▶️' },
    { id: 'rfscVS0vtbw', title: `Learn ${topic} from Scratch`, channel: 'LearnFast', thumbnail: 'https://img.youtube.com/vi/rfscVS0vtbw/mqdefault.jpg', views: '850K', duration: '1:20:15', source: 'youtube', sourceLabel: 'YouTube', sourceIcon: '▶️' },
    { id: 'PkZNo7MFNFg', title: `${topic} Crash Course 2024`, channel: 'QuickLearn', thumbnail: 'https://img.youtube.com/vi/PkZNo7MFNFg/mqdefault.jpg', views: '670K', duration: '32:44', source: 'youtube', sourceLabel: 'YouTube', sourceIcon: '▶️' },
    { id: 'bMknfKXIFA8', title: `${topic} Tutorial for Beginners`, channel: 'TechEdu', thumbnail: 'https://img.youtube.com/vi/bMknfKXIFA8/mqdefault.jpg', views: '2.3M', duration: '58:12', source: 'youtube', sourceLabel: 'YouTube', sourceIcon: '▶️' },
  ];
};

// ── Safe fetch with timeout ───────────────────────────────
async function safeFetch(url, options = {}, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// ── 1. YouTube Data API ───────────────────────────────────
// Step 1: Search for videos (returns basic info only)
// Step 2: Fetch video statistics (views, likes, duration)
// Step 3: Sort by view count (most watched first)
async function fetchYouTube(topic) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key || key.includes('YOUR_') || key.length < 10) {
    console.log('  YouTube: using mock data (no API key)');
    return getMockVideos(topic);
  }
  try {
    // ── STEP 1: Search for videos by relevance ──
    // order=relevance → YouTube's own ranking algorithm
    // videoDuration=medium → filter out shorts (under 4 min) and very long videos
    // type=video → only videos, not playlists or channels
    const searchUrl = `https://www.googleapis.com/youtube/v3/search` +
      `?part=snippet` +
      `&q=${encodeURIComponent(topic + ' tutorial')}` +
      `&type=video` +
      `&maxResults=8` +                  // fetch 8, we'll sort and return best 5
      `&order=relevance` +               // YouTube's relevance ranking
      `&videoDuration=medium` +          // 4–20 minute videos (proper tutorials)
      `&relevanceLanguage=en` +          // prefer English results
      `&key=${key}`;

    const searchRes = await safeFetch(searchUrl);
    if (!searchRes.ok) {
      console.log('  YouTube API error:', searchRes.status);
      return getMockVideos(topic);
    }
    const searchData = await searchRes.json();
    if (!searchData.items?.length) return getMockVideos(topic);

    // Extract all video IDs from search results
    const videoIds = searchData.items.map(item => item.id.videoId).join(',');

    // ── STEP 2: Fetch real statistics for each video ──
    // This gives us: viewCount, likeCount, commentCount, duration
    const statsUrl = `https://www.googleapis.com/youtube/v3/videos` +
      `?part=statistics,contentDetails` +
      `&id=${videoIds}` +
      `&key=${key}`;

    const statsRes = await safeFetch(statsUrl);
    const statsData = await statsRes.json();

    // Build a lookup map: videoId → { views, likes, duration }
    const statsMap = {};
    if (statsData.items) {
      statsData.items.forEach(item => {
        const views    = parseInt(item.statistics?.viewCount  || 0);
        const likes    = parseInt(item.statistics?.likeCount  || 0);
        const duration = item.contentDetails?.duration || '';

        // Convert ISO 8601 duration (PT1H30M45S) → readable (1:30:45)
        const readable = parseDuration(duration);

        statsMap[item.id] = { views, likes, duration: readable };
      });
    }

    // ── STEP 3: Combine search results + statistics ──
    const videos = searchData.items.map(item => {
      const stats = statsMap[item.id.videoId] || { views: 0, likes: 0, duration: 'N/A' };
      return {
        id:          item.id.videoId,
        title:       item.snippet.title,
        channel:     item.snippet.channelTitle,
        thumbnail:   item.snippet.thumbnails.medium?.url || `https://img.youtube.com/vi/${item.id.videoId}/mqdefault.jpg`,
        viewCount:   stats.views,                          // raw number for sorting
        views:       formatViews(stats.views),             // "1.2M views" for display
        likes:       formatViews(stats.likes),             // "45K likes" for display
        duration:    stats.duration,
        source:      'youtube',
        sourceLabel: 'YouTube',
        sourceIcon:  '▶️',
        url:         `https://www.youtube.com/watch?v=${item.id.videoId}`,
      };
    });

    // ── STEP 4: Sort by view count (most watched first) ──
    // This ensures the most popular tutorial appears at the top
    videos.sort((a, b) => b.viewCount - a.viewCount);

    console.log(`  YouTube: got ${videos.length} results, sorted by views`);
    console.log(`  Top video: "${videos[0]?.title}" — ${videos[0]?.views}`);

    // Return top 5 after sorting
    return videos.slice(0, 5);

  } catch (err) {
    console.log('  YouTube fetch error:', err.message);
    return getMockVideos(topic);
  }
}

// ── Helper: Convert ISO 8601 → readable duration ──────────
// Input:  "PT1H30M45S"
// Output: "1:30:45"
function parseDuration(iso) {
  if (!iso) return 'N/A';
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 'N/A';
  const h = parseInt(match[1] || 0);
  const m = parseInt(match[2] || 0);
  const s = parseInt(match[3] || 0);
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
}

// ── Helper: Format view count → readable string ───────────
// Input:  1234567
// Output: "1.2M"
function formatViews(count) {
  if (!count || count === 0) return 'N/A';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000)     return `${(count / 1_000).toFixed(0)}K`;
  return String(count);
}

// ── 2. Internet Archive ───────────────────────────────────
async function fetchArchiveOrg(topic) {
  try {
    const q = encodeURIComponent(`${topic} lecture tutorial`);
    const url = `https://archive.org/advancedsearch.php?q=${q}+mediatype:(movies+OR+education)&fl[]=identifier,title,creator,description,downloads,year&sort[]=downloads+desc&rows=4&output=json`;
    const res = await safeFetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'InsightMint/1.0' }
    }, 7000);
    if (!res.ok) { console.log('  Archive.org error:', res.status); return []; }
    const data = await res.json();
    if (!data?.response?.docs?.length) return [];
    console.log(`  Archive.org: got ${data.response.docs.length} results`);
    return data.response.docs
      .filter(item => item.title && item.identifier)
      .map(item => ({
        id: `archive_${item.identifier}`,
        title: String(item.title).slice(0, 100),
        channel: Array.isArray(item.creator) ? item.creator[0] : (item.creator || 'Internet Archive'),
        thumbnail: `https://archive.org/services/img/${item.identifier}`,
        views: item.downloads ? `${Math.round(item.downloads/1000)}K downloads` : 'N/A',
        duration: 'N/A',
        description: String(item.description || '').replace(/<[^>]*>/g, '').slice(0, 120),
        year: item.year || '',
        source: 'archive', sourceLabel: 'Internet Archive', sourceIcon: '🏛️',
        url: `https://archive.org/details/${item.identifier}`,
        embedUrl: `https://archive.org/embed/${item.identifier}`,
      }));
  } catch (err) {
    console.log('  Archive.org fetch error:', err.message);
    return [];
  }
}

// ── 3. Dailymotion API ────────────────────────────────────
// Fetches videos sorted by view count (most watched first)
async function fetchDailymotion(topic) {
  try {
    const q = encodeURIComponent(topic + ' tutorial');

    // sort=visited → sort by total views (most watched first)
    // longer_than=120 → only videos longer than 2 minutes (real tutorials)
    const url = `https://api.dailymotion.com/videos` +
      `?search=${q}` +
      `&fields=id,title,thumbnail_240_url,views_total,duration,url,embed_url,owner.screenname` +
      `&limit=4` +
      `&sort=visited` +        // ← sort by most views
      `&language=en` +
      `&longer_than=120`;      // ← minimum 2 minutes

    const res = await safeFetch(url, { headers: { 'Accept': 'application/json' } }, 7000);
    if (!res.ok) { console.log('  Dailymotion error:', res.status); return []; }
    const data = await res.json();
    if (!data?.list?.length) return [];
    console.log(`  Dailymotion: got ${data.list.length} results sorted by views`);
    return data.list.map(v => ({
      id:          `dm_${v.id}`,
      title:       String(v.title || '').slice(0, 100),
      channel:     v['owner.screenname'] || 'Dailymotion',
      thumbnail:   v.thumbnail_240_url || '',
      viewCount:   v.views_total || 0,
      views:       v.views_total ? formatViews(v.views_total) : 'N/A',
      duration:    v.duration ? `${Math.floor(v.duration/60)}:${String(v.duration%60).padStart(2,'0')}` : 'N/A',
      source:      'dailymotion',
      sourceLabel: 'Dailymotion',
      sourceIcon:  '📺',
      url:         v.url,
      embedUrl:    v.embed_url || `https://www.dailymotion.com/embed/video/${v.id}`,
    }));
  } catch (err) {
    console.log('  Dailymotion fetch error:', err.message);
    return [];
  }
}

// ── Main search route ─────────────────────────────────────
router.get('/search', async (req, res) => {
  const { topic, source = 'all' } = req.query;
  if (!topic) return res.status(400).json({ error: 'Topic required' });

  console.log(`\n🔍 Searching for: "${topic}" [source=${source}]`);

  try {
    let ytVideos = [], archiveVideos = [], dmVideos = [];

    if (source === 'all' || source === 'youtube') {
      ytVideos = await fetchYouTube(topic);
    }
    if (source === 'all' || source === 'archive') {
      archiveVideos = await fetchArchiveOrg(topic);
    }
    if (source === 'all' || source === 'dailymotion') {
      dmVideos = await fetchDailymotion(topic);
    }

    const allVideos = [...ytVideos, ...archiveVideos, ...dmVideos];

    const sources = {
      youtube:     ytVideos.length,
      archive:     archiveVideos.length,
      dailymotion: dmVideos.length,
    };

    console.log(`✅ Total: ${allVideos.length} videos`, sources);

    res.json({ videos: allVideos, sources });
  } catch (err) {
    console.error('Search error:', err.message);
    res.json({ videos: getMockVideos(topic), sources: { youtube: 4, archive: 0, dailymotion: 0 } });
  }
});

module.exports = router;