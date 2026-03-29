import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import Navbar from './components/Navbar';
import VoiceFAB from './components/VoiceFAB';
import FeedbackFAB from './components/FeedbackFAB';
import BackButton from './components/BackButton';
import AuthModal from './components/AuthModal';
import LandingPage from './pages/LandingPage';
import ExplorePage from './pages/ExplorePage';
import VideoLearningPage from './pages/VideoLearningPage';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import NotesPage from './pages/NotesPage';
import SummarizerPage from './pages/SummarizerPage';
import RoadmapPage from './pages/RoadmapPage';
import QuizPage from './pages/QuizPage';
import ProfilePage from './pages/ProfilePage';
import CommunityPage from './pages/CommunityPage';
import NLPAnalyzerPage from './pages/NLPAnalyzerPage';
import LearningStylePage from './pages/LearningStylePage';
import RecommendPage from './pages/RecommendPage';
import FeedbackPage from './pages/FeedbackPage';
import EvaluatePage from './pages/EvaluatePage';
import ExamHistoryPage from './pages/ExamHistoryPage';
import StudyBuddyPage from './pages/StudyBuddyPage'; // ← NEW
import StudyRoomPage from './pages/StudyRoomPage';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const [showModal, setShowModal] = useState(true);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"
         style={{ background: 'var(--bg-primary)' }}>
      <div className="w-8 h-8 rounded-full animate-spin"
           style={{ border: '2px solid var(--border-default)', borderTopColor: 'var(--accent-primary)' }} />
    </div>
  );

  if (isAuthenticated) return children;

  const wasLoggedIn = !!localStorage.getItem('insightmint_user');

  return (
    <>
      <div className="min-h-screen pt-20 px-4 pb-16 pointer-events-none select-none"
           style={{ filter: 'blur(6px)', opacity: 0.25 }}>
        <div className="max-w-4xl mx-auto space-y-4 mt-8">
          {[1,2,3].map(i => (
            <div key={i} className="h-24 rounded-2xl animate-pulse"
                 style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }} />
          ))}
          <div className="grid grid-cols-2 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-32 rounded-2xl animate-pulse"
                   style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }} />
            ))}
          </div>
        </div>
      </div>
      {showModal && (
        <AuthModal
          isExistingUser={wasLoggedIn}
          onClose={() => setShowModal(false)}
        />
      )}
      {!showModal && (
        <div className="fixed bottom-24 left-1/2 z-40 animate-fade-in"
             style={{ transform: 'translateX(-50%)' }}>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full font-body text-sm font-medium transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff',
                     boxShadow: '0 4px 20px rgba(99,102,241,0.40)' }}>
            🔒 Sign in to use this feature
          </button>
        </div>
      )}
    </>
  );
}

function EvaluateWrapper() {
  const navigate = useNavigate();
  return (
    <EvaluatePage
      onViewHistory={() => navigate('/evaluate/history')}
    />
  );
}

function ExamHistoryWrapper() {
  const navigate = useNavigate();
  return (
    <ExamHistoryPage
      onBack={() => navigate('/evaluate')}
      onRetryExam={(entry) => navigate('/evaluate', { state: { retryExam: entry } })}
    />
  );
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <VoiceFAB />
      <FeedbackFAB />
      <BackButton />
      <Routes>
        {/* Public */}
        <Route path="/"        element={<LandingPage />} />
        <Route path="/login"   element={<AuthPage mode="login" />} />
        <Route path="/signup"  element={<AuthPage mode="signup" />} />

        {/* Protected */}
        <Route path="/explore"        element={<ProtectedRoute><ExplorePage /></ProtectedRoute>} />
        <Route path="/learn/:videoId" element={<ProtectedRoute><VideoLearningPage /></ProtectedRoute>} />
        <Route path="/summarize"      element={<ProtectedRoute><SummarizerPage /></ProtectedRoute>} />
        <Route path="/quiz"           element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
        <Route path="/roadmap"        element={<ProtectedRoute><RoadmapPage /></ProtectedRoute>} />
        <Route path="/dashboard"      element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/notes"          element={<ProtectedRoute><NotesPage /></ProtectedRoute>} />
        <Route path="/profile"        element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/community"      element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} />
        <Route path="/learning-style" element={<ProtectedRoute><LearningStylePage /></ProtectedRoute>} />
        <Route path="/recommend"      element={<ProtectedRoute><RecommendPage /></ProtectedRoute>} />
        <Route path="/feedback"       element={<ProtectedRoute><FeedbackPage /></ProtectedRoute>} />
        <Route path="/nlp"            element={<ProtectedRoute><NLPAnalyzerPage /></ProtectedRoute>} />

        {/* Evaluate + History */}
        <Route path="/evaluate"         element={<ProtectedRoute><EvaluateWrapper /></ProtectedRoute>} />
        <Route path="/evaluate/history" element={<ProtectedRoute><ExamHistoryWrapper /></ProtectedRoute>} />

        {/* Study Buddy — NEW */}
        <Route path="/study-buddy" element={<ProtectedRoute><StudyBuddyPage /></ProtectedRoute>} />

        <Route path="/study-rooms" element={<ProtectedRoute><StudyRoomPage /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}