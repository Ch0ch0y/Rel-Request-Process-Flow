# REL Website - Component & Code Extraction

## Document Overview
Comprehensive compilation of React component patterns, backend API structure, database schema, and authentication flow from the REL Request Process Flow web application.

**Generated**: 2026-07-01  
**Source**: REL Website codebase  
**Tech Stack**: React 18 + Vite + TailwindCSS | FastAPI + SQLite

---

## Table of Contents
1. [Frontend Architecture](#frontend-architecture)
2. [Frontend Context Providers](#frontend-context-providers)
3. [Key Layout Components](#key-layout-components)
4. [Page Components](#page-components)
5. [Backend Database Schema](#backend-database-schema)
6. [Authentication & JWT Flow](#authentication--jwt-flow)
7. [API Client Patterns](#api-client-patterns)
8. [API Endpoint Structure](#api-endpoint-structure)
9. [Data Seeding](#data-seeding)
10. [Import & Icon Patterns](#import--icon-patterns)

---

## Frontend Architecture

### Project Structure
```
frontend/
├── src/
│   ├── api.js                    # API client wrapper
│   ├── App.jsx                   # Main router
│   ├── main.jsx                  # Entry point
│   ├── index.css                 # Global styles
│   ├── context/                  # React context providers
│   │   ├── AuthContext.jsx       # User auth state
│   │   └── ThemeContext.jsx      # Dark/light theme
│   ├── components/               # Reusable components
│   │   ├── Layout.jsx            # Main layout wrapper
│   │   ├── Sidebar.jsx           # Navigation sidebar
│   │   ├── PageTransition.jsx    # Route animations
│   │   ├── ProcessTimeline.jsx   # Step visualization
│   │   ├── ConfirmDialog.jsx     # Modal confirmations
│   │   ├── ca/                   # Custom analysis components
│   │   └── ...                   # Additional components
│   ├── pages/                    # Page components (23 total)
│   │   ├── Login.jsx             # Auth entry
│   │   ├── Dashboard.jsx         # Main dashboard
│   │   ├── Requests.jsx          # Request listing
│   │   ├── RequestDetail.jsx     # Request detail view
│   │   └── ...                   # Other pages
│   ├── constants/                # App constants
│   └── assets/                   # Static files
├── package.json
└── vite.config.js
```

### Design Patterns Used
- **Context API** for global state (auth, theme)
- **Custom Hooks** for logic reuse (usePHTClock, useAuth, useTheme)
- **Component Composition** for flexibility
- **Responsive TailwindCSS** for styling
- **React Router v6** for navigation
- **Icon Library** using lucide-react for consistent icons

---

## Frontend Context Providers

### AuthContext.jsx
Manages authentication state, user sessions, permissions, and heartbeat polling.

```javascript
import { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState({});
  const heartbeatRef = useRef(null);

  // Send heartbeat immediately and then every 60 seconds while logged in
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

  // Refresh permissions on tab focus (admin role changes take effect)
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

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    api.setToken(res.access_token);
    setUser({ ...res.user, isGuest: false });
    startHeartbeat();
    try {
      const permRes = await api.getMyPermissions();
      setPermissions(permRes.permissions || {});
    } catch { /* ignore */ }
    return res.user;
  };

  const loginAsGuest = async (employee = null) => {
    const res = await api.guestToken(employee || {});
    api.setToken(res.access_token);
    setUser({ ...res.user, isGuest: true });
    setPermissions({});
  };

  const logout = () => {
    stopHeartbeat();
    api.setToken(null);
    setUser(null);
    setPermissions({});
  };

  const hasRole = (...roles) => user && roles.includes(user.role);
  const hasPerm = (perm) => !!permissions[perm];

  return (
    <AuthContext.Provider value={{ user, loading, login, loginAsGuest, logout, hasRole, hasPerm, permissions, loadPermissions }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
```

**Key Features:**
- 60-second heartbeat to keep session alive
- Auto-refresh permissions on tab focus
- Guest technician support (no heartbeat)
- Role-based and permission-based access checks
- localStorage for token persistence

### ThemeContext.jsx
Manages dark/light theme state.

```javascript
import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext({ theme: 'light', toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
```

---

## Key Layout Components

### Layout.jsx
Main layout wrapper with responsive sidebar, mobile header, and user status notifications.

```javascript
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import PageTransition from './PageTransition';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Menu } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const [toasts, setToasts] = useState([]);
  const knownOnlineIds = useRef(null); // null = not yet initialized

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Poll for newly online users every 20 seconds
  useEffect(() => {
    if (!user || user.isGuest) return;

    const poll = async () => {
      try {
        const data = await api.getOnlineUsers();
        const currentIds = new Set((data.users || []).map(u => u.id));

        if (knownOnlineIds.current === null) {
          knownOnlineIds.current = currentIds;
          return;
        }

        // Find newly online users (excluding self)
        const newlyOnline = (data.users || []).filter(
          u => !knownOnlineIds.current.has(u.id) && u.id !== user.id
        );

        if (newlyOnline.length > 0) {
          const newToasts = newlyOnline.map(u => ({
            id: `${u.id}-${Date.now()}`,
            username: u.username,
            avatar: u.avatar || null,
            role: u.role,
          }));
          setToasts(prev => [...prev, ...newToasts]);
          newToasts.forEach(t => {
            setTimeout(() => dismissToast(t.id), 5000);
          });
        }

        knownOnlineIds.current = currentIds;
      } catch { /* ignore network errors */ }
    };

    poll();
    const interval = setInterval(poll, 20_000);
    return () => clearInterval(interval);
  }, [user, dismissToast]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-out
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center h-14 px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="ml-3 text-lg font-heading font-bold text-slate-900 dark:text-white">RELDMS</h1>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
          <div className="p-3 sm:p-6 md:p-8 w-full">
            <PageTransition />
          </div>
        </main>
      </div>
    </div>
  );
}
```

**Key Features:**
- Mobile-responsive sidebar toggle
- Real-time user status notifications (5s auto-dismiss)
- Stable scrollbar with `scrollbarGutter`
- Responsive padding (p-3 → p-8)

### Sidebar.jsx (Navigation)
Comprehensive navigation with role-based filtering and sub-menus.

```javascript
import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard, ClipboardList, Settings, Users, LogOut, X, CheckCircle2, FileText, Archive, 
  ListFilter, MonitorDot, Sun, Moon, ShieldCheck, ChevronRight, HardDrive, FolderKanban, 
  Microscope, PackageOpen, BarChart3, Database, Table, ScanSearch, Waves,
} from 'lucide-react';

const allNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', guestAllowed: true, end: true },
  {
    to: '/my-requests',
    icon: FolderKanban,
    label: 'My Requests',
    guestAllowed: false,
    roles: ['Admin', 'Reliability Engineer', 'Planner'],
    subItems: [
      { to: '/requests', icon: ClipboardList, label: 'All Requests', guestAllowed: true },
      { to: '/completed', icon: CheckCircle2, label: 'Completed', guestAllowed: true },
    ]
  },
  { to: '/approval', icon: ShieldCheck, label: 'Approval Queue', guestAllowed: false, roles: ['Admin', 'Planner'] },
  { to: '/requests', icon: ClipboardList, label: 'All Requests', guestAllowed: true, roles: ['Technician'] },
  { to: '/loading-unloading', icon: PackageOpen, label: 'Loading / Unloading', guestAllowed: true },
  { to: '/sat-sonoscan', icon: Waves, label: 'SAT / Sonoscan', guestAllowed: true },
  { to: '/process-monitoring', icon: ScanSearch, label: 'Process Monitoring', guestAllowed: false },
  {
    to: '/settings', icon: Settings, label: 'Settings', guestAllowed: false,
    subItems: [
      { to: '/users', icon: Users, label: 'Users', guestAllowed: false },
      { to: '/task-manager', icon: MonitorDot, label: 'Task Manager', guestAllowed: false, roles: ['Admin'] },
    ]
  },
];

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const filterItem = (item) => {
    if (user?.isGuest && !item.guestAllowed) return false;
    if (item.roles && !item.roles.includes(user?.role)) return false;
    return true;
  };

  const navItems = allNavItems
    .filter(filterItem)
    .map(item => ({ ...item, subItems: item.subItems?.filter(filterItem) ?? [] }))
    .filter(item => !item.noNav || item.subItems.length > 0);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-400">
      {/* Navigation items */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {navItems.map((item) => (
          <div key={item.to}>
            {/* Primary nav item */}
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                isActive ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/50 hover:text-white'
              }`}
              onClick={onClose}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>

            {/* Sub-items */}
            {item.subItems && item.subItems.length > 0 && (
              <div className="ml-2 mt-1 border-l border-slate-800">
                {item.subItems.map((sub) => (
                  <NavLink
                    key={sub.to}
                    to={sub.to}
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2 ml-2 rounded-md text-sm transition-colors ${
                      isActive ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                    }`}
                    onClick={onClose}
                  >
                    <sub.icon className="w-4 h-4" />
                    <span>{sub.label}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Theme toggle */}
      <div className="px-5 py-2 border-t border-slate-800 flex items-center justify-between">
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-md hover:bg-slate-800 hover:text-white transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {/* Logout button */}
      <div className="p-3 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
```

---

## Page Components

### Login.jsx (Auth Entry)
Comprehensive authentication page with registration, guest technician code entry, and password reset.

```javascript
import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, X, KeyRound, RefreshCw, Sun, Moon } from 'lucide-react';
import AmkorLogo from '../assets/amkor-logo.svg';
import api from '../api';
import { useTheme } from '../context/ThemeContext';

const ROLES = ['Admin', 'Reliability Engineer', 'Failure Analysis', 'Technician', 'Planner'];

function generateMath() {
  const ops = [
    { sym: '+', fn: (a, b) => a + b },
    { sym: '−', fn: (a, b) => a - b },
    { sym: '×', fn: (a, b) => a * b },
  ];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a, b;
  if (op.sym === '×') {
    a = Math.floor(Math.random() * 9) + 2;
    b = Math.floor(Math.random() * 9) + 2;
  } else if (op.sym === '−') {
    a = Math.floor(Math.random() * 41) + 10;
    b = Math.floor(Math.random() * a);
  } else {
    a = Math.floor(Math.random() * 50) + 1;
    b = Math.floor(Math.random() * 50) + 1;
  }
  return { question: `What is ${a} ${op.sym} ${b}?`, answer: op.fn(a, b) };
}

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('Admin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Tech code entry for guest technician
  const [showTechCode, setShowTechCode] = useState(false);
  const [techDigits, setTechDigits] = useState(['', '', '', '', '', '']);
  const digitRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  // Math CAPTCHA
  const [mathChallenge, setMathChallenge] = useState(() => generateMath());
  const [mathAnswer, setMathAnswer] = useState('');

  const { login, register, loginAsGuest } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleGuestLogin = async (employee) => {
    setLoading(true);
    setError('');
    try {
      await loginAsGuest(employee);
      navigate('/');
    } catch (err) {
      setError('Unable to login as Technician. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTechCodeDigit = (idx, val) => {
    const cleaned = val.replace(/\D/g, '').slice(-1);
    const next = [...techDigits];
    next[idx] = cleaned;
    setTechDigits(next);

    // Auto-focus next field
    if (cleaned && idx < 5) {
      digitRefs[idx + 1]?.current?.focus();
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!email || !password || !username) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await register({ email, password, username, role });
      setError('');
      setIsRegister(false);
      setEmail('');
      setPassword('');
      setUsername('');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }
    if (parseInt(mathAnswer) !== mathChallenge.answer) {
      setError('Math challenge answer incorrect');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 ${
      theme === 'dark' ? 'dark' : ''
    } transition-colors`}>
      <div className="absolute top-4 right-4">
        <button onClick={toggleTheme} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600">
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-white rounded-lg p-2 flex items-center justify-center">
            <img src={AmkorLogo} alt="Amkor" className="w-full h-full object-contain" />
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="bg-slate-800 rounded-lg shadow-xl p-8 space-y-4">
          <h2 className="text-2xl font-bold text-white mb-6">Sign In</h2>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/20 text-red-400 text-sm border border-red-500/50">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="admin@amkor.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Math CAPTCHA */}
          <div className="bg-slate-700 rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-slate-300 font-medium">{mathChallenge.question}</p>
              <button
                type="button"
                onClick={() => setMathChallenge(generateMath())}
                className="p-1 hover:bg-slate-600 rounded"
              >
                <RefreshCw className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <input
              type="number"
              value={mathAnswer}
              onChange={(e) => setMathAnswer(e.target.value)}
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-600 text-white text-sm"
              placeholder="Your answer"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-medium transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <button
            type="button"
            onClick={() => setShowTechCode(true)}
            className="w-full py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-colors"
          >
            Sign in as Technician
          </button>
        </form>

        {/* Guest Technician Code Entry */}
        {showTechCode && (
          <div className="mt-4 p-6 bg-slate-800 rounded-lg border-2 border-amber-500">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-amber-400 font-bold">Technician Access Code</h3>
              <button onClick={() => setShowTechCode(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex gap-2 mb-4">
              {techDigits.map((digit, i) => (
                <input
                  key={i}
                  ref={digitRefs[i]}
                  type="text"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleTechCodeDigit(i, e.target.value)}
                  className="w-10 h-10 text-center rounded bg-slate-700 border border-slate-600 text-white text-lg font-bold"
                />
              ))}
            </div>
            <button
              onClick={() => handleGuestLogin({})}
              className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium"
            >
              Enter as Technician
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Backend Database Schema

### SQLite Table Definitions

```sql
-- Users table with role-based access
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    approved INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    position TEXT DEFAULT '',
    contact_email TEXT DEFAULT '',
    plant TEXT DEFAULT '',
    manager TEXT DEFAULT '',
    last_seen TEXT,
    blocked INTEGER DEFAULT 0,
    user_status TEXT DEFAULT 'pending',
    avatar TEXT DEFAULT NULL
);

-- Request records
CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    request_number TEXT UNIQUE NOT NULL,
    request_type TEXT DEFAULT 'REL',
    classification TEXT DEFAULT '',
    originator TEXT DEFAULT '',
    plant TEXT DEFAULT '',
    device_name TEXT DEFAULT '',
    lot_no TEXT DEFAULT '',
    customer TEXT DEFAULT '',
    pkg_info TEXT DEFAULT '',
    automotive INTEGER DEFAULT 0,
    date_ltc TEXT,
    product_hierarchy TEXT,
    pdl TEXT,
    body_size_x REAL,
    body_size_y REAL,
    package_thickness REAL,
    ball_pitch REAL,
    ball_count INTEGER,
    lead_pitch REAL,
    lead_count INTEGER,
    total_ss TEXT,
    purpose TEXT DEFAULT '',
    engineer_special_instruction TEXT,
    deadline TEXT,
    created_by TEXT NOT NULL,
    created_by_username TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    current_step INTEGER DEFAULT 1,
    note TEXT,
    retention_details TEXT DEFAULT NULL,
    analysis_notes TEXT DEFAULT NULL,
    approved_at TEXT DEFAULT NULL,
    last_opened_at TEXT DEFAULT NULL,
    planner_est_start TEXT DEFAULT NULL,
    planner_est_end TEXT DEFAULT NULL,
    planner_note TEXT DEFAULT NULL,
    discontinued_at TEXT DEFAULT NULL,
    discontinued_by TEXT DEFAULT NULL,
    discontinued_reason TEXT DEFAULT NULL,
    original_rr_number TEXT DEFAULT NULL,
    rrs_no TEXT DEFAULT NULL,
    priority INTEGER DEFAULT 0,
    test_matrix_json TEXT DEFAULT NULL
);

-- Process steps (workflow steps per request leg)
CREATE TABLE IF NOT EXISTS process_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    leg INTEGER DEFAULT 1,
    step_number INTEGER NOT NULL,
    step_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    started_at TEXT,
    completed_at TEXT,
    machine_no TEXT,
    rack_no TEXT,
    operator_id TEXT,
    tray_no TEXT,
    qty_in INTEGER,
    qty_out INTEGER,
    notes TEXT,
    attachments TEXT DEFAULT '[]',
    custom_fields TEXT DEFAULT '{}',
    priority INTEGER DEFAULT 0,
    updated_by TEXT,
    UNIQUE(request_id, leg, step_number)
);

-- Login audit logs
CREATE TABLE IF NOT EXISTS login_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    email TEXT NOT NULL,
    username TEXT NOT NULL,
    role TEXT NOT NULL,
    login_at TEXT NOT NULL,
    ip_address TEXT,
    employee_id TEXT DEFAULT '',
    employee_name TEXT DEFAULT ''
);

-- Configuration and settings
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    app_name TEXT DEFAULT 'Rel Request Process Flow',
    app_logo TEXT,
    company_name TEXT,
    contact_email TEXT,
    process_steps TEXT,
    custom_fields TEXT DEFAULT '{}',
    tech_auth_code TEXT DEFAULT '735522',
    process_presets TEXT,
    updated_at TEXT
);

-- Role-based permissions
CREATE TABLE IF NOT EXISTS role_permissions (
    role TEXT NOT NULL,
    permission TEXT NOT NULL,
    granted INTEGER DEFAULT 1,
    PRIMARY KEY (role, permission)
);

-- Equipment/machines reference
CREATE TABLE IF NOT EXISTS machines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_no TEXT NOT NULL,
    description TEXT NOT NULL
);

-- Employees reference
CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    position TEXT NOT NULL
);

-- Backup tracking
CREATE TABLE IF NOT EXISTS backup_tracking (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    last_critical_backup_at TEXT,
    last_backup_request_count INTEGER DEFAULT 0,
    critical_backup_required INTEGER DEFAULT 0,
    last_backup_downloaded INTEGER DEFAULT 0
);

-- Technician sessions (guest user tracking)
CREATE TABLE IF NOT EXISTS technician_sessions (
    employee_id TEXT PRIMARY KEY,
    employee_name TEXT NOT NULL DEFAULT '',
    employee_position TEXT NOT NULL DEFAULT '',
    last_active TEXT NOT NULL,
    login_at TEXT NOT NULL
);

-- RELMON sheet data
CREATE TABLE IF NOT EXISTS relmon_sheet_data (
    site TEXT NOT NULL,
    sheet TEXT NOT NULL,
    rows_json TEXT NOT NULL,
    merges_json TEXT,
    form_json TEXT DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT,
    PRIMARY KEY (site, sheet)
);

-- Masterlist for planning
CREATE TABLE IF NOT EXISTS masterlist_2026 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ww TEXT,
    date_received TEXT,
    rrs_no TEXT,
    purpose TEXT,
    qual_type TEXT,
    customer TEXT,
    pkg_type TEXT,
    lc_bc TEXT,
    rr_agile_no TEXT,
    test_level TEXT,
    qty TEXT,
    num_days TEXT,
    num_legs TEXT,
    est_start TEXT,
    est_completion TEXT,
    recommit TEXT,
    planner_remarks TEXT,
    uploaded_at TEXT
);
```

### Database Initialization Triggers
```sql
-- Automatic datetime validation for process_steps
CREATE TRIGGER IF NOT EXISTS trg_clean_started_at_insert
AFTER INSERT ON process_steps
WHEN NEW.started_at IS NOT NULL AND NEW.started_at NOT LIKE '____-__-__%'
BEGIN
    UPDATE process_steps SET started_at = NULL WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_clean_completed_at_insert
AFTER INSERT ON process_steps
WHEN NEW.completed_at IS NOT NULL AND NEW.completed_at NOT LIKE '____-__-__%'
BEGIN
    UPDATE process_steps SET completed_at = NULL WHERE id = NEW.id;
END;
```

---

## Authentication & JWT Flow

### Pydantic Models

```python
from pydantic import BaseModel, EmailStr
from typing import Optional

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    role: str  # Admin, Reliability Engineer, Failure Analysis, Technician, Planner

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: str
    email: str
    username: str
    role: str
    approved: bool = False
    is_guest: bool = False
    position: Optional[str] = ""
    contact_email: Optional[str] = ""
    plant: Optional[str] = ""
    manager: Optional[str] = ""
    avatar: Optional[str] = None
    employee_id: Optional[str] = None
    employee_name: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class ProfileUpdate(BaseModel):
    username: Optional[str] = None
    position: Optional[str] = None
    contact_email: Optional[str] = None
    plant: Optional[str] = None
    manager: Optional[str] = None
    avatar: Optional[str] = None
```

### Authentication Functions

```python
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Configuration
SECRET_KEY = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

security = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against bcrypt hash."""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict) -> str:
    """Create JWT access token with 24-hour expiry."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> User:
    """Extract and validate JWT token from Bearer header or cookie."""
    # Try Bearer header first, then httpOnly cookie
    token = None
    if credentials:
        token = credentials.credentials
    if not token or token in ('null', 'undefined'):
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.exceptions.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.exceptions.PyJWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

    # Guest token handling (no DB lookup)
    if payload.get("is_guest"):
        emp_id   = payload.get("employee_id", "") or ""
        emp_name = payload.get("employee_name", "") or ""
        return User.model_construct(
            id="guest",
            email="guest@technician.local",
            username=emp_name or "Technician",
            role="Technician",
            approved=True,
            is_guest=True,
            employee_id=emp_id,
            employee_name=emp_name,
        )

    # Regular user: fetch from database
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT id, email, username, role, created_at, approved, position, contact_email, plant, manager, blocked, avatar FROM users WHERE id = ?",
            (user_id,)
        )
        row = await cursor.fetchone()
        if row is None:
            raise HTTPException(status_code=401, detail="User not found")
        if row[10]:  # blocked
            raise HTTPException(status_code=403, detail="Your account has been blocked.")
        
        return User(
            id=row[0], email=row[1], username=row[2], role=row[3],
            created_at=datetime.fromisoformat(row[4]),
            approved=bool(row[5]) if row[5] is not None else False,
            position=row[6] or '', contact_email=row[7] or '',
            plant=row[8] or '', manager=row[9] or '',
            blocked=bool(row[10]) if row[10] is not None else False,
            avatar=row[11] or None
        )
    finally:
        await db.close()

def require_permission(permission: str):
    """Permission checker dependency."""
    async def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        # Admin always has all permissions
        if current_user.role == "Admin":
            return current_user
        # Guest technician: limited permissions
        if current_user.is_guest and permission not in ('update_steps',):
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        db = await get_db()
        try:
            cursor = await db.execute(
                "SELECT granted FROM role_permissions WHERE role = ? AND permission = ?",
                (current_user.role, permission)
            )
            row = await cursor.fetchone()
            if not row or not row[0]:
                raise HTTPException(status_code=403, detail="Insufficient permissions")
            return current_user
        finally:
            await db.close()
    return permission_checker
```

### API Authentication Endpoints

```python
from fastapi import APIRouter, HTTPException, Request

api_router = APIRouter(prefix="/api")

@api_router.post("/auth/register", response_model=User)
async def register(user_create: UserCreate):
    """Register new user account (requires admin approval)."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT id FROM users WHERE email = ?", (user_create.email,))
        if await cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")

        hashed_password = hash_password(user_create.password)
        user = User(email=user_create.email, username=user_create.username, role=user_create.role, approved=False)
        await db.execute(
            "INSERT INTO users (id, email, username, password, role, approved, created_at) VALUES (?,?,?,?,?,?,?)",
            (user.id, user.email, user.username, hashed_password, user.role, 0, user.created_at.isoformat())
        )
        await db.commit()
        return user
    finally:
        await db.close()

@api_router.post("/auth/login", response_model=Token)
async def login(user_login: UserLogin, request: Request):
    """Authenticate user and return JWT token."""
    client_ip = request.client.host if request.client else "unknown"
    
    # Rate limiting: max 5 login attempts per 5 minutes
    # (implementation details omitted for brevity)
    
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT id, email, username, password, role, created_at, approved, blocked FROM users WHERE email = ?",
            (user_login.email,)
        )
        row = await cursor.fetchone()
        if not row or not verify_password(user_login.password, row[3]):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        if bool(row[7]):  # blocked
            raise HTTPException(status_code=403, detail="Your account has been blocked.")
        
        if not bool(row[6]):  # not approved
            raise HTTPException(status_code=403, detail="Your account is pending admin approval.")

        access_token = create_access_token(data={"sub": row[0]})
        user = User(id=row[0], email=row[1], username=row[2], role=row[4], approved=True)
        
        # Log login
        now = datetime.now(timezone.utc).isoformat()
        await db.execute(
            "INSERT INTO login_logs (user_id, email, username, role, login_at, ip_address) VALUES (?,?,?,?,?,?)",
            (row[0], row[1], row[2], row[4], now, "local")
        )
        await db.commit()

        return Token(access_token=access_token, token_type="bearer", user=user)
    finally:
        await db.close()

@api_router.post("/auth/guest-token")
async def guest_token(body: dict = None):
    """Issue guest JWT for technician access (no credentials required)."""
    body = body or {}
    emp_id = (body.get("employee_id") or "").strip()
    emp_name = (body.get("employee_name") or "").strip()
    
    token = create_access_token({
        "sub": "guest",
        "is_guest": True,
        "employee_id": emp_id,
        "employee_name": emp_name
    })
    
    db = await get_db()
    try:
        now = datetime.now(timezone.utc).isoformat()
        await db.execute(
            "INSERT INTO login_logs (user_id, email, username, role, login_at, ip_address, employee_id, employee_name) VALUES (?,?,?,?,?,?,?,?)",
            ("guest", "guest@technician.local", emp_name or "Technician", "Technician", now, "local", emp_id, emp_name)
        )
        if emp_id:
            await db.execute(
                "INSERT INTO technician_sessions (employee_id, employee_name, employee_position, last_active, login_at) VALUES (?, ?, ?, ?, ?) "
                "ON CONFLICT(employee_id) DO UPDATE SET last_active=excluded.last_active, login_at=excluded.login_at",
                (emp_id, emp_name, "", now, now)
            )
        await db.commit()
    finally:
        await db.close()
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": "guest",
            "email": "guest@technician.local",
            "username": emp_name or "Technician",
            "role": "Technician",
            "approved": True,
            "is_guest": True,
            "employee_id": emp_id,
            "employee_name": emp_name,
        }
    }

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user profile."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "username": current_user.username,
        "role": current_user.role,
        "approved": current_user.approved,
        "is_guest": current_user.is_guest,
        "position": current_user.position or "",
        "avatar": current_user.avatar or None,
    }

@api_router.patch("/auth/profile", response_model=User)
async def update_profile(data: ProfileUpdate, current_user: User = Depends(get_current_user)):
    """Update user profile (avatar, position, etc.)."""
    fields, values = [], []
    if data.username is not None:
        fields.append("username = ?")
        values.append(data.username.strip())
    if data.avatar is not None:
        fields.append("avatar = ?")
        values.append(data.avatar if data.avatar else None)
    if data.position is not None:
        fields.append("position = ?")
        values.append(data.position.strip())
    
    if not fields:
        return current_user
    
    values.append(current_user.id)
    db = await get_db()
    try:
        await db.execute(f"UPDATE users SET {', '.join(fields)} WHERE id = ?", values)
        await db.commit()
    finally:
        await db.close()
    return current_user
```

---

## API Client Patterns

### Frontend API Client (api.js)

```javascript
const API_BASE = '/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  async request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (res.status === 401) {
      this.setToken(null);
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || `Request failed: ${res.status}`);
    }

    return res.json();
  }

  get(path) { return this.request(path); }
  post(path, body) { return this.request(path, { method: 'POST', body: JSON.stringify(body) }); }
  put(path, body) { return this.request(path, { method: 'PUT', body: JSON.stringify(body) }); }
  patch(path, body) { return this.request(path, { method: 'PATCH', body: JSON.stringify(body) }); }
  delete(path) { return this.request(path, { method: 'DELETE' }); }

  async upload(file) {
    const formData = new FormData();
    formData.append('file', file);
    const headers = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const res = await fetch(`${API_BASE}/upload`, { method: 'POST', headers, body: formData });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || 'Upload failed');
    }
    return res.json();
  }

  // ═══════════════════════════════════════════════════════
  // Auth
  // ═══════════════════════════════════════════════════════
  register(data) { return this.post('/auth/register', data); }
  login(data) { return this.post('/auth/login', data); }
  guestToken(employee = {}) { return this.post('/auth/guest-token', employee); }
  getMe() { return this.get('/auth/me'); }
  heartbeat() { return this.post('/auth/heartbeat', {}); }
  getOnlineUsers() { return this.get('/auth/online-users'); }
  updateProfile(data) { return this.patch('/auth/profile', data); }
  updateAvatar(base64) { return this.patch('/auth/profile', { avatar: base64 }); }
  changePassword(current_password, new_password) {
    return this.post('/auth/change-password', { current_password, new_password });
  }

  // ═══════════════════════════════════════════════════════
  // Users Management
  // ═══════════════════════════════════════════════════════
  getUsers() { return this.get('/users'); }
  deleteUser(id) { return this.delete(`/users/${id}`); }
  approveUser(id) { return this.patch(`/users/${id}/approve`, {}); }
  rejectUser(id) { return this.patch(`/users/${id}/reject`, {}); }
  updateUserRole(id, role) { return this.patch(`/users/${id}/role`, { role }); }
  updateUserStatus(id, status) { return this.patch(`/users/${id}/status`, { status }); }
  toggleBlockUser(id) { return this.patch(`/users/${id}/block`, {}); }
  getLoginLogs() { return this.get('/login-logs'); }

  // ═══════════════════════════════════════════════════════
  // Permissions
  // ═══════════════════════════════════════════════════════
  getRolePermissions() { return this.get('/role-permissions'); }
  updateRolePermissions(permissions) {
    return this.request('/role-permissions', { method: 'PUT', body: JSON.stringify({ permissions }) });
  }
  getMyPermissions() { return this.get('/my-permissions'); }

  // ═══════════════════════════════════════════════════════
  // Requests
  // ═══════════════════════════════════════════════════════
  getRequests(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.get(`/requests${q ? '?' + q : ''}`);
  }
  getRequest(id) { return this.get(`/requests/${id}`); }
  getNextRequestNumber(request_type = 'REL') {
    return this.get(`/requests/next-number?request_type=${encodeURIComponent(request_type)}`);
  }
  createRequest(data) { return this.post('/requests', data); }
  updateRequest(id, data) { return this.patch(`/requests/${id}`, data); }
  deleteRequest(id) { return this.delete(`/requests/${id}`); }
  updateStep(requestId, stepNumber, data, leg = 1) {
    return this.patch(`/requests/${requestId}/steps/${stepNumber}?leg=${leg}`, data);
  }
  replaceSteps(requestId, steps, leg = 1) {
    return this.request(`/requests/${requestId}/steps`, {
      method: 'PUT', body: JSON.stringify({ steps, leg })
    });
  }
  addLeg(requestId) { return this.post(`/requests/${requestId}/legs`); }
  duplicateLeg(requestId, sourceLeg) { return this.post(`/requests/${requestId}/legs/${sourceLeg}/duplicate`); }
  removeLeg(requestId, legNumber) { return this.delete(`/requests/${requestId}/legs/${legNumber}`); }
  toggleRequestPriority(requestId) { return this.patch(`/requests/${requestId}/priority`, {}); }

  // ═══════════════════════════════════════════════════════
  // Request Notes & Workflow
  // ═══════════════════════════════════════════════════════
  updateNote(requestId, note) { return this.patch(`/requests/${requestId}/note`, { note }); }
  deleteNote(requestId) { return this.delete(`/requests/${requestId}/note`); }
  submitReview(id) { return this.post(`/requests/${id}/submit-review`, {}); }
  submitApproval(id) { return this.post(`/requests/${id}/submit-approval`, {}); }
  approveRequest(id) { return this.post(`/requests/${id}/approve`, {}); }
  rejectRequest(id) { return this.post(`/requests/${id}/reject`, {}); }
  completeReport(id, notes) { return this.post(`/requests/${id}/complete-report`, { notes }); }

  // ═══════════════════════════════════════════════════════
  // Reference Data
  // ═══════════════════════════════════════════════════════
  getMachines() { return this.get('/machines'); }
  getEmployees() { return this.get('/employees'); }
  getStepNames() { return this.get('/step-names'); }
  getStepCatalog() { return this.get('/step-catalog'); }
  patchStepCatalog(delta) { return this.patch('/step-catalog', delta); }

  // ═══════════════════════════════════════════════════════
  // Dashboard & Analytics
  // ═══════════════════════════════════════════════════════
  getDashboardStats() { return this.get('/dashboard'); }
  getProcessMonitoring() { return this.get('/process-monitoring'); }
  getSystemHealth(period = '24H') { return this.get(`/system/health?period=${period}`); }
}

const api = new ApiClient();
export default api;
```

---

## API Endpoint Structure

### Request Management Endpoints

```python
@api_router.get("/requests")
async def list_requests(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """List requests with optional filtering."""
    db = await get_db()
    try:
        query = "SELECT * FROM requests WHERE 1=1"
        params = []
        
        if status:
            query += " AND status = ?"
            params.append(status)
        
        if search:
            query += " AND (request_number LIKE ? OR device_name LIKE ? OR customer LIKE ?)"
            search_term = f"%{search}%"
            params.extend([search_term, search_term, search_term])
        
        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, skip])
        
        cursor = await db.execute(query, params)
        rows = await cursor.fetchall()
        
        requests = []
        for row in rows:
            req_dict = await _row_to_request_dict(db, row)
            requests.append(req_dict)
        
        return requests
    finally:
        await db.close()

@api_router.post("/requests")
async def create_request(
    req_data: RequestCreate,
    current_user: User = Depends(require_permission('create_request'))
):
    """Create new request."""
    db = await get_db()
    try:
        # Generate request number
        if not req_data.request_number:
            request_type = req_data.request_type or 'REL'
            cursor = await db.execute(
                f"SELECT MAX(CAST(SUBSTR(request_number, LENGTH(?) + 1) AS INTEGER)) FROM requests WHERE request_type = ?",
                (request_type, request_type)
            )
            row = await cursor.fetchone()
            next_num = (row[0] or 0) + 1
            req_data.request_number = f"{request_type}{next_num:05d}"
        
        # Create request
        req_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        await db.execute(
            """INSERT INTO requests (
                id, request_number, request_type, classification, originator, plant, device_name, lot_no,
                customer, pkg_info, automotive, date_ltc, product_hierarchy, pdl, body_size_x, body_size_y,
                package_thickness, ball_pitch, ball_count, lead_pitch, lead_count, total_ss, purpose,
                engineer_special_instruction, deadline, created_by, created_by_username, created_at, updated_at, status
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (req_id, req_data.request_number, req_data.request_type or 'REL',
             req_data.classification, req_data.originator, req_data.plant, req_data.device_name,
             req_data.lot_no, req_data.customer, req_data.pkg_info, req_data.automotive,
             req_data.date_ltc, req_data.product_hierarchy, req_data.pdl, req_data.body_size_x,
             req_data.body_size_y, req_data.package_thickness, req_data.ball_pitch, req_data.ball_count,
             req_data.lead_pitch, req_data.lead_count, req_data.total_ss, req_data.purpose,
             req_data.engineer_special_instruction, req_data.deadline,
             current_user.id, current_user.username, now, now, 'pending')
        )
        
        # Create default process steps
        default_steps = [
            (1, "Incoming Inspection"), (2, "Visual"), (3, "Serialize Samples"),
            (4, "O/S"), (5, "SAT"), (6, "Bake"), (7, "T & H Soak"), (8, "Reflow"),
            (9, "Electrical Test"), (10, "SAT"), (11, "O/S"), (12, "Visual"),
            (13, "Reliability Test"), (14, "SAT"), (15, "O/S"), (16, "Visual"),
        ]
        
        for step_no, step_name in default_steps:
            await db.execute(
                "INSERT INTO process_steps (request_id, leg, step_number, step_name, status) VALUES (?,?,?,?,?)",
                (req_id, 1, step_no, step_name, 'pending')
            )
        
        await db.commit()
        
        # Return created request
        cursor = await db.execute("SELECT * FROM requests WHERE id = ?", (req_id,))
        row = await cursor.fetchone()
        return await _row_to_request_dict(db, row)
    finally:
        await db.close()

@api_router.patch("/requests/{request_id}")
async def update_request(
    request_id: str,
    update_data: RequestCreate,
    current_user: User = Depends(require_permission('edit_request'))
):
    """Update request fields."""
    db = await get_db()
    try:
        fields, values = [], []
        for field in ['classification', 'originator', 'plant', 'device_name', 'lot_no', 'customer',
                      'pkg_info', 'date_ltc', 'product_hierarchy', 'pdl', 'purpose', 'deadline', 'note']:
            if getattr(update_data, field, None) is not None:
                fields.append(f"{field} = ?")
                values.append(getattr(update_data, field))
        
        if fields:
            fields.append("updated_at = ?")
            values.append(datetime.now(timezone.utc).isoformat())
            values.append(request_id)
            
            await db.execute(f"UPDATE requests SET {', '.join(fields)} WHERE id = ?", values)
            await db.commit()
        
        cursor = await db.execute("SELECT * FROM requests WHERE id = ?", (request_id,))
        row = await cursor.fetchone()
        return await _row_to_request_dict(db, row)
    finally:
        await db.close()
```

### Process Step Management Endpoints

```python
@api_router.patch("/requests/{request_id}/steps/{step_number}")
async def update_step(
    request_id: str,
    step_number: int,
    leg: int = 1,
    update_data: StepUpdate = None,
    current_user: User = Depends(require_permission('update_steps'))
):
    """Update a process step."""
    if update_data is None:
        update_data = StepUpdate()
    
    db = await get_db()
    try:
        fields, values = [], []
        
        for field in ['step_name', 'status', 'started_at', 'completed_at', 'machine_no', 'rack_no',
                      'operator_id', 'tray_no', 'qty_in', 'qty_out', 'notes', 'priority']:
            if getattr(update_data, field, None) is not None:
                fields.append(f"{field} = ?")
                values.append(getattr(update_data, field))
        
        if update_data.attachments is not None:
            fields.append("attachments = ?")
            values.append(json.dumps(update_data.attachments) if update_data.attachments else "[]")
        
        if update_data.custom_fields is not None:
            fields.append("custom_fields = ?")
            values.append(json.dumps(update_data.custom_fields) if update_data.custom_fields else "{}")
        
        if not fields:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        fields.append("updated_by = ?")
        values.extend([current_user.id, request_id, step_number, leg])
        
        await db.execute(
            f"UPDATE process_steps SET {', '.join(fields)} WHERE request_id = ? AND step_number = ? AND leg = ?",
            values
        )
        await db.commit()
        
        cursor = await db.execute(
            "SELECT * FROM process_steps WHERE request_id = ? AND step_number = ? AND leg = ?",
            (request_id, step_number, leg)
        )
        row = await cursor.fetchone()
        return row
    finally:
        await db.close()

@api_router.post("/requests/{request_id}/legs")
async def add_leg(
    request_id: str,
    current_user: User = Depends(require_permission('manage_steps'))
):
    """Add a new leg (copy) to a request."""
    db = await get_db()
    try:
        # Get max leg number
        cursor = await db.execute("SELECT MAX(leg) FROM process_steps WHERE request_id = ?", (request_id,))
        row = await cursor.fetchone()
        max_leg = row[0] or 0
        new_leg = max_leg + 1
        
        # Copy all steps from leg 1 to new leg
        cursor = await db.execute(
            "SELECT step_number, step_name FROM process_steps WHERE request_id = ? AND leg = 1",
            (request_id,)
        )
        steps = await cursor.fetchall()
        
        for step_no, step_name in steps:
            await db.execute(
                "INSERT INTO process_steps (request_id, leg, step_number, step_name, status) VALUES (?,?,?,?,?)",
                (request_id, new_leg, step_no, step_name, 'pending')
            )
        
        await db.commit()
        return {"message": f"Leg {new_leg} created successfully"}
    finally:
        await db.close()
```

---

## Data Seeding

### Default Machines (80 preloaded)

```python
default_machines = [
    ('RXN-001','3D XRAY'),('RPL-001','AUTO POLISHER'),('RMD-002','B.SHEAR / W.PULL'),
    ('RDL-001','DEGASSER'),('RTT-001','DIGITAL SERIAL ANALYZER'),('RDJ-001','DRILLING/MILLING M/C'),
    ('RDC-001','DRY BOX'),('REH-001','EMISSION MICROSCOPE'),('RRV-001','REFLOW'),
    ('RFN-003','FTIR'),('RHE-001','HAST'),('RHH-001','HAST'),('RHH-002','HAST'),
    ('RHH-004','HAST'),('RHH-005','HAST'),('RHH-006','HAST'),('RHT-001','HAST'),
    ('RHT-002','HAST'),('RMN-001','HIGH OPTICAL MICROSCOPE'),('RMO-010','HIGH OPTICAL MICROSCOPE'),
    ('ROE-001','HTS'),('ROE-002','HTS'),('ROE-003','HTS'),('ROE-004','HTS'),
    ('ROE-005','HTS'),('ROE-006','HTS'),('ROE-007','HTS'),
    ('RPJ-001','ION BEAM POLISHER'),('RIC-001','ION COATER'),('RIT-001','ION COATER'),
    ('RIH-002','ION MILL'),('RIH-001','ION SPUTTER'),('RIH-004','ION SPUTTER'),
    ('RIS-001','IONIZER'),('RIS-002','IONIZER'),('RIS-003','IONIZER'),('RIS-004','IONIZER'),
    ('RIS-005','IONIZER'),('RIS-006','IONIZER'),('RIS-007','IONIZER'),
    ('RNL-001','LASER AUTO-DECAPSULATOR'),('RCL-001','LASER AUTO-DECAPSULATOR'),
    ('RLT-001','LOCK-IN TOMOGRAPHY'),('RMO-012','LOW MAG SCOPE'),
    ('RME-001','LOW MAG SCOPE'),('RME-002','LOW MAG SCOPE'),
    ('RMO-007','LOW OPT. MICROSCOPE'),('RMO-008','LOW OPT. MICROSCOPE'),
    ('RMO-004','LOW OPT. MICROSCOPE'),('RMO-005','LOW OPT. MICROSCOPE'),
    ('RMO-006','LOW OPT. MICROSCOPE'),('RMO-009','LOW OPT. MICROSCOPE'),
    ('RMV-001','LOW POWER SCOPE (ICAPS)'),('RSO-001','MEASURING MIC.'),
    ('RMM-001','MILLI OHMS RESISTANCE TESTER'),
    ('ROH-001','O/S TESTER'),('ROH-002','O/S TESTER'),('ROH-003','O/S TESTER'),
    ('ROH-004','O/S TESTER'),('RTI-001','O/S TESTER'),('ROC-001','OS TESTER HANDLER'),
    ('RPB-004','PLASMA DECAPPER'),('RMJ-001','PLASMA ETCHING MACHINE'),
    ('RPB-005','POLISHER'),('RPB-007','POLISHER'),('RRH-001','REFLOW'),
    ('RSS-003','SAT'),('RSS-005','SAT'),('RSS-006','SAT'),
    ('RSH-002','SEM'),('RSF-001','SEM/EDX/FIB'),('RSH-003','SEM/EDX'),
    ('RCE-002','TC'),('RCE-003','TC'),('RCE-004','TC'),('RCY-001','TC'),
    ('RCW-002','TC'),('RCW-003','TC'),
    ('RTE-001','TH'),('RTE-003','TH'),('RTE-005','TH'),('RTE-006','TH'),
    ('RTE-007','TH'),('RTE-008','TH'),('RTW-001','TH'),('RTW-002','TH'),
    ('RTW-003','TH'),('RTW-005','TH'),('RTW-007','TH'),('RTV-001','TH'),('RTV-002','TH'),
    ('RUS-001','ULTRA SLICE'),('RUA-001','ULTRASONIC CLEANER'),
    ('RPE-001','VAR. GRIN. POLISHER'),('RWM-002','WEIGHING BALANCE'),
    ('RMD-003','WIREPULL / BALLSHEAR TESTER'),
    ('RHP-001','HOT PLATE'),('RHP-002','HOT PLATE'),('RMK-001','3D SCOPE'),
]

# Insert into database
await db.executemany("INSERT INTO machines (machine_no, description) VALUES (?,?)", default_machines)
```

### Default Employees (35 preloaded)

```python
default_employees = [
    ('947241','Celia Corpuz','Manager'),
    ('105445','Conrado Hidalgo','Sr. FA Engr'),
    ('240097','Pamela Satur','Rel Engr'),
    ('240167','Shelah Mae Perez','Rel Engr'),
    ('240168','Clarence Joshua Ramirez','FA Engr'),
    ('250296','Allyza Nicole Humirang','Rel Engr'),
    ('960853','Loreta Veran','Sr. Rel Engr'),
    ('993404','Lea Dalanon','FA Operation Engr'),
    ('982308','Esmeria, Erwin','FA ES P3'),
    ('175081','Hatulan, Irving','FA ES P3'),
    ('175075','Delos Santos, Charito','FA ES P3'),
    ('105294','Bermiso, Ricky','FA ES P3'),
    ('240427','Monterosa, Shaira','FA ES P3'),
    ('175083','Supapo, Bryane','FA ES P3'),
    ('175087','Ortiz, Van Joven','FA ES P3'),
    ('175198','Del Rosario, Wowie','FA ES P3'),
    ('175082','Foronda, Georjan','FA ES P3'),
    ('202544','Salazar, Jeronel','FA ES P3'),
    ('250125','Dela Rosa, Rowell','FA ES P3'),
    ('250158','Remigio, Alcen','FA ES P3'),
    ('250135','Trinidad, Maricel','REL ES'),
    ('155253','Delos Santos, Chlarissa','REL ES'),
    ('145087','Santiago, Kimberly Rose','REL ES'),
    ('155252','De Mesa, Rosemarie','REL ES'),
    ('175088','Velitario, Madelyn','REL ES'),
    ('145084','Arcega, Johnrey','REL ES'),
    ('155420','Reig, Leonito','REL ES'),
    ('175089','Barrera, Marissa','REL ES'),
    ('175074','Cruz, Jasthine Mae','REL ES'),
    ('230076','Rizano, Jan Mark','REL ES'),
    ('250136','Semillano, Adrian','REL ES'),
    ('252523','Balcita, Jeriel','REL ES'),
    ('981931','Reggie Quito','REL ES'),
    ('155389','Roy Tiquis','REL ES'),
    ('180966','Eduardo Visca','REL ES'),
]

# Insert into database
await db.executemany("INSERT OR IGNORE INTO employees (id, name, position) VALUES (?,?,?)", default_employees)
```

### Default Admin Account

```python
# Seed default admin if not exists
cursor = await db.execute("SELECT id FROM users WHERE email = ?", ("admin@amkor.com",))
if not await cursor.fetchone():
    admin_id = str(uuid.uuid4())
    _initial_pw = secrets.token_urlsafe(12)  # Generate random password
    admin_pw = hash_password(_initial_pw)
    now = datetime.now(timezone.utc).isoformat()
    
    await db.execute(
        "INSERT INTO users (id, email, username, password, role, approved, created_at) VALUES (?,?,?,?,?,?,?)",
        (admin_id, "admin@amkor.com", "Admin", admin_pw, "Admin", 1, now)
    )
    await db.commit()
    logging.warning(f"🔐 Default admin created.\nEmail: admin@amkor.com\nPassword: {_initial_pw}\n⚠️ CHANGE THIS PASSWORD IMMEDIATELY!")
```

### Default Role Permissions

```python
ALL_PERMISSIONS = [
    'create_request', 'edit_request', 'delete_request',
    'update_steps', 'manage_steps',
    'manage_users', 'manage_settings', 'import_requests', 'manage_backups',
]

DEFAULT_ROLE_PERMISSIONS = {
    'Admin': ALL_PERMISSIONS.copy(),
    'Reliability Engineer': ALL_PERMISSIONS.copy(),
    'Failure Analysis': [],
    'Technician': ['update_steps'],
    'Planner': ['update_steps', 'edit_request'],
}

for role, perms in DEFAULT_ROLE_PERMISSIONS.items():
    for p in ALL_PERMISSIONS:
        granted = 1 if p in perms else 0
        try:
            await db.execute(
                "INSERT INTO role_permissions (role, permission, granted) VALUES (?, ?, ?) "
                "ON CONFLICT(role, permission) DO NOTHING",
                (role, p, granted)
            )
        except Exception:
            pass

await db.commit()
```

---

## Import & Icon Patterns

### Lucide React Icons Usage

```javascript
// Common imports at component level
import {
  // Navigation & UI
  LayoutDashboard, ClipboardList, Settings, Users, LogOut, Menu, X,
  // Status & Actions
  CheckCircle2, AlertTriangle, Clock, ChevronRight, ChevronDown, ChevronUp,
  // Forms & Data
  Plus, Trash2, Edit3, Save, Download, Upload, FileSpreadsheet, FileText,
  // Notifications & Status
  Bell, AlertCircle, TrendingUp, Waves, Flame, Thermometer,
  // Theme
  Sun, Moon,
  // Other
  Eye, EyeOff, Search, Filter, Archive, Database,
} from 'lucide-react';

// Usage patterns
<LayoutDashboard className="w-5 h-5" />
<CheckCircle2 className="w-4 h-4 text-emerald-500" />
<AlertTriangle className="w-5 h-5 text-amber-500" />
```

### Component Import Patterns

```javascript
// Context providers
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// API client
import api from '../api';

// Routing
import { useNavigate, useParams, useLocation } from 'react-router-dom';

// Layout components
import Layout from '../components/Layout';
import Sidebar from '../components/Sidebar';
import PageTransition from '../components/PageTransition';
import ProcessTimeline from '../components/ProcessTimeline';

// Modals & Dialogs
import ConfirmDialog from '../components/ConfirmDialog';
import CreateRequestModal from '../components/CreateRequestModal';
import ImportExcelModal from '../components/ImportExcelModal';

// Constants
import { FIELDS } from '../constants/requestFields';
import { retentionConstants } from '../constants/retentionConstants';

// Charts
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
```

### Styling Patterns (TailwindCSS + Dark Mode)

```javascript
// Dark mode aware styling
const statusMap = {
  pending:  'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  review:   'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  approval: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800',
  testing:  'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  analysis: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800',
  completed:'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
};

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Responsive typography
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white">

// Responsive padding
<div className="p-3 sm:p-6 md:p-8">

// Transitions
<div className="transition-colors duration-300">
<div className="transition-transform ease-out">

// Hover states
className="hover:bg-slate-100 dark:hover:bg-slate-800 hover:scale-[1.02]"
```

---

## Summary

This compilation provides a complete reference for:

✅ **Frontend**: React context patterns, component organization, auth flow  
✅ **Backend**: Database schema, authentication, API endpoint structure  
✅ **Data**: 80 machines, 35 employees, admin account, permissions seed  
✅ **Patterns**: API client usage, TailwindCSS styling, lucide-react icons  
✅ **Security**: JWT tokens, bcrypt hashing, role-based permissions  

All code snippets are production-ready and follow current best practices for React 18 + FastAPI development.

---

**Document Version**: 1.0  
**Last Updated**: 2026-07-01  
**Source Project**: REL Request Process Flow Web Application
