import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import {
  Activity, Users, RefreshCw, Clock, ClipboardList,
  Edit3, TrendingUp, Shield, Wifi, Server, CheckCircle2,
  AlertTriangle, PauseCircle, BarChart3, ArrowRight
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, accent = 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700', iconColor = 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' }) {
  return (
    <div className={`rounded-xl border p-5 shadow-sm ${accent}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1 font-heading">{value ?? '—'}</p>
          {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

const STATUS_COLORS = {
  incoming: 'bg-amber-100 text-amber-700 border-amber-200',
  pending: 'bg-slate-100 text-slate-600 border-slate-200',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  hold: 'bg-orange-100 text-orange-700 border-orange-200',
};

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[status] || STATUS_COLORS.pending}`}>
      {status?.replace('_', ' ')}
    </span>
  );
}

function SectionHeader({ icon: Icon, title, count }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
        <Icon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
      </div>
      <h3 className="font-heading font-semibold text-slate-800 dark:text-slate-100 text-sm">{title}</h3>
      {count != null && (
        <span className="ml-auto text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-medium">{count}</span>
      )}
    </div>
  );
}

export default function TaskManager() {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Redirect non-admins
  useEffect(() => {
    if (user && !hasRole('Admin')) navigate('/');
  }, [user, hasRole, navigate]);

  const loadStats = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const data = await api.getTaskManagerStats();
      setStats(data);
      setLastRefresh(new Date());
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats(false);
  }, [loadStats]);

  // Auto refresh every 30s
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => loadStats(false), 30_000);
    return () => clearInterval(id);
  }, [autoRefresh, loadStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-6 py-4 text-sm">
          {error}
        </div>
      </div>
    );
  }

  const statusChartOrder = ['incoming', 'in_progress', 'completed', 'hold', 'pending'];

  return (
    <div className="space-y-8 stagger-children">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 dark:text-white tracking-tight">Task Manager</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            System performance &amp; real-time activity overview
            {lastRefresh && (
              <span className="ml-2 text-xs text-slate-400">
                · Last updated {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
              autoRefresh
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            {autoRefresh ? 'Auto On' : 'Auto Off'}
          </button>
          <button
            onClick={() => loadStats(true)}
            disabled={refreshing}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-4 py-2 text-sm font-medium shadow-sm disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Users Online"
          value={stats?.users_online ?? 0}
          sub="Active in last 5 min"
          iconColor="bg-emerald-100 text-emerald-600"
        />
        <StatCard
          icon={Shield}
          label="Total Users"
          value={stats?.total_users ?? 0}
          sub="Registered accounts"
          iconColor="bg-blue-100 text-blue-600"
        />
        <StatCard
          icon={ClipboardList}
          label="Total Requests"
          value={stats?.total_requests ?? 0}
          sub="All time"
          iconColor="bg-violet-100 text-violet-600"
        />
        <StatCard
          icon={Server}
          label="Server Time"
          value={stats?.server_time
            ? new Date(stats.server_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
            : '—'}
          sub={stats?.server_time ? new Date(stats.server_time).toLocaleDateString() : ''}
          iconColor="bg-slate-100 text-slate-600"
        />
      </div>

      {/* Status breakdown */}
      {stats?.status_counts && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-5">
          <SectionHeader icon={BarChart3} title="Request Status Breakdown" />
          <div className="flex flex-wrap gap-3">
            {statusChartOrder.map(s => {
              const count = stats.status_counts[s] ?? 0;
              return (
                <div key={s} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${STATUS_COLORS[s] || STATUS_COLORS.pending}`}>
                  <span className="text-lg font-bold font-heading">{count}</span>
                  <span className="text-xs font-medium capitalize">{s.replace('_', ' ')}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Two columns: recent requests + recent step edits */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Requests */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-5">
          <SectionHeader
            icon={ClipboardList}
            title="Recently Added Requests"
            count={stats?.recent_requests?.length ?? 0}
          />
          {stats?.recent_requests?.length ? (
            <ul className="space-y-2">
              {stats.recent_requests.map(req => (
                <li key={req.id} className="flex items-start gap-3 py-2 border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ClipboardList className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{req.request_number}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{req.created_by_username} · {new Date(req.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}</p>
                  </div>
                  <StatusBadge status={req.status} />
                </li>
              ))}
            </ul>
          ) : (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">No recent requests.</p>
          )}
        </div>

        {/* Recent Step Edits */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-5">
          <SectionHeader
            icon={Edit3}
            title="Recently Edited Steps"
            count={stats?.recent_step_edits?.length ?? 0}
          />
          {stats?.recent_step_edits?.length ? (
            <ul className="space-y-2">
              {stats.recent_step_edits.map((edit, i) => (
                <li key={i} className="flex items-start gap-3 py-2 border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Edit3 className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{edit.step_name || `Step ${edit.step_number}`}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                      {edit.request_number} · {new Date(edit.updated_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                    </p>
                    {edit.by && <p className="text-xs text-blue-500 dark:text-blue-400 truncate">by {edit.by}</p>}
                  </div>
                  <StatusBadge status={edit.status} />
                </li>
              ))}
            </ul>
          ) : (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">No recent step edits.</p>
          )}
        </div>
      </div>

      {/* Recent Logins */}
      {stats?.recent_logins?.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-5">
          <SectionHeader icon={Activity} title="Recent Logins" count={stats.recent_logins.length} />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <th className="text-left pb-2 text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">User</th>
                  <th className="text-left pb-2 text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">Role</th>
                  <th className="text-left pb-2 text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {stats.recent_logins.map((log, i) => (
                  <tr key={i}>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">
                          {log.username?.[0] || '?'}
                        </div>
                        <span className="text-sm text-slate-700 dark:text-slate-300">{log.username}</span>
                      </div>
                    </td>
                    <td className="py-2 text-xs text-slate-500 dark:text-slate-400">{log.role}</td>
                    <td className="py-2 text-xs text-slate-400 dark:text-slate-500">{new Date(log.login_time).toLocaleString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
