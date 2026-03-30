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

  useEffect(() => {
    if (!user || user.isGuest) return;

    const poll = async () => {
      try {
        const data = await api.getOnlineUsers();
        const currentIds = new Set((data.users || []).map(u => u.id));

        if (knownOnlineIds.current === null) {
          // First poll — just record who's online, don't show toasts
          knownOnlineIds.current = currentIds;
          return;
        }

        // Find users who just came online (excluding self)
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
          // Auto-dismiss each after 5 s
          newToasts.forEach(t => {
            setTimeout(() => dismissToast(t.id), 5000);
          });
        }

        knownOnlineIds.current = currentIds;
      } catch { /* ignore network errors silently */ }
    };

    // Poll immediately then every 20 seconds
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
          <div className="p-6 md:p-8 max-w-7xl mx-auto">
            <PageTransition />
          </div>
        </main>
      </div>

      {/* Online user toast notifications */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[9998] flex flex-col gap-2 items-end pointer-events-none">
          {toasts.map(t => (
            <div
              key={t.id}
              className="pointer-events-auto flex items-center gap-3 bg-slate-900 dark:bg-slate-800 text-white rounded-xl shadow-2xl border border-slate-700/60 px-4 py-3 min-w-[220px] max-w-[280px] animate-slide-in-right"
            >
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-xs font-bold uppercase bg-emerald-600 text-white border-2 border-emerald-400">
                {t.avatar
                  ? <img src={t.avatar} alt={t.username} className="w-full h-full object-cover" />
                  : (t.username?.[0] || '?')
                }
              </div>
              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400 leading-none mb-0.5">Now Online</p>
                <p className="text-sm font-semibold truncate leading-tight">{t.username}</p>
              </div>
              {/* Online dot */}
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 flex-shrink-0 ring-2 ring-emerald-400/30 animate-pulse" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
