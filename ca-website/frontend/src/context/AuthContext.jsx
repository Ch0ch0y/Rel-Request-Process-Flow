import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('ca_token'));
  const [user, setUser]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('ca_user')); } catch { return null; }
  });
  const [permissions, setPermissions] = useState({});
  const heartbeatRef = useRef(null);

  const loadPermissions = useCallback(async () => {
    try {
      const { data } = await api.get('/api/my-permissions');
      setPermissions(data || {});
    } catch {
      setPermissions({});
    }
  }, []);

  // Start heartbeat when logged in
  useEffect(() => {
    if (!token) {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      return;
    }
    const beat = () => api.post('/api/auth/heartbeat', {}).catch(() => {});
    beat();
    heartbeatRef.current = setInterval(beat, 60_000);
    loadPermissions();
    return () => clearInterval(heartbeatRef.current);
  }, [token, loadPermissions]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    localStorage.setItem('ca_token', data.token);
    localStorage.setItem('ca_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const loginAsGuest = useCallback(async (employee = null) => {
    const res = await api.guestToken(employee);
    const userData = { ...res.user, isGuest: true };
    localStorage.setItem('ca_token', res.token);
    localStorage.setItem('ca_user', JSON.stringify(userData));
    setToken(res.token);
    setUser(userData);
    return userData;
  }, []);

  const register = useCallback(async (email, username, password, role) => {
    const { data } = await api.post('/api/auth/register', { email, username, password, role });
    localStorage.setItem('ca_token', data.token);
    localStorage.setItem('ca_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ca_token');
    localStorage.removeItem('ca_user');
    setToken(null);
    setUser(null);
    setPermissions({});
  }, []);

  const hasRole = useCallback((role) => user?.role === role, [user]);
  const hasPerm = useCallback((perm) => {
    if (user?.role === 'Admin') return true;
    return !!permissions[perm];
  }, [user, permissions]);

  return (
    <AuthContext.Provider value={{ token, user, login, loginAsGuest, register, logout, hasRole, hasPerm, loadPermissions, permissions }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

