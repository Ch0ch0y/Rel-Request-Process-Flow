import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard, ClipboardList, CalendarDays, Settings,
  ScrollText, LogOut, X, Users, ChevronRight, Sun, Moon, ArrowLeft, ShieldCheck, Archive,
} from 'lucide-react';
import AmkorLogo from '../assets/amkor-logo.svg';

const allNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home Dashboard', end: true },
  { to: '/requests', icon: ClipboardList, label: 'All CADMS Requests' },
  { to: '/approval', icon: ShieldCheck, label: 'Approval Queue', roles: ['Admin', 'REL Engineer', 'Planner'] },
  { to: '/scheduling', icon: CalendarDays, label: 'Scheduling' },
  { to: '/records', icon: ScrollText, label: 'Record Monitor' },
  { to: '/backup', icon: Archive, label: 'CA Backup', roles: ['Admin'] },
  { to: '/retention-monitor', icon: ClipboardList, label: 'Retention Monitor', roles: ['Admin', 'REL Engineer'] },
  {
    to: '/settings', icon: Settings, label: 'Settings', roles: ['Admin'],
    subItems: [
      { to: '/users', icon: Users, label: 'Users', roles: ['Admin'] },
    ],
  },
];

const AVATAR_COLORS = ['bg-violet-600','bg-blue-600','bg-emerald-600','bg-orange-600','bg-red-600','bg-teal-600'];

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredGroup, setHoveredGroup] = useState(null);

  const canSee = (item) => !item.roles || item.roles.includes(user?.role);

  const navItems = allNavItems
    .filter(canSee)
    .map(item => ({ ...item, subItems: (item.subItems || []).filter(canSee) }));

  const handleLogout = () => { logout(); navigate('/login'); };

  const avatarColor = AVATAR_COLORS[(user?.id ?? 0) % AVATAR_COLORS.length];

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

      {/* Theme toggle row */}
      <div className="px-5 py-2 border-b border-slate-800 flex items-center justify-end">
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-md hover:bg-slate-800 hover:text-white transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Return to Rel Website button */}
      <div className="px-3 py-2 border-b border-slate-800">
        <a
          href={`${window.location.protocol}//${window.location.hostname}:${Number(window.location.port || 80) - 1}`}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-blue-600/15 text-blue-400 hover:bg-blue-600 hover:text-white text-sm font-medium transition-all border border-blue-600/25 hover:border-blue-600 hover:shadow-lg hover:shadow-blue-600/20"
        >
          <ArrowLeft className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1 leading-tight">RELDMS</span>
        </a>
      </div>

      {/* CA label */}
      <div className="px-5 pt-4 pb-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-500">CADMS</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const subs = item.subItems || [];
          if (subs.length > 0) {
            const isGroupHovered = hoveredGroup === item.to;
            const isSubActive = subs.some(s => location.pathname === s.to);
            return (
              <div
                key={item.to}
                onMouseEnter={() => setHoveredGroup(item.to)}
                onMouseLeave={() => setHoveredGroup(null)}
              >
                <NavLink
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium nav-link-transition ${
                      isActive || isSubActive
                        ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${isGroupHovered ? 'rotate-90' : ''}`} />
                </NavLink>
                <div className={`overflow-hidden transition-all duration-200 ${isGroupHovered ? 'max-h-56 opacity-100 mt-0.5' : 'max-h-0 opacity-0'}`}>
                  <div className="ml-3 pl-3 border-l border-slate-700 space-y-0.5 py-0.5">
                    {subs.map(sub => (
                      <NavLink
                        key={sub.to}
                        to={sub.to}
                        onClick={onClose}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium nav-link-transition ${
                            isActive
                              ? 'bg-violet-600/80 text-white shadow-md shadow-violet-600/20'
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
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white uppercase ${avatarColor}`}>
            {user?.username?.[0] || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.username}</p>
            <p className="text-xs text-slate-500 truncate">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-md hover:bg-slate-800 hover:text-white transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

