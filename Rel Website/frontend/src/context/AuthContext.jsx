import { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState({});
  const heartbeatRef = useRef(null);

  // Send a heartbeat immediately and then every 60 seconds while logged in
  const startHeartbeat = () => {
    stopHeartbeat();
    api.heartbeat().catch(() => {});
    heartbeatRef.current = setInterval(() => {
      api.heartbeat().catch(() => {});
    }, 60_000);
  };

  const stopHeartbeat = () => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  };

  const loadPermissions = async () => {
    try {
      const res = await api.getMyPermissions();
      setPermissions(res.permissions || {});
    } catch {
      setPermissions({});
    }
  };

  // Refresh permissions whenever the browser tab regains focus so any
  // role changes made by an admin take effect without requiring re-login.
  useEffect(() => {
    const onFocus = () => { if (localStorage.getItem('token')) loadPermissions(); };
    const onVisibility = () => { if (document.visibilityState === 'visible' && localStorage.getItem('token')) loadPermissions(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.setToken(token);
      api.getMe()
        .then(u => {
          // normalize snake_case is_guest → isGuest
          const normalized = { ...u, isGuest: u.is_guest || false };
          setUser(normalized);
          if (!normalized.isGuest) startHeartbeat();
          if (normalized.isGuest) return { permissions: {} };
          return api.getMyPermissions();
        })
        .then(res => setPermissions(res.permissions || {}))
        .catch(() => { api.setToken(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const loginAsGuest = async (employee = null) => {
    const res = await api.guestToken(employee || {});
    api.setToken(res.access_token);
    setUser({ ...res.user, isGuest: true });
    setPermissions({});
  };

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    api.setToken(res.access_token);
    setUser({ ...res.user, isGuest: false });
    startHeartbeat();
    // Load permissions after login
    try {
      const permRes = await api.getMyPermissions();
      setPermissions(permRes.permissions || {});
    } catch { /* ignore */ }
    return res.user;
  };

  const register = async (data) => {
    const user = await api.register(data);
    return user;
  };

  const logout = () => {
    stopHeartbeat();
    api.setToken(null);
    setUser(null);
    setPermissions({});
  };

  const refreshUser = async () => {
    try {
      const u = await api.getMe();
      setUser({ ...u, isGuest: u.is_guest || false });
    } catch { /* ignore */ }
  };

  const hasRole = (...roles) => user && roles.includes(user.role);
  const hasPerm = (perm) => !!permissions[perm];

  return (
    <AuthContext.Provider value={{ user, loading, login, loginAsGuest, register, logout, hasRole, hasPerm, permissions, loadPermissions, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
