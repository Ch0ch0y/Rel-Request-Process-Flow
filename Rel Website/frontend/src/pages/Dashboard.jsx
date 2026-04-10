import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api';
import CriticalBackupModal from '../components/CriticalBackupModal';
import {
  Clock, AlertTriangle, ArrowRight,
  Calendar, BarChart3, MessageSquarePlus, Layers,
  Eye, Waves, Flame, Thermometer, PackageSearch, Wrench, PauseCircle,
  TrendingUp, LayoutGrid, CheckCircle2, ClipboardList, Activity,
  ChevronRight, ListChecks, Hourglass, Timer, Inbox, Zap, FileCheck, PlayCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

function usePHTClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const time = now.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: false });
  const date = now.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'long', day: 'numeric', year: 'numeric' });
  return { time, date };
}

function StatCard({ icon: Icon, label, value, color, accent, subtext, onClick, trend }) {
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl border p-5 shadow-sm hover:shadow-md transition-all duration-300 ${accent || 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'} ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
    >
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-[0.06] -mr-6 -mt-6" style={{ background: 'currentColor' }} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1 font-heading">{value}</p>
          {subtext && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subtext}</p>}
          {trend != null && (
            <p className={`text-xs mt-1 flex items-center gap-1 font-medium ${trend >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
              <TrendingUp className="w-3 h-3" />
              {trend >= 0 ? '+' : ''}{trend}% vs last month
            </p>
          )}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    incoming: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    pending:  'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    review:   'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    approval: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800',
    testing:  'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
    in_progress: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
    analysis: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800',
    completed:'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  };
  const labels = {
    incoming: 'Request', pending: 'Request', review: 'Review',
    approval: 'Approval', testing: 'Testing', in_progress: 'Testing',
    analysis: 'Analysis', completed: 'Completed',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${map[status] || 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'}`}>
      {labels[status] || status?.replace('_', ' ')}
    </span>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 dark:bg-slate-950 text-white px-3 py-2 rounded-lg shadow-lg text-sm border border-slate-700">
        <p className="font-medium">{label}</p>
        <p className="text-slate-300">{payload[0].value} requests</p>
      </div>
    );
  }
  return null;
}

const WORKFLOW_STAGES = [
  { id: 'request',  label: 'Request',  sub: 'Submit test request',   icon: Inbox,        color: 'bg-amber-500',   ring: 'ring-amber-300',   countKey: 'pending_requests' },
  { id: 'review',   label: 'Review',   sub: 'Technical review',       icon: Eye,          color: 'bg-blue-500',    ring: 'ring-blue-300',    countKey: 'review_requests' },
  { id: 'approval', label: 'Approval', sub: 'Management approval',    icon: CheckCircle2, color: 'bg-violet-500',  ring: 'ring-violet-300',  countKey: 'approval_requests' },
  { id: 'testing',  label: 'Testing',  sub: 'Execute tests',          icon: Zap,          color: 'bg-orange-500',  ring: 'ring-orange-300',  countKey: 'testing_requests' },
  { id: 'analysis', label: 'Analysis', sub: 'Analyze results',        icon: BarChart3,    color: 'bg-teal-500',    ring: 'ring-teal-300',    countKey: 'analysis_requests' },
  { id: 'completed',label: 'Report',   sub: 'Final documentation',    icon: FileCheck,    color: 'bg-emerald-500', ring: 'ring-emerald-300', countKey: 'completed_requests' },
];

const STAGE_NAV = {
  request:   '/requests?status=incoming',
  review:    '/requests?status=review',
  approval:  '/approval',
  testing:   '/requests?status=testing',
  analysis:  '/requests?status=analysis',
  completed: '/completed',
};

