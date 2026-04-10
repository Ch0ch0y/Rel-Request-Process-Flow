import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import {
  PackageOpen, RefreshCw, Bell, BellRing, Clock, CheckCircle2,
  AlertTriangle, ChevronRight, Loader2, Search, X, Filter,
  Activity, Thermometer, Waves, Flame, Wind, Droplets, Box, Download, History,
  CalendarClock,
} from 'lucide-react';

// ── Constants ──────────────────────────────────────────────────────────────
const STEP_DISPLAY = {
  'reliability test':               { label: 'Reliability Test', color: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-700', icon: Activity },
  't&h soak':                        { label: 'T&H Soak',         color: 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-700', icon: Waves },
  'forced convection reflow (fcr)':  { label: 'FCR',              color: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700', icon: Flame },
  'preconditioning (precon)':        { label: 'Precon',           color: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700', icon: Wind },
  'temperature cycle':               { label: 'Temp Cycle',       color: 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-700', icon: Thermometer },
  'moisture resistance test':        { label: 'MRT',              color: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-700', icon: Droplets },
  'bake':                            { label: 'Bake',             color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700', icon: Flame },
  'dry bake':                        { label: 'Dry Bake',         color: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700', icon: Flame },
};

const ALL_STEPS = Object.keys(STEP_DISPLAY);

const TABS = [
  { key: 'all',         label: 'All' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed',   label: 'Completed' },
  { key: 'scheduled',   label: 'Scheduled' },
];

// Upcoming = end within 48 h; Overdue = started and end already passed and status still in_progress
function classifyStep(step) {
  if (step.status !== 'in_progress') return null;
  if (!step.completed_at) return null;
  const end = new Date(step.completed_at);
  const now = new Date();
  const diffH = (end - now) / 3_600_000;
  if (diffH < 0) return 'overdue';
  if (diffH <= 48) return 'upcoming';
  return null;
}

function formatDT(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function diffLabel(iso) {
  if (!iso) return null;
  const diff = (new Date(iso) - new Date()) / 3_600_000;
  if (diff < 0) return `${Math.abs(Math.round(diff))}h overdue`;
  if (diff < 24) return `in ${Math.round(diff)}h`;
  return `in ${Math.round(diff / 24)}d`;
}

// ── Sub-components ─────────────────────────────────────────────────────────
function StepBadge({ stepName }) {
  const info = STEP_DISPLAY[stepName?.toLowerCase()] || { label: stepName || '—', color: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600', icon: Box };
  const Icon = info.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${info.color}`}>
      <Icon className="w-3 h-3" />
      {info.label}
    </span>
  );
}

function StatusBadge({ status }) {
  if (status === 'in_progress') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
      In Progress
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
      <CheckCircle2 className="w-3 h-3" />
      Completed
    </span>
  );
}

function AlertBadge({ classification }) {
  if (!classification) return null;
  if (classification === 'overdue') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700">
      <AlertTriangle className="w-3 h-3" />
      Overdue
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
      <Clock className="w-3 h-3" />
      Due Soon
    </span>
  );
}

function ScheduledBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700">
      <CalendarClock className="w-3 h-3" />
      Scheduled
    </span>
  );
}

function SummaryCard({ label, value, color, icon: Icon, sub }) {
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
          <p className="text-3xl font-bold mt-0.5">{value}</p>
          {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
        </div>
        <div className="opacity-30">
          <Icon className="w-10 h-10" />
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function LoadingUnloading() {
  const [rows, setRows]                   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [tab, setTab]                     = useState('all');
  const [search, setSearch]               = useState('');
  const [stepFilter, setStepFilter]       = useState('all');
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [lastRefresh, setLastRefresh]     = useState(null);
  const [exporting, setExporting]         = useState(false);
  const [viewMode, setViewMode]           = useState('active'); // 'active' | 'history'
  const [historyRows, setHistoryRows]     = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [machineSearch, setMachineSearch] = useState('');
  const [scheduledRows, setScheduledRows]   = useState([]);
  const [scheduledLoading, setScheduledLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getLoadingUnloading();
      setRows(data);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const id = setInterval(load, 120_000);
    return () => clearInterval(id);
  }, [load]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await api.exportLoadingUnloading(stepFilter);
    } catch (e) {
      setError(e.message);
    } finally {
      setExporting(false);
    }
  };

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const params = {};
      if (machineSearch) params.machine = machineSearch;
      const data = await api.getLoadingUnloadingHistory(params);
      setHistoryRows(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setHistoryLoading(false);
    }
  }, [machineSearch]);

  useEffect(() => {
    if (viewMode === 'history') loadHistory();
  }, [viewMode, loadHistory]);

  const loadScheduled = useCallback(async () => {
    setScheduledLoading(true);
    try {
      const data = await api.getLoadingUnloadingScheduled();
      setScheduledRows(Array.isArray(data) ? data : []);
    } catch {
      // silently fail
    } finally {
      setScheduledLoading(false);
    }
  }, []);

  useEffect(() => { loadScheduled(); }, [loadScheduled]);
  useEffect(() => {
    const id2 = setInterval(loadScheduled, 120_000);
    return () => clearInterval(id2);
  }, [loadScheduled]);

  // ── Derived data ──────────────────────────────────────────────────────
  const enriched = rows.map(r => ({ ...r, alert: classifyStep(r) }));

  const alerts = enriched.filter(r => r.alert);
  const overdueCount  = alerts.filter(r => r.alert === 'overdue').length;
  const upcomingCount = alerts.filter(r => r.alert === 'upcoming').length;
  const activeCount   = enriched.filter(r => r.status === 'in_progress').length;
  const doneCount     = enriched.filter(r => r.status === 'completed').length;

  const scheduledCount = scheduledRows.length;

  const filteredScheduled = scheduledRows.filter(r => {
    if (stepFilter !== 'all' && r.step_name?.toLowerCase() !== stepFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (r.request_number || '').toLowerCase().includes(q) ||
        (r.device_name    || '').toLowerCase().includes(q) ||
        (r.customer       || '').toLowerCase().includes(q) ||
        (r.lot_no         || '').toLowerCase().includes(q) ||
        (r.step_name      || '').toLowerCase().includes(q) ||
        (r.test_item      || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filtered = enriched.filter(r => {
    if (tab !== 'all' && r.status !== tab) return false;
    if (stepFilter !== 'all' && r.step_name?.toLowerCase() !== stepFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (r.request_number || '').toLowerCase().includes(q) ||
        (r.device_name    || '').toLowerCase().includes(q) ||
        (r.customer       || '').toLowerCase().includes(q) ||
        (r.lot_no         || '').toLowerCase().includes(q) ||
        (r.step_name      || '').toLowerCase().includes(q) ||
        (r.test_item      || '').toLowerCase().includes(q) ||
        (r.machine_no     || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
            <PackageOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Loading / Unloading Monitor</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Track active test processes · machines · timelines
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Notification bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifPanel(p => !p)}
              className={`relative p-2 rounded-lg border transition-colors ${
                alerts.length > 0
                  ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
              title="Notifications"
            >
              {alerts.length > 0 ? <BellRing className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
              {alerts.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                  {alerts.length}
                </span>
              )}
            </button>

            {/* Notification dropdown */}
            {showNotifPanel && (
              <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <BellRing className="w-4 h-4 text-amber-500" />
                    End-of-Process Alerts
                  </p>
                  <button onClick={() => setShowNotifPanel(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {alerts.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">No alerts right now.</div>
                ) : (
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                    {alerts.map(r => (
                      <Link
                        key={r.id}
                        to={`/requests/${r.request_id}`}
                        onClick={() => setShowNotifPanel(false)}
                        className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                          r.alert === 'overdue' ? 'bg-red-50/60 dark:bg-red-900/10' : 'bg-amber-50/60 dark:bg-amber-900/10'
                        }`}
                      >
                        <div className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                          r.alert === 'overdue' ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
                        }`}>
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {r.request_number} — {r.device_name || '—'}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {STEP_DISPLAY[r.step_name?.toLowerCase()]?.label || r.step_name}
                            {r.machine_no ? ` · ${r.machine_no}` : ''}
                          </p>
                          <p className={`text-xs font-medium mt-0.5 ${r.alert === 'overdue' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            End: {formatDT(r.completed_at)} ({diffLabel(r.completed_at)})
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-2" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Export */}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors disabled:opacity-50 shadow-sm"
          >
            <Download className={`w-3.5 h-3.5 ${exporting ? 'animate-bounce' : ''}`} />
            {exporting ? 'Exporting...' : 'Export Excel'}
          </button>

          {/* History toggle */}
          <button
            onClick={() => setViewMode(v => v === 'active' ? 'history' : 'active')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
              viewMode === 'history'
                ? 'bg-blue-600 text-white border-blue-700'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            {viewMode === 'history' ? 'Active View' : 'History'}
          </button>

          {/* Refresh */}
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {lastRefresh && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:block">
              Updated {lastRefresh.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: true })}
            </span>
          )}
        </div>
      </div>

      {/* ── Alert Banner ── */}
      {(overdueCount > 0 || upcomingCount > 0) && (
        <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${
          overdueCount > 0
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
            : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
        }`}>
          <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${overdueCount > 0 ? 'text-red-500' : 'text-amber-500'}`} />
          <div className="text-sm">
            {overdueCount > 0 && (
              <p className="font-semibold">
                {overdueCount} step{overdueCount > 1 ? 's' : ''} overdue — end-of-process date has passed for in-progress items.
              </p>
            )}
            {upcomingCount > 0 && (
              <p className={overdueCount > 0 ? 'mt-0.5 font-normal opacity-80' : 'font-semibold'}>
                {upcomingCount} step{upcomingCount > 1 ? 's' : ''} ending within 48 hours.
              </p>
            )}
            <button
              onClick={() => setShowNotifPanel(true)}
              className="mt-1 text-xs underline underline-offset-2 opacity-80 hover:opacity-100"
            >
              View details →
            </button>
          </div>
        </div>
      )}

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <SummaryCard
          label="Active"
          value={activeCount}
          sub="in progress now"
          icon={Activity}
          color="bg-blue-600 text-white border-blue-700 shadow-md shadow-blue-600/20"
        />
        <SummaryCard
          label="Overdue"
          value={overdueCount}
          sub="past end date"
          icon={AlertTriangle}
          color={overdueCount > 0 ? 'bg-red-600 text-white border-red-700 shadow-md shadow-red-600/20' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}
        />
        <SummaryCard
          label="Due Soon"
          value={upcomingCount}
          sub="within 48 hours"
          icon={Clock}
          color={upcomingCount > 0 ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}
        />
        <SummaryCard
          label="Completed"
          value={doneCount}
          sub="finished steps"
          icon={CheckCircle2}
          color="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
        />
        <SummaryCard
          label="Scheduled"
          value={scheduledCount}
          sub="pending steps"
          icon={CalendarClock}
          color={scheduledCount > 0 ? 'bg-purple-600 text-white border-purple-700 shadow-md shadow-purple-600/20' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}
        />
      </div>

      {/* ── Filters ── */}
      {viewMode === 'history' ? (
        /* ── History View ── */
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Loading / Unloading History</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={machineSearch}
                  onChange={e => setMachineSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && loadHistory()}
                  placeholder="Search by machine…"
                  className="pl-7 pr-7 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 w-full sm:w-52"
                />
                {machineSearch && (
                  <button onClick={() => { setMachineSearch(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button onClick={loadHistory} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
                Search
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            {historyLoading ? (
              <div className="flex items-center justify-center py-20 gap-2 text-slate-400 dark:text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading history…</span>
              </div>
            ) : historyRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
                <History className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">No history records found</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Request #</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Device / Customer</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Step</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Machine</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Rack</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Employee</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Start</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">End</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {historyRows.map(r => (
                    <tr key={r.id} className="group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link to={`/requests/${r.request_id}`} className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                          {r.request_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800 dark:text-slate-200 max-w-[160px] truncate">{r.device_name || '—'}</p>
                        {r.customer && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[160px]">{r.customer}</p>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap"><StepBadge stepName={r.step_name} /></td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.machine_no ? (
                          <div>
                            <span className="text-xs font-mono bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded">{r.machine_no}</span>
                            {r.machine_desc && <p className="text-[11px] text-slate-400 mt-0.5">{r.machine_desc}</p>}
                          </div>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600 dark:text-slate-400">{r.rack_no || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-700 dark:text-slate-300">{r.employee_name || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600 dark:text-slate-400">{formatDT(r.started_at)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600 dark:text-slate-400">{formatDT(r.completed_at)}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link to={`/requests/${r.request_id}`} className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline transition-opacity">
                          View <ChevronRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {!historyLoading && historyRows.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30">
              <p className="text-xs text-slate-400 dark:text-slate-500">{historyRows.length} record{historyRows.length !== 1 ? 's' : ''}</p>
            </div>
          )}
        </div>
      ) : (
      /* ── Active View (Filters) ── */
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Tab bar + search row */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-3 pb-0">
          <div className="flex gap-1">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  tab === t.key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 pb-3">
            {/* Step type filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Filter className="w-3.5 h-3.5" />
              <select
                value={stepFilter}
                onChange={e => setStepFilter(e.target.value)}
                className="border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Step Types</option>
                {ALL_STEPS.map(s => (
                  <option key={s} value={s}>{STEP_DISPLAY[s].label}</option>
                ))}
              </select>
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search request, device…"
                className="pl-7 pr-7 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 w-full sm:w-52"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          {tab === 'scheduled' ? (
            scheduledLoading ? (
              <div className="flex items-center justify-center py-20 gap-2 text-slate-400 dark:text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading scheduled steps…</span>
              </div>
            ) : filteredScheduled.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
                <CalendarClock className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">No scheduled stress test steps found</p>
                <p className="text-xs mt-1 opacity-70">Pending steps from active RELDMS requests will appear here</p>
                {(search || stepFilter !== 'all') && (
                  <button onClick={() => { setSearch(''); setStepFilter('all'); }} className="mt-2 text-xs text-blue-500 hover:underline">Clear filters</button>
                )}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Request #</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Device / Customer</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Leg</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Step</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Test Item / Condition</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Request Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredScheduled.map(r => (
                    <tr key={`${r.request_id}_s${r.step_number}_l${r.leg}`} className="group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link to={`/requests/${r.request_id}`} className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">{r.request_number}</Link>
                        {r.lot_no && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{r.lot_no}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800 dark:text-slate-200 max-w-[160px] truncate" title={r.device_name}>{r.device_name || '—'}</p>
                        {r.customer && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[160px]">{r.customer}</p>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600 dark:text-slate-400">Leg {r.leg || 1}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><StepBadge stepName={r.step_name} /></td>
                      <td className="px-4 py-3">
                        {r.test_item && <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{r.test_item}</p>}
                        {r.test_condition && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 max-w-[180px] truncate" title={r.test_condition}>{r.test_condition}</p>}
                        {!r.test_item && !r.test_condition && <span className="text-slate-400 dark:text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                          r.req_status === 'testing'  ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700' :
                          r.req_status === 'approval' ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-700' :
                          r.req_status === 'review'   ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700' :
                          'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                        }`}>
                          {r.req_status ? r.req_status.charAt(0).toUpperCase() + r.req_status.slice(1) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap"><ScheduledBadge /></td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link to={`/requests/${r.request_id}`} className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline transition-opacity">
                          View <ChevronRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : loading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-slate-400 dark:text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20 gap-2 text-red-500">
              <AlertTriangle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
              <PackageOpen className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No records found</p>
              {(search || stepFilter !== 'all') && (
                <button onClick={() => { setSearch(''); setStepFilter('all'); }} className="mt-2 text-xs text-blue-500 hover:underline">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Request #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Device / Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Step</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Test Item / Condition</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Machine</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Employee</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Start of Process</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">End of Process</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filtered.map(r => (
                  <tr
                    key={r.id}
                    className={`group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${
                      r.alert === 'overdue' ? 'bg-red-50/40 dark:bg-red-900/10 hover:bg-red-50/70 dark:hover:bg-red-900/20' :
                      r.alert === 'upcoming' ? 'bg-amber-50/40 dark:bg-amber-900/10 hover:bg-amber-50/70 dark:hover:bg-amber-900/20' : ''
                    }`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link
                        to={`/requests/${r.request_id}`}
                        className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {r.request_number}
                      </Link>
                      {r.lot_no && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{r.lot_no}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 dark:text-slate-200 max-w-[160px] truncate" title={r.device_name}>{r.device_name || '—'}</p>
                      {r.customer && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[160px]">{r.customer}</p>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StepBadge stepName={r.step_name} />
                      {r.leg > 1 && <span className="ml-1 text-[10px] text-slate-400 dark:text-slate-500">Leg {r.leg}</span>}
                    </td>
                    <td className="px-4 py-3">
                      {r.test_item && <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{r.test_item}</p>}
                      {r.test_condition && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 max-w-[160px] truncate" title={r.test_condition}>{r.test_condition}</p>}
                      {!r.test_item && !r.test_condition && <span className="text-slate-400 dark:text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {r.machine_no
                        ? <div>
                            <span className="text-xs font-mono bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded">{r.machine_no}</span>
                            {r.machine_desc && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[140px]" title={r.machine_desc}>{r.machine_desc}</p>}
                            {r.rack_no && <p className="text-[11px] text-blue-500 dark:text-blue-400 mt-0.5">Rack: {r.rack_no}</p>}
                          </div>
                        : <span className="text-slate-400 dark:text-slate-600">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {r.employee_name
                        ? <span className="text-xs text-slate-700 dark:text-slate-300">{r.employee_name}</span>
                        : <span className="text-slate-400 dark:text-slate-600">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600 dark:text-slate-400">
                      {formatDT(r.started_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {r.completed_at ? (
                        <div>
                          <p className="text-xs text-slate-600 dark:text-slate-400">{formatDT(r.completed_at)}</p>
                          {r.alert && (
                            <p className={`text-[11px] font-semibold mt-0.5 ${r.alert === 'overdue' ? 'text-red-500' : 'text-amber-500'}`}>
                              {diffLabel(r.completed_at)}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600 text-xs italic">Not set</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={r.status} />
                        {r.alert && <AlertBadge classification={r.alert} />}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link
                        to={`/requests/${r.request_id}`}
                        className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline transition-opacity"
                      >
                        View <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer row count */}
        {tab === 'scheduled' ? (
          !scheduledLoading && filteredScheduled.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {filteredScheduled.length} scheduled step{filteredScheduled.length !== 1 ? 's' : ''}
                {scheduledRows.length > filteredScheduled.length && ` (filtered from ${scheduledRows.length})`}
              </p>
            </div>
          )
        ) : (
          !loading && filtered.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {filtered.length} record{filtered.length !== 1 ? 's' : ''}
                {(search || stepFilter !== 'all' || tab !== 'all') && ` (filtered from ${enriched.length})`}
              </p>
            </div>
          )
        )}
      </div>
      )}
    </div>
  );
}
