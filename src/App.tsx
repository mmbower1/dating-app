import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Logo from './components/Logo';
import api from './api/axios';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Matches from './pages/Matches';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Admin from './pages/Admin';
import Welcome from './pages/Welcome';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';

const TopHeader = () => {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <header className="top-header">
      <Logo size="sm" showText={true} />
      {user.isAdmin && (
        <NavLink to="/admin" className={({ isActive }) => `admin-link ${isActive ? 'active' : ''}`}>
          Admin
        </NavLink>
      )}
    </header>
  );
};

const DiscoverIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const MatchesIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const ProfileIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const SEEN_MATCH_KEY = 'pearl_seen_match';

const Nav = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [badge, setBadge] = useState(0);

  const fetchBadge = async () => {
    try {
      const res = await api.get<{ count: number; matchId: string | null }>('/matches/unread-count');
      const { count, matchId } = res.data;
      if (count > 0) {
        setBadge(count);
      } else if (matchId) {
        const seen = localStorage.getItem(SEEN_MATCH_KEY);
        setBadge(seen === matchId ? 0 : 1);
      } else {
        setBadge(0);
      }
    } catch { /* ignore */ }
  };

  // Poll every 8 seconds
  useEffect(() => {
    if (!user) return;
    fetchBadge();
    const id = setInterval(fetchBadge, 8000);
    return () => clearInterval(id);
  }, [user]);

  // Clear badge when user navigates to /matches or any /chat
  useEffect(() => {
    if (!user) return;
    if (location.pathname === '/matches' || location.pathname.startsWith('/chat')) {
      api.get<{ count: number; matchId: string | null }>('/matches/unread-count')
        .then((res) => {
          const { matchId } = res.data;
          if (matchId) {
            localStorage.setItem(SEEN_MATCH_KEY, matchId);
            api.post(`/matches/${matchId}/mark-read`);
          }
        })
        .catch(() => {});
      setBadge(0);
    }
  }, [location.pathname, user]);

  if (!user) return null;

  return (
    <nav className="bottom-nav">
      <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <DiscoverIcon />
        Discover
      </NavLink>
      <NavLink to="/matches" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <span className="nav-icon-wrap">
          <MatchesIcon />
          {badge > 0 && <span className="nav-badge">{badge > 9 ? '9+' : badge}</span>}
        </span>
        Matches
      </NavLink>
      <NavLink to="/profile" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <ProfileIcon />
        Profile
      </NavLink>
    </nav>
  );
};

const ThemedApp = () => {
  const { theme } = useTheme();
  return (
    <div className="app" data-theme={theme}>
      <TopHeader />
      <Routes>
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/matches" element={<ProtectedRoute><Matches /></ProtectedRoute>} />
        <Route path="/chat/:matchId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Nav />
    </div>
  );
};

const App = () => (
  <ThemeProvider>
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <ThemedApp />
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