function WorkflowPipeline({ stats, onNavigate }) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-5 shadow-sm">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">RELDMS · Process Flow</p>
      <div className="flex items-center justify-between gap-1 overflow-x-auto sm:overflow-visible">
        {WORKFLOW_STAGES.map((stage, i) => {
          const IconComponent = stage.icon;
          return (
            <React.Fragment key={stage.id}>
              <button
                onClick={() => onNavigate(STAGE_NAV[stage.id])}
                className="flex flex-col items-center gap-1.5 flex-1 group cursor-pointer focus:outline-none"
                title={`View ${stage.label} requests`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm ring-2 ${stage.color} ${stage.ring} ring-offset-1 dark:ring-offset-slate-800 transition-transform duration-150 group-hover:scale-110 group-active:scale-95`}>
                  <IconComponent className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{stage.label}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight hidden sm:block">{stage.sub}</p>
                  <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                    {stats?.[stage.countKey] ?? 0}
                  </p>
                </div>
              </button>
              {i < WORKFLOW_STAGES.length - 1 && (
                <div className="text-slate-300 dark:text-slate-600 text-lg flex-shrink-0">›</div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-3">Click a stage to view its requests</p>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashMode, setDashMode] = useState('my');
  const [contentKey, setContentKey] = useState(0);
  const [slideDir, setSlideDir] = useState(1);
  const isInitialMount = useRef(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { time, date } = usePHTClock();
  const isTechnician = user?.isGuest || user?.role === 'Technician';
  const isDark = theme === 'dark';
  // Chart colors adapt to theme
  const CHART_COLORS_THEME = isDark
    ? { Request: '#f59e0b', Review: '#3b82f6', Approval: '#8b5cf6', Testing: '#f97316', Analysis: '#14b8a6', Completed: '#10b981', Delayed: '#f43f5e' }
    : { Request: '#f59e0b', Review: '#3b82f6', Approval: '#7c3aed', Testing: '#ea580c', Analysis: '#0d9488', Completed: '#10b981', Delayed: '#ef4444' };

  useEffect(() => {
    const initial = isInitialMount.current;
    isInitialMount.current = false;
    if (initial) setLoading(true);
    setError('');
    api.getDashboardStats(dashMode === 'my')
      .then(data => {
        setStats(data);
        if (!initial) setContentKey(k => k + 1);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [dashMode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">{error}</div>
    );
  }

  const chartData = [
    { name: 'Request',  value: stats.pending_requests,   color: CHART_COLORS_THEME.Request },
    { name: 'Review',   value: stats.review_requests,    color: CHART_COLORS_THEME.Review },
    { name: 'Approval', value: stats.approval_requests,  color: CHART_COLORS_THEME.Approval },
    { name: 'Testing',  value: stats.testing_requests,   color: CHART_COLORS_THEME.Testing },
    { name: 'Analysis', value: stats.analysis_requests,  color: CHART_COLORS_THEME.Analysis },
    { name: 'Completed',value: stats.completed_requests, color: CHART_COLORS_THEME.Completed },
  ];

  return (
    <>
      {/* Critical Backup Modal - Blocks entire interface */}
      {stats?.requires_critical_backup && (
        <CriticalBackupModal requestCount={stats.total_requests + stats.completed_requests} />
      )}
      
      <div className="space-y-6 stagger-children">
      {/* Header — flat, with PHT clock */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isTechnician ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
            }`}>
              {isTechnician
                ? <Wrench className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                : <LayoutGrid className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
            </div>
            <div>
              <h1 className="text-xl font-heading font-bold text-slate-900 dark:text-white tracking-tight">
                {isTechnician ? "Technician's Dashboard" : (dashMode === 'my' ? 'My Dashboard' : 'RELDMS Dashboard')}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isTechnician
                  ? `${stats.total_requests} active test${stats.total_requests !== 1 ? 's' : ''} \u00b7 ${stats.delayed_requests} delayed \u00b7 ${stats.hold_count ?? 0} on hold`
                  : dashMode === 'my'
                    ? `${stats.total_requests} active \u00b7 ${stats.delayed_requests} delayed`
                    : 'Semiconductor Package & Test Services — Philippines Operations'}
              </p>
            </div>
          </div>
          {!isTechnician && (
            <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden text-xs font-medium self-center">
              <button
                onClick={() => { setSlideDir(-1); setDashMode('my'); }}
                className={`px-3 py-1.5 transition-colors ${
                  dashMode === 'my'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                My Dashboard
              </button>
              <button
                onClick={() => { setSlideDir(1); setDashMode('reldms'); }}
                className={`px-3 py-1.5 transition-colors ${
                  dashMode === 'reldms'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                RELDMS Dashboard
              </button>
            </div>
          )}
          <div className="text-right flex-shrink-0">
            <p className="text-2xl font-bold text-blue-600 dark:text-cyan-400 font-mono leading-none">
              {time} <span className="text-sm font-sans font-medium text-slate-500 dark:text-slate-400">PHT</span>
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{date}</p>
          </div>
        </div>
      </div>

      {/* Animated content — slides in on dashboard mode switch */}
      <div
        key={contentKey}
        className="space-y-6"
        style={contentKey > 0 ? { animation: `${slideDir > 0 ? 'dashSlideInRight' : 'dashSlideInLeft'} 0.45s cubic-bezier(0.16, 1, 0.3, 1) both` } : undefined}
      >

      {/* Workflow Pipeline — visible to all non-technician users */}
      {!isTechnician && <WorkflowPipeline stats={stats} onNavigate={navigate} />}

      {/* Backup Warning Banner */}
      {stats.backup_warning && (
        <div className={`rounded-xl border p-4 shadow-sm ${
          stats.backup_warning_level === 'critical' ? 'bg-red-50 dark:bg-red-900/25 border-red-300 dark:border-red-700' :
          stats.backup_warning_level === 'warning' ? 'bg-amber-50 dark:bg-amber-900/25 border-amber-300 dark:border-amber-700' :
          'bg-blue-50 dark:bg-blue-900/25 border-blue-300 dark:border-blue-700'
        }`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
          stats.backup_warning_level === 'critical' ? 'text-red-900 dark:text-red-300' :
              stats.backup_warning_level === 'warning' ? 'text-amber-900 dark:text-amber-300' :
              'text-blue-900 dark:text-blue-300'
            }`} />
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                stats.backup_warning_level === 'critical' ? 'text-red-900' :
                stats.backup_warning_level === 'warning' ? 'text-amber-900' :
                'text-blue-900'
              }`}>
                {stats.backup_warning}
              </p>
              {stats.backup_warning_level !== 'info' && (
                <button
                  onClick={() => navigate('/settings')}
                  className={`mt-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    stats.backup_warning_level === 'critical' ? 'bg-red-600 hover:bg-red-700 text-white' :
                    'bg-amber-600 hover:bg-amber-700 text-white'
                  }`}
                >
                  Go to Backup Settings
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Technician step-level stat cards (technician view only) */}
      {isTechnician && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button onClick={() => navigate('/requests')}
            className="group flex flex-col items-start gap-2 bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-700/50 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-orange-400 transition-all text-left">
            <div className="w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <PackageSearch className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white font-heading leading-none">{stats.incoming_inspection_count}</p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">Incoming Inspection</p>
            </div>
          </button>
          <button onClick={() => navigate('/requests')}
            className="group flex flex-col items-start gap-2 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700/50 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-blue-400 transition-all text-left">
            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white font-heading leading-none">{stats.visual_count}</p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">Visual</p>
            </div>
          </button>
          <button onClick={() => navigate('/requests')}
            className="group flex flex-col items-start gap-2 bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700/50 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-purple-400 transition-all text-left">
            <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Waves className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white font-heading leading-none">{stats.sat_count}</p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">SAT</p>
            </div>
          </button>
          <button onClick={() => navigate('/requests')}
            className="group flex flex-col items-start gap-2 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700/50 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-amber-400 transition-all text-left">
            <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Flame className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white font-heading leading-none">{stats.bake_count}</p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">Bake</p>
            </div>
          </button>
          <button onClick={() => navigate('/requests')}
            className="group flex flex-col items-start gap-2 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-700/50 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-red-400 transition-all text-left">
            <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Thermometer className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white font-heading leading-none">{stats.hts_count}</p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">HTS</p>
            </div>
          </button>
          <button onClick={() => navigate('/requests')}
            className="group flex flex-col items-start gap-2 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-700/50 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-rose-400 transition-all text-left">
            <div className="w-9 h-9 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
              <PauseCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white font-heading leading-none">{stats.hold_count}</p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">On Hold</p>
            </div>
          </button>
        </div>
      )}

      {/* ── TECHNICIAN LAYOUT ─────────────────────────────── */}
      {isTechnician ? (
        <>
          {/* Row: Step Progress (full-width) — tap or hover to expand */}
          <div
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm transition-all duration-300"
            onMouseEnter={e => { e.currentTarget.querySelector('[data-step-body]').style.display = ''; }}
            onMouseLeave={e => { e.currentTarget.querySelector('[data-step-body]').style.display = 'none'; }}
            onClick={e => {
              const body = e.currentTarget.querySelector('[data-step-body]');
              if (body) body.style.display = body.style.display === 'none' ? '' : 'none';
            }}
          >
            <div className="px-6 py-4 flex items-center gap-2 cursor-pointer select-none border-b border-slate-100 dark:border-slate-700">
              <ListChecks className="w-4 h-4 text-orange-500" />
              <h3 className="font-heading font-semibold text-slate-800 dark:text-slate-100">Process Step Progress</h3>
              <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">Active requests only — tap or hover to expand</span>
            </div>
            <div data-step-body style={{ display: 'none' }}>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {(!stats.step_progress || stats.step_progress.length === 0) ? (
                <p className="text-sm text-slate-400 py-4 text-center col-span-2">No process step data available</p>
              ) : (
                stats.step_progress.filter(step =>
                  step.step_name !== 'Segregate 22 units' && step.step_name !== 'Pack 22 units'
                ).map(step => {
                  const total = (step.pending || 0) + (step.in_progress || 0) + (step.completed || 0) + (step.hold || 0);
                  const pendingPct  = total > 0 ? (step.pending     / total) * 100 : 0;
                  const inProgPct   = total > 0 ? (step.in_progress / total) * 100 : 0;
                  const completePct = total > 0 ? (step.completed   / total) * 100 : 0;
                  const holdPct     = total > 0 ? (step.hold        / total) * 100 : 0;
                  const displayName = (step.step_name.includes('Prior') || step.step_name.includes('Post'))
                    ? `SAT (${step.step_name.includes('Prior') ? 'Prior' : 'Post'})`
                    : step.step_name;
                  return (
                    <button
                      key={step.step_name}
                      type="button"
                      onClick={() => navigate(`/requests?status=testing&step=${encodeURIComponent(step.step_name)}`)}
                      className="bg-slate-50 dark:bg-slate-700/50 rounded-lg px-4 py-3 text-left w-full hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:ring-1 hover:ring-blue-300 dark:hover:ring-blue-600 transition-all cursor-pointer">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{displayName}</span>
                        <div className="flex items-center gap-2.5 text-xs flex-wrap justify-end">
                          {step.in_progress > 0 && (
                            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                              <Activity className="w-3 h-3" />
                              <span className="font-semibold">{step.in_progress}</span>
                              <span className="text-blue-400 dark:text-blue-500">In Queue</span>
                            </span>
                          )}
                          {step.pending > 0 && (
                            <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                              <Hourglass className="w-3 h-3" />
                              <span className="font-semibold">{step.pending}</span>
                              <span className="text-slate-400 dark:text-slate-500">Pending</span>
                            </span>
                          )}
                          {step.hold > 0 && (
                            <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                              <PauseCircle className="w-3 h-3" />
                              <span className="font-semibold">{step.hold}</span>
                            </span>
                          )}
                          {step.completed > 0 && (
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" />
                              <span className="font-semibold">{step.completed}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden flex">
                        {completePct > 0 && <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${completePct}%` }} />}
                        {inProgPct   > 0 && <div className="h-full bg-blue-400 transition-all duration-700" style={{ width: `${inProgPct}%` }} />}
                        {holdPct     > 0 && <div className="h-full bg-orange-400 transition-all duration-700" style={{ width: `${holdPct}%` }} />}
                        {pendingPct  > 0 && <div className="h-full bg-slate-300 dark:bg-slate-500 transition-all duration-700" style={{ width: `${pendingPct}%` }} />}
                      </div>
                      {total > 0 && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 text-right">
                          {Math.round(completePct)}% done &middot; {total} total &middot; <span className="text-blue-400 dark:text-blue-500">click to view</span>
                        </p>
                      )}
                    </button>
                  );
                })
              )}
            </div>
            {/* Legend */}
            <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-4 text-xs text-slate-400 dark:text-slate-500">
              <span className="flex items-center gap-1.5 text-blue-500"><Activity className="w-3 h-3" /> In Queue</span>
              <span className="flex items-center gap-1.5"><Hourglass className="w-3 h-3" /> Pending</span>
              <span className="flex items-center gap-1.5 text-orange-500"><PauseCircle className="w-3 h-3" /> Hold</span>
              <span className="flex items-center gap-1.5 text-emerald-500"><CheckCircle2 className="w-3 h-3" /> Done</span>
            </div>
            </div>{/* end data-step-body */}
          </div>

          {/* Row: Delayed | On Hold | Upcoming Deadlines */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Delayed */}
            <div className="bg-white dark:bg-slate-800 border border-red-200 dark:border-red-700/50 rounded-xl shadow-sm flex flex-col">
              <div className="px-5 py-4 border-b border-red-100 dark:border-red-700/50 flex items-center justify-between">
                <h3 className="font-heading font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Delayed
                  {stats.delayed_requests > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white">{stats.delayed_requests}</span>
                  )}
                </h3>
                <Link to="/requests?status=delayed" className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1">
                  View All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-red-50 dark:divide-red-900/20 flex-1">
                {stats.delayed_requests_list.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-500">
                    <CheckCircle2 className="w-7 h-7 mb-2 text-emerald-400" />
                    <p className="text-sm">No delayed requests</p>
                  </div>
                ) : (
                  stats.delayed_requests_list.slice(0, 6).map(item => (
                    <Link key={item.id} to={`/requests/${item.id}`}
                      className="flex items-start justify-between px-5 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-base font-bold text-blue-700 dark:text-blue-400 tracking-tight">{item.request_number}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{item.device_name || '—'}</p>
                      </div>
                      <p className="text-xs text-red-600 dark:text-red-400 font-semibold flex-shrink-0 mt-0.5 whitespace-nowrap">Due: {item.deadline}</p>
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* On Hold */}
            <div className="bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-700/50 rounded-xl shadow-sm flex flex-col">
              <div className="px-5 py-4 border-b border-orange-100 dark:border-orange-700/50 flex items-center justify-between">
                <h3 className="font-heading font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm">
                  <PauseCircle className="w-4 h-4 text-orange-500" />
                  On Hold
                  {stats.hold_requests_list?.length > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-orange-500 text-white">{stats.hold_requests_list.length}</span>
                  )}
                </h3>
                <Link to="/requests" className="text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1">
                  View All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-orange-50 dark:divide-orange-900/20 flex-1">
                {(!stats.hold_requests_list || stats.hold_requests_list.length === 0) ? (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-500">
                    <CheckCircle2 className="w-7 h-7 mb-2 text-emerald-400" />
                    <p className="text-sm">No requests on hold</p>
                  </div>
                ) : (
                  stats.hold_requests_list.slice(0, 6).map(item => (
                    <Link key={item.id} to={`/requests/${item.id}`}
                      className="flex items-start justify-between px-5 py-3 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-base font-bold text-blue-700 dark:text-blue-400 tracking-tight">{item.request_number}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{item.device_name || '—'}</p>
                        {item.hold_steps && (
                          <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5 truncate">
                            <PauseCircle className="w-3 h-3 inline mr-0.5" />{item.hold_steps}
                          </p>
                        )}
                      </div>
                      {item.deadline && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0 mt-0.5 whitespace-nowrap">Due: {item.deadline}</p>
                      )}
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* Upcoming Deadlines */}
            <div className="bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-700/50 rounded-xl shadow-sm flex flex-col">
              <div className="px-5 py-4 border-b border-violet-100 dark:border-violet-700/50 flex items-center justify-between">
                <h3 className="font-heading font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm">
                  <Timer className="w-4 h-4 text-violet-500" />
                  Upcoming Deadlines
                  {stats.upcoming_deadline_requests > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-violet-500 text-white">{stats.upcoming_deadline_requests}</span>
                  )}
                </h3>
                <Link to="/requests?status=upcoming" className="text-xs text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1">
                  View All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-violet-50 dark:divide-violet-900/20 flex-1">
                {(!stats.upcoming_deadline_list || stats.upcoming_deadline_list.length === 0) ? (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-500">
                    <Calendar className="w-7 h-7 mb-2 text-slate-300" />
                    <p className="text-sm">No upcoming deadlines</p>
                  </div>
                ) : (
                  stats.upcoming_deadline_list.slice(0, 6).map(item => (
                    <Link key={item.id} to={`/requests/${item.id}`}
                      className="flex items-start justify-between px-5 py-3 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-base font-bold text-blue-700 dark:text-blue-400 tracking-tight">{item.request_number}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{item.device_name || '—'}</p>
                      </div>
                      <p className="text-xs text-violet-600 dark:text-violet-400 font-semibold flex-shrink-0 mt-0.5 whitespace-nowrap">Due: {item.deadline}</p>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Row: Recent Activity + Notices Board */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <h3 className="font-heading font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm">
                  <ClipboardList className="w-4 h-4 text-slate-400" />
                  Recent Activity
                </h3>
                <Link to="/requests" className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium flex items-center gap-1">
                  View All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {stats.recent_activity.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-slate-400">No recent activity</p>
                ) : (
                  stats.recent_activity.slice(0, 8).map(item => (
                    <Link key={item.id} to={`/requests/${item.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <div className="min-w-0">
                        <p className="font-mono text-base font-bold text-blue-700 dark:text-blue-400 tracking-tight">{item.request_number}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{item.device_name || item.customer || '—'}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge status={item.status} />
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* Notices Board */}
            <div className="bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-700/40 rounded-xl shadow-sm flex flex-col">
              <div className="px-5 py-4 border-b border-amber-200 dark:border-amber-700/40 flex items-center justify-between">
                <h3 className="font-heading font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-2 text-sm">
                  <MessageSquarePlus className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Notices Board
                  {stats.noticed_requests_list?.length > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">
                      {stats.noticed_requests_list.length}
                    </span>
                  )}
                </h3>
                <Link to="/requests" className="text-xs text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300 font-medium flex items-center gap-1">
                  View All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-amber-100 dark:divide-amber-800/30 flex-1 overflow-y-auto max-h-80">
                {!stats.noticed_requests_list || stats.noticed_requests_list.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-amber-400">No active notices</p>
                ) : (
                  stats.noticed_requests_list.map(item => (
                    <Link key={item.id} to={`/requests/${item.id}`}
                      className="flex items-start justify-between px-5 py-3 hover:bg-amber-100/60 dark:hover:bg-amber-800/20 transition-colors gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-base font-bold text-blue-700 dark:text-blue-400 tracking-tight">{item.request_number}</p>
                        <p className="text-xs text-amber-600/70 dark:text-amber-400/70 truncate mb-1">{item.device_name || item.customer || ''}</p>
                        <div className="flex items-start gap-1">
                          <MessageSquarePlus className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                          <span className="text-xs text-amber-800 dark:text-amber-300/80 line-clamp-2">{item.note}</span>
                        </div>
                      </div>
                      {item.deadline && (
                        <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold flex-shrink-0 mt-0.5 whitespace-nowrap">Due: {item.deadline}</p>
                      )}
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* ── ADMIN / PLANNER LAYOUT ────────────────────────── */}

          {/* Quick Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              icon={ClipboardList}
              label="Active Requests"
              value={stats.total_requests}
              color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
              subtext="Currently in pipeline"
              onClick={() => navigate('/requests')}
            />
            <StatCard
              icon={Activity}
              label="In Testing"
              value={stats.testing_requests}
              color="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
              subtext="Undergoing reliability tests"
              onClick={() => navigate('/requests?status=testing')}
            />
            <StatCard
              icon={AlertTriangle}
              label="Delayed"
              value={stats.delayed_requests}
              color={stats.delayed_requests > 0 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'}
              accent={stats.delayed_requests > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/50' : undefined}
              subtext="Past deadline"
              onClick={stats.delayed_requests > 0 ? () => navigate('/requests?status=delayed') : undefined}
            />
            <StatCard
              icon={CheckCircle2}
              label="Completed"
              value={stats.completed_requests}
              color="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
              subtext="All-time completed"
              onClick={() => navigate('/completed')}
            />
          </div>

          {/* Chart + Upcoming Deadlines */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <h3 className="font-heading font-semibold text-slate-800 dark:text-slate-100">Status Distribution</h3>
              </div>
              <div className="p-6">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData} barSize={48} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#f1f5f9'} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? '#1e293b' : '#f8fafc' }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-4 mt-4 justify-center">
                  {chartData.map(item => (
                    <div key={item.name} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                      {item.name}: <span className="font-semibold text-slate-700 dark:text-slate-200">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gradient-to-br from-violet-50 to-white dark:from-violet-900/20 dark:to-slate-800 border border-violet-200 dark:border-violet-700/50 rounded-xl p-5 shadow-sm cursor-pointer hover:shadow-md transition-all"
                onClick={() => navigate('/requests?status=upcoming')}>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  <span className="text-sm font-medium text-violet-700 dark:text-violet-300">Upcoming Deadlines</span>
                </div>
                <p className="text-3xl font-bold text-violet-900 dark:text-violet-200 font-heading">{stats.upcoming_deadline_requests}</p>
                <p className="text-xs text-violet-500 dark:text-violet-400 mt-1">Due within 3 days — click to view all</p>
              </div>

              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Completion Rate</p>
                {(() => {
                  const total = stats.total_requests + stats.completed_requests;
                  const pct = total > 0 ? Math.round((stats.completed_requests / total) * 100) : 0;
                  const donutData = [{ value: pct }, { value: 100 - pct }];
                  return (
                    <>
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <PieChart width={80} height={80}>
                            <Pie data={donutData} cx={35} cy={35} innerRadius={26} outerRadius={36}
                              startAngle={90} endAngle={-270} dataKey="value" strokeWidth={0}>
                              <Cell fill="#10b981" />
                              <Cell fill={isDark ? '#334155' : '#f1f5f9'} />
                            </Pie>
                          </PieChart>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">{pct}%</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-slate-900 dark:text-white font-heading">{pct}%</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">{stats.completed_requests} of {total} completed</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Last 30 days</p>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mt-3">
                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="group bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-700/40 rounded-xl shadow-sm overflow-hidden transition-shadow duration-300 hover:shadow-md">
                <div className="px-4 py-3 border-b border-amber-200 dark:border-amber-700/40 flex items-center justify-between">
                  <h3 className="font-heading font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-2 text-sm">
                    <MessageSquarePlus className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    Notices Board
                    {stats.noticed_requests_list?.length > 0 && (
                      <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-600 text-white">
                        {stats.noticed_requests_list.length}
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-amber-400 italic group-hover:opacity-0 transition-opacity duration-200 select-none hidden sm:inline">hover to expand</span>
                    <Link to="/requests" className="text-xs text-amber-700 hover:text-amber-900 font-medium flex items-center gap-1">
                      View All <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
                <div className="divide-y divide-amber-100 max-h-[88px] group-hover:max-h-[480px] focus-within:max-h-[480px] overflow-y-auto transition-[max-height] duration-300 ease-in-out"
                  tabIndex={0} role="region" aria-label="Notices list">
                  {!stats.noticed_requests_list || stats.noticed_requests_list.length === 0 ? (
                    <p className="px-4 py-4 text-sm text-amber-400">No active notices</p>
                  ) : (
                    stats.noticed_requests_list.map(item => (
                      <Link key={item.id} to={`/requests/${item.id}`}
                        className="flex items-start justify-between px-4 py-2.5 hover:bg-amber-100/60 dark:hover:bg-amber-800/20 transition-colors gap-2">
                        <div className="min-w-0">
                          <p className="font-mono text-sm font-bold text-blue-700 dark:text-blue-400 tracking-tight">{item.request_number}</p>
                          <p className="text-xs text-amber-600/70 dark:text-amber-400/70 truncate">{item.device_name || item.customer || ''}</p>
                          <div className="mt-0.5 flex items-start gap-1">
                            <MessageSquarePlus className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                            <span className="text-xs text-amber-800 dark:text-amber-300/80">{item.note}</span>
                          </div>
                        </div>
                        {item.deadline && (
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium flex-shrink-0 mt-0.5">Due: {item.deadline}</p>
                        )}
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Delayed + Upcoming + Recent */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-800 border border-red-200 dark:border-red-700/50 rounded-xl shadow-sm">
              <div className="px-6 py-4 border-b border-red-100 dark:border-red-700/50 flex items-center justify-between">
                <h3 className="font-heading font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Delayed Requests
                  {stats.delayed_requests > 0 && (
                    <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">{stats.delayed_requests}</span>
                  )}
                </h3>
                <Link to="/requests?status=delayed" className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1">
                  View All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {stats.delayed_requests_list.length === 0 ? (
                  <p className="px-6 py-4 text-sm text-slate-400">No delayed requests</p>
                ) : (
                  stats.delayed_requests_list.slice(0, 6).map(item => (
                    <Link key={item.id} to={`/requests/${item.id}`}
                      className="flex items-center justify-between px-6 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <div className="min-w-0">
                        <p className="font-mono text-base font-bold text-blue-700 dark:text-blue-400 tracking-tight">{item.request_number}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{item.device_name || '—'}</p>
                        {item.note && (
                          <div className="mt-1 flex items-start gap-1">
                            <MessageSquarePlus className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                            <span className="text-xs text-amber-700 line-clamp-1">{item.note}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-red-600 font-medium flex-shrink-0">Deadline: {item.deadline}</p>
                    </Link>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-700/50 rounded-xl shadow-sm">
              <div className="px-6 py-4 border-b border-violet-100 dark:border-violet-700/50 flex items-center justify-between">
                <h3 className="font-heading font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-violet-500" />
                  Upcoming Deadline Requests
                  {stats.upcoming_deadline_requests > 0 && (
                    <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700">{stats.upcoming_deadline_requests}</span>
                  )}
                </h3>
                <Link to="/requests?status=upcoming" className="text-xs text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1">
                  View All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {(!stats.upcoming_deadline_list || stats.upcoming_deadline_list.length === 0) ? (
                  <p className="px-6 py-4 text-sm text-slate-400">No upcoming deadlines</p>
                ) : (
                  stats.upcoming_deadline_list.slice(0, 6).map(item => (
                    <Link key={item.id} to={`/requests/${item.id}`}
                      className="flex items-center justify-between px-6 py-3 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors">
                      <div className="min-w-0">
                        <p className="font-mono text-base font-bold text-blue-700 dark:text-blue-400 tracking-tight">{item.request_number}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{item.device_name || '—'}</p>
                        {item.note && (
                          <div className="mt-1 flex items-start gap-1">
                            <MessageSquarePlus className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                            <span className="text-xs text-amber-700 line-clamp-1">{item.note}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-violet-600 font-medium flex-shrink-0">Due: {item.deadline}</p>
                    </Link>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <h3 className="font-heading font-semibold text-slate-800 dark:text-slate-100">Recent Activity</h3>
                <Link to="/requests" className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium flex items-center gap-1">
                  View All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {stats.recent_activity.length === 0 ? (
                  <p className="px-6 py-4 text-sm text-slate-400">No recent activity</p>
                ) : (
                  stats.recent_activity.slice(0, 6).map(item => (
                    <Link key={item.id} to={`/requests/${item.id}`}
                      className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <div className="min-w-0">
                        <p className="font-mono text-base font-bold text-blue-700 dark:text-blue-400 tracking-tight">{item.request_number}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{item.device_name || item.customer || '—'}</p>
                        {item.note && (
                          <div className="mt-1 flex items-start gap-1">
                            <MessageSquarePlus className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                            <span className="text-xs text-amber-700 line-clamp-1">{item.note}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <StatusBadge status={item.status} />
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      </div>{/* end animated content wrapper */}
    </div>
    </>
  );
}

