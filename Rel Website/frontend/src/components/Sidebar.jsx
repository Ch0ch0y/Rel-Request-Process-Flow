import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard, ClipboardList, Settings, Users, LogOut, X, CheckCircle2, FileText, Archive, ListFilter, MonitorDot,
  Sun, Moon, ShieldCheck, ChevronRight, Layers, Microscope, ExternalLink, PackageOpen, BarChart3
} from 'lucide-react';
import AmkorLogo from '../assets/amkor-logo.svg';

const allNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home', end: true, guestAllowed: true },
  {
    to: '/requests', icon: ClipboardList, label: 'All Requests', guestAllowed: true,
    subItems: [
      { to: '/my-requests', icon: FileText, label: 'My Requests', guestAllowed: false },
      { to: '/completed', icon: CheckCircle2, label: 'All Requests Completed', guestAllowed: true },
    ]
  },
  { to: '/approval', icon: ShieldCheck, label: 'Approval Queue', guestAllowed: false, roles: ['Admin', 'Planner'] },
  { to: '/loading-unloading', icon: PackageOpen, label: 'Loading / Unloading', guestAllowed: true, roles: ['Technician', 'Admin', 'Reliability Engineer', 'Planner'] },
  { to: '/performance', icon: BarChart3, label: 'Performance Monitor', guestAllowed: false, roles: ['Admin', 'Reliability Engineer', 'Planner'] },
  {
    to: '/_record-monitor', icon: Layers, label: 'Record Monitor', guestAllowed: false, noNav: true,
    subItems: [
      { to: '/request-filter', icon: ListFilter, label: 'Request Filter', guestAllowed: false, roles: ['Admin', 'Reliability Engineer'] },
      { to: '/backup-viewer', icon: Archive, label: 'Backup Viewer', guestAllowed: false },
      { to: '/retention-monitor', icon: Archive, label: 'Retention Monitor', guestAllowed: false, roles: ['Admin', 'Reliability Engineer'] },
    ]
  },
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
  const location = useLocation();
  const [viewingAvatar, setViewingAvatar] = useState(null);
  const [hoveredGroup, setHoveredGroup] = useState(null);
  const [tappedGroup, setTappedGroup] = useState(null);
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

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

  const handleSettingsClick = (e) => {
    onClose?.();
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-400">
      {/* Logo + close */}
      <div className="flex items-center justify-between h-14 px-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <img src={AmkorLogo} alt="Amkor Technology" className="h-7 brightness-0 invert" />
        </div>
        <button onClick={onClose} className="lg:hidden p-1 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Theme & Notifications */}
      <div className="px-5 py-2 border-b border-slate-800 flex items-center justify-end">
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-md hover:bg-slate-800 hover:text-white transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* CA shortcut button */}
      <div className="px-3 py-2 border-b border-slate-800">
        <a
          href={`${window.location.protocol}//${window.location.hostname}:${Number(window.location.port || 80) + 1}/login`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-violet-600/15 text-violet-400 hover:bg-violet-600 hover:text-white text-sm font-medium transition-all border border-violet-600/25 hover:border-violet-600 hover:shadow-lg hover:shadow-violet-600/20"
        >
          <Microscope className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1 leading-tight">Construction Analysis</span>
          <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-60" />
        </a>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          if (item.subItems && item.subItems.length > 0) {
            const isGroupHovered = hoveredGroup === item.to || tappedGroup === item.to;
            const isSubActive = item.subItems.some(s => location.pathname === s.to);
            const headerCls = `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium nav-link-transition w-full text-left ${
              isSubActive
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`;
            return (
              <div
                key={item.to}
                onMouseEnter={() => !isTouchDevice && setHoveredGroup(item.to)}
                onMouseLeave={() => !isTouchDevice && setHoveredGroup(null)}
              >
                {item.noNav ? (
                  <button className={headerCls} onClick={() => setTappedGroup(tappedGroup === item.to ? null : item.to)}>
                    <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${isGroupHovered ? 'rotate-90' : ''}`} />
                  </button>
                ) : (
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={(e) => {
                      if (isTouchDevice && !isGroupHovered) {
                        e.preventDefault();
                        setTappedGroup(item.to);
                        return;
                      }
                      setTappedGroup(null);
                      if (item.to === '/settings') handleSettingsClick(e);
                      else onClose?.();
                    }}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium nav-link-transition ${
                        isActive || isSubActive
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`
                    }
                  >
                    <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${isGroupHovered ? 'rotate-90' : ''}`} />
                  </NavLink>
                )}
                {/* Sub-items revealed on hover or tap */}
                <div className={`overflow-hidden transition-all duration-200 ${isGroupHovered ? 'max-h-56 opacity-100 mt-0.5' : 'max-h-0 opacity-0'}`}>
                  <div className="ml-3 pl-3 border-l border-slate-700 space-y-0.5 py-0.5">
                    {item.subItems.map(sub => (
                      <NavLink
                        key={sub.to}
                        to={sub.to}
                        onClick={onClose}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium nav-link-transition ${
                            isActive
                              ? 'bg-blue-600/80 text-white shadow-md shadow-blue-600/20'
                              : 'text-slate-400 hover:text-white hover:bg-slate-800'
                          }`
                        }
                      >
                        <sub.icon className="w-4 h-4 flex-shrink-0" />
                        {sub.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>
            );
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium nav-link-transition ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2">
          <div
            className={`w-8 h-8 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-xs font-bold text-white uppercase ${
              user?.isGuest ? 'bg-amber-600' : 'bg-slate-700'
            } ${user?.avatar ? 'cursor-pointer ring-2 ring-transparent hover:ring-blue-400 transition-all' : ''}`}
            onClick={() => user?.avatar && setViewingAvatar({ src: user.avatar, name: user?.username })}
            title={user?.avatar ? 'Click to view photo' : undefined}
          >
            {user?.avatar
              ? <img src={user.avatar} alt={user?.username} className="w-full h-full object-cover" />
              : (user?.username?.[0] || '?')
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.username}</p>
            <div className="flex items-center gap-1.5">
              <p className="text-xs text-slate-500 truncate">{user?.role}</p>
              {user?.isGuest && (
                <span className="text-xs bg-amber-600/20 text-amber-400 px-1.5 py-0.5 rounded font-medium">Guest</span>
              )}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-md hover:bg-slate-800 hover:text-white transition-colors"
            title={user?.isGuest ? 'Exit' : 'Logout'}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Avatar lightbox */}
      {viewingAvatar && (
        <div
          className="fixed inset-0 z-[9999] bg-black/75 flex flex-col items-center justify-center gap-4"
          onClick={() => setViewingAvatar(null)}
        >
          <img
            src={viewingAvatar.src}
            alt={viewingAvatar.name}
            className="w-52 h-52 rounded-full object-cover shadow-2xl ring-4 ring-white/20"
            onClick={e => e.stopPropagation()}
          />
          {viewingAvatar.name && (
            <p className="text-white text-sm font-semibold tracking-wide">{viewingAvatar.name}</p>
          )}
          <p className="text-white/50 text-xs">Click anywhere to close</p>
        </div>
      )}
    </div>
  );
}
