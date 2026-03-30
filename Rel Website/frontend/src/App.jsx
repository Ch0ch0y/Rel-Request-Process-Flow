import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { useState, useEffect, useRef } from 'react';
import api from './api';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Requests from './pages/Requests';
import RequestDetail from './pages/RequestDetail';
import Settings from './pages/Settings';
import Users from './pages/Users';
import CompletedRequests from './pages/CompletedRequests';
import MyRequests from './pages/MyRequests';
import BackupViewer from './pages/BackupViewer';
import RequestFilter from './pages/RequestFilter';
import Presentation from './pages/Presentation';
import TaskManager from './pages/TaskManager';
import RetentionMonitor from './pages/RetentionMonitor';
import ApprovalPage from './pages/ApprovalPage';
import LoadingUnloading from './pages/LoadingUnloading';
import PerformanceMonitor from './pages/PerformanceMonitor';
import UserGuide, { hasUserDismissedGuide } from './components/UserGuide';

const GUEST_ALLOWED_PATHS = ['/', '/completed'];

// ── Maintenance Page ──────────────────────────────────
function MaintenancePage({ message }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center border border-slate-100">
        <div className="text-6xl mb-5">🔧</div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Under Maintenance</h1>
        <p className="text-slate-500 text-sm mb-4 leading-relaxed">
          {message || 'The system is currently undergoing maintenance. Please check back later.'}
        </p>
        <p className="text-xs text-slate-400">Contact your administrator if you need urgent access.</p>
      </div>
    </div>
  );
}

// ── Admin Maintenance Banner ──────────────────────────
function MaintenanceBanner({ message, onDismiss }) {
  return (
    <div className="bg-amber-400 text-amber-900 text-sm font-medium px-4 py-2 flex items-center justify-between gap-3 z-50 sticky top-0">
      <span>🔧 <strong>Maintenance Mode is ON.</strong> Other users see a maintenance page. {message && `Message: "${message}"`}</span>
      <button onClick={onDismiss} className="text-amber-800 hover:text-amber-950 font-bold text-lg leading-none">×</button>
    </div>
  );
}

function ProtectedRoute({ children, guestAllowed = false }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  if (user.isGuest && !guestAllowed) return <Navigate to="/" />;
  return children;
}

/**
 * Wraps the entire route tree with a crossfade on login ↔ authenticated transitions.
 */
function RouteTransition({ children }) {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [phase, setPhase] = useState('visible');
  const prevKey = useRef(location.pathname.startsWith('/login') ? 'login' : 'app');
  const timeoutRef = useRef(null);

  useEffect(() => {
    const currentKey = location.pathname.startsWith('/login') ? 'login' : 'app';

    if (currentKey !== prevKey.current) {
      // Major context switch (login ↔ app) — crossfade
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setPhase('exiting');

      timeoutRef.current = setTimeout(() => {
        setDisplayChildren(children);
        prevKey.current = currentKey;
        setPhase('entering');

        timeoutRef.current = setTimeout(() => {
          setPhase('visible');
        }, 450);
      }, 200);
    } else {
      setDisplayChildren(children);
    }

    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [location.pathname, children]);

  const classMap = {
    visible: '',
    exiting: 'route-crossfade-exit',
    entering: 'route-crossfade-enter',
  };

  return (
    <div className={`route-crossfade ${classMap[phase]}`}>
      {displayChildren}
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();
  const [showGuide, setShowGuide] = useState(false);
  const prevUserRef = useRef(null);
  const [maintenance, setMaintenance] = useState({ active: false, message: '' });
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Poll maintenance status every 30 s (and immediately on mount)
  useEffect(() => {
    let cancelled = false;
    const check = () => {
      fetch('/api/maintenance')
        .then(r => r.ok ? r.json() : { active: false })
        .then(d => { if (!cancelled) setMaintenance(d); })
        .catch(() => {});
    };
    check();
    const id = setInterval(check, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Reset banner dismiss whenever maintenance turns on again
  useEffect(() => {
    if (maintenance.active) setBannerDismissed(false);
  }, [maintenance.active]);

  // Show guide when user logs in and hasn't dismissed it
  useEffect(() => {
    if (!loading && user && prevUserRef.current === null) {
      // User just logged in (transitioned from null → user)
      if (!hasUserDismissedGuide(user.id)) {
        setShowGuide(true);
      }
    }
    if (!user) {
      setShowGuide(false);
    }
    prevUserRef.current = user;
  }, [user, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Non-admins see a full maintenance page
  const isAdmin = user?.role === 'Admin';
  if (maintenance.active && !isAdmin) {
    return <MaintenancePage message={maintenance.message} />;
  }

  return (
    <>
      {maintenance.active && isAdmin && !bannerDismissed && (
        <MaintenanceBanner message={maintenance.message} onDismiss={() => setBannerDismissed(true)} />
      )}
      <RouteTransition>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
          <Route path="/" element={<ProtectedRoute guestAllowed><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="requests" element={<ProtectedRoute guestAllowed><Requests /></ProtectedRoute>} />
            <Route path="requests/:id" element={<ProtectedRoute guestAllowed><RequestDetail /></ProtectedRoute>} />
            <Route path="my-requests" element={<ProtectedRoute><MyRequests /></ProtectedRoute>} />
            <Route path="completed" element={<CompletedRequests />} />
            <Route path="settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
            <Route path="backup-viewer" element={<ProtectedRoute><BackupViewer /></ProtectedRoute>} />
            <Route path="request-filter" element={<ProtectedRoute><RequestFilter /></ProtectedRoute>} />
            <Route path="presentation" element={<ProtectedRoute><Presentation /></ProtectedRoute>} />
            <Route path="task-manager" element={<ProtectedRoute><TaskManager /></ProtectedRoute>} />
            <Route path="retention-monitor" element={<ProtectedRoute><RetentionMonitor /></ProtectedRoute>} />
            <Route path="approval" element={<ProtectedRoute><ApprovalPage /></ProtectedRoute>} />
            <Route path="loading-unloading" element={<ProtectedRoute guestAllowed><LoadingUnloading /></ProtectedRoute>} />
            <Route path="performance" element={<ProtectedRoute><PerformanceMonitor /></ProtectedRoute>} />
          </Route>
        </Routes>
      </RouteTransition>
      <UserGuide open={showGuide} onClose={() => setShowGuide(false)} />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
