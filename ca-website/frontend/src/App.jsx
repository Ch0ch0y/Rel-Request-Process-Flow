import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Requests from './pages/Requests';
import RequestDetail from './pages/RequestDetail';
import CAStepsPage from './pages/CAStepsPage';
import Scheduling from './pages/Scheduling';
import RecordMonitor from './pages/RecordMonitor';
import Settings from './pages/Settings';
import Users from './pages/Users';
import ApprovalQueue from './pages/ApprovalQueue';
import CABackup from './pages/CABackup';
import RetentionMonitor from './pages/RetentionMonitor';

function Guard({ children, roles }) {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { token } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" replace /> : <Login />} />
      <Route element={<Guard><Layout /></Guard>}>
        <Route index element={<Dashboard />} />
        <Route path="requests" element={<Requests />} />
        <Route path="requests/:id" element={<RequestDetail />} />
        <Route path="requests/:id/steps" element={<CAStepsPage />} />
        <Route path="scheduling" element={<Scheduling />} />
        <Route path="records" element={<RecordMonitor />} />
        <Route path="approval" element={<Guard roles={['Admin','REL Engineer','Planner']}><ApprovalQueue /></Guard>} />
        <Route path="settings" element={<Guard roles={['Admin']}><Settings /></Guard>} />
        <Route path="users" element={<Guard roles={['Admin']}><Users /></Guard>} />
        <Route path="backup" element={<Guard roles={['Admin']}><CABackup /></Guard>} />
        <Route path="retention-monitor" element={<Guard roles={['Admin','REL Engineer']}><RetentionMonitor /></Guard>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
