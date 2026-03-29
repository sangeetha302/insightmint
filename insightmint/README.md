# 🌱 InsightMint

> AI-powered educational platform that transforms YouTube videos into complete learning experiences.

![InsightMint](https://img.shields.io/badge/InsightMint-AI%20Learning-14b8a6?style=flat-square)
![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-optional-47A248?style=flat-square&logo=mongodb)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔍 **Topic Search** | Find top 5 educational YouTube videos for any topic |
| 🎬 **Video Learning** | Embedded player with AI-generated study notes |
| 🃏 **Flashcards** | Auto-generated flip cards for active recall |
| 📝 **Quiz** | Multiple-choice quiz with instant explanations |
| 🗺️ **Roadmap** | Personalized learning path with milestones |
| 💬 **AI Tutor** | Chat assistant for topic-specific Q&A |
| 📄 **PDF Export** | Download study notes as a formatted PDF |
| 👤 **User System** | Signup, login, and learning history dashboard |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm 9+
- MongoDB (optional — app runs without it using in-memory storage)

### Option A: Automated setup
```bash
chmod +x setup.sh && ./setup.sh
npm run dev
```

### Option B: Manual setup
```bash
# 1. Install all dependencies
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# 2. Start the app
npm run dev
```

Then open **http://localhost:5173** in your browser! 🎉

---

## 📁 Project Structure

```
insightmint/
├── client/                     # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx      # Navigation bar
│   │   │   ├── Flashcards.jsx  # Flashcard component
│   │   │   ├── Quiz.jsx        # Quiz component
│   │   │   ├── Roadmap.jsx     # Learning roadmap
│   │   │   └── ChatBot.jsx     # AI tutor chat
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx # Hero + trending topics
│   │   │   ├── ExplorePage.jsx # Topic search + video list
│   │   │   ├── VideoLearningPage.jsx # Player + learning tools
│   │   │   ├── AuthPage.jsx    # Login / Signup
│   │   │   └── Dashboard.jsx   # User progress dashboard
│   │   ├── context/
│   │   │   └── AuthContext.jsx # Authentication state
│   │   └── utils/
│   │       ├── api.js          # Axios API helpers
│   │       └── pdf.js          # PDF generation
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── server/                     # Node.js + Express backend
│   ├── routes/
│   │   ├── auth.js             # Login / Signup endpoints
│   │   ├── videos.js           # YouTube video search
│   │   ├── ai.js               # AI content generation
│   │   └── user.js             # User profile & progress
│   ├── models/
│   │   └── User.js             # MongoDB user schema
│   ├── middleware/
│   │   └── auth.js             # JWT middleware
│   ├── .env                    # Environment variables
│   └── package.json
│
├── package.json                # Root - runs both servers
└── README.md
```

---

## ⚙️ Configuration

Edit `server/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/insightmint
JWT_SECRET=your_secret_key_here
YOUTUBE_API_KEY=YOUR_YOUTUBE_API_KEY_HERE   # Optional
```

### YouTube API Key (optional)
Without a key, the app uses **curated mock videos** for popular topics (Python, React, ML, JavaScript). The full learning experience still works!

To enable real YouTube search:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable the **YouTube Data API v3**
3. Create an API key and add it to `server/.env`

### MongoDB (optional)
Without MongoDB, the app uses in-memory storage — data resets on server restart. To persist data, install MongoDB locally or use [MongoDB Atlas](https://www.mongodb.com/atlas).

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Create new account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/videos/search?topic=` | Fetch educational videos |
| POST | `/api/ai/summary` | Generate summary + notes |
| POST | `/api/ai/flashcards` | Generate flashcards |
| POST | `/api/ai/quiz` | Generate quiz questions |
| POST | `/api/ai/roadmap` | Generate learning roadmap |
| POST | `/api/ai/chat` | AI tutor chat response |
| GET | `/api/user/profile` | Get user profile (auth) |
| POST | `/api/user/progress` | Save learning progress (auth) |

---

## 🎨 Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Router, Framer Motion
- **Backend**: Node.js, Express
- **Database**: MongoDB (Mongoose) with in-memory fallback
- **Auth**: JWT tokens, bcrypt
- **Fonts**: Syne (display) + DM Sans (body)
- **PDF**: jsPDF + jspdf-autotable

---

## 🛠️ Development

Both servers run concurrently:
- **Frontend**: http://localhost:5173 (Vite dev server)
- **Backend**: http://localhost:5000 (Express API)

The Vite dev server proxies `/api/*` requests to the Express server automatically.
