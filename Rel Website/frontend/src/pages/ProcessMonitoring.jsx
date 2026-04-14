import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import {
  Activity, RefreshCw, Loader2, Search, X,
  CheckCircle2, Clock, AlertTriangle, Play, Square, User,
  Layers, CalendarDays, Tag, ClipboardCheck,
  Eye, Users, Zap, ListChecks,
  ChevronDown, ChevronUp, Building2, FlaskConical,
  TableProperties, Filter, Flame,
} from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────────────────
const REQUEST_STATUS_MAP = {
  incoming:     { label: 'Incoming',    color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700' },
  pending:      { label: 'Pending',     color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700' },
  review:       { label: 'Review',      color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700' },
  approval:     { label: 'Approval',    color: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-700' },
  testing:      { label: 'Testing',     color: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700' },
  in_progress:  { label: 'Testing',     color: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700' },
  analysis:     { label: 'Analysis',    color: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-700' },
};

const STEP_STATUS_CONFIG = {
  pending:     { label: 'Pending',     icon: Clock,        color: 'text-slate-500 dark:text-slate-400',  bg: 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700',    dot: 'bg-slate-400' },
  in_progress: { label: 'In Progress', icon: Activity,     color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700',        dot: 'bg-blue-500 animate-pulse' },
  completed:   { label: 'Completed',   icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700', dot: 'bg-emerald-500' },
};

const STEP_COLORS = {
  'incoming inspection':         'from-slate-500 to-slate-600',
  'visual':                      'from-sky-500 to-sky-600',
  'serialize samples':           'from-violet-500 to-violet-600',
  'o/s':                         'from-orange-500 to-orange-600',
  'sat':                         'from-teal-500 to-teal-600',
  'bake':                        'from-amber-500 to-amber-600',
  'dry bake':                    'from-yellow-500 to-yellow-600',
  't & h soak':                  'from-cyan-500 to-cyan-600',
  'reflow':                      'from-red-500 to-red-600',
  'preconditioning (precon)':    'from-pink-500 to-pink-600',
  'forced convection reflow (fcr)': 'from-rose-500 to-rose-600',
  'moisture resistance test':    'from-blue-500 to-blue-600',
  'temperature cycle':           'from-indigo-500 to-indigo-600',
  'reliability test':            'from-purple-500 to-purple-600',
};

function getStepGradient(name) {
  return STEP_COLORS[(name || '').toLowerCase()] || 'from-slate-500 to-slate-600';
}

// ── Utility helpers ───────────────────────────────────────────────────────────
function formatDT(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function formatDateOnly(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function elapsed(startIso) {
  if (!startIso) return null;
  const ms = Date.now() - new Date(startIso).getTime();
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 48) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function RequestStatusBadge({ status }) {
  const cfg = REQUEST_STATUS_MAP[status] || REQUEST_STATUS_MAP.incoming;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function StepStatusPill({ status }) {
  const cfg = STEP_STATUS_CONFIG[status] || STEP_STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function SummaryCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className={`rounded-xl border p-4 shadow-sm flex items-center gap-4 ${color}`}>
      <div className="opacity-20 flex-shrink-0">
        <Icon className="w-10 h-10" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-60 truncate">{label}</p>
        <p className="text-3xl font-bold leading-tight">{value}</p>
        {sub && <p className="text-xs opacity-50 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Assign Employee Popover ───────────────────────────────────────────────────
function AssignPopover({ employees, currentId, onAssign, onClose }) {
  const [q, setQ] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const filtered = employees.filter(e =>
    !q || e.name.toLowerCase().includes(q.toLowerCase()) ||
    (e.position || '').toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div ref={ref} className="absolute z-50 right-0 top-full mt-1 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-xl overflow-hidden">
      <div className="p-2 border-b border-slate-100 dark:border-slate-700">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search employee…"
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:text-white"
          />
        </div>
      </div>
      <div className="max-h-48 overflow-y-auto">
        <button
          onClick={() => onAssign(null)}
          className="w-full text-left px-3 py-2 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
        >
          <X className="w-3.5 h-3.5" /> Unassign
        </button>
        {filtered.map(e => (
          <button
            key={e.id}
            onClick={() => onAssign(e.id)}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center gap-2 transition-colors
              ${e.id === currentId ? 'bg-blue-50 dark:bg-blue-900/30 font-semibold text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'}`}
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {e.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate font-medium">{e.name}</div>
              {e.position && <div className="truncate text-xs opacity-50">{e.position}</div>}
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="px-3 py-4 text-sm text-slate-400 text-center">No employees found</div>
        )}
      </div>
    </div>
  );
}

// ── Step Card ─────────────────────────────────────────────────────────────────
// ── Main Component ────────────────────────────────────────────────────────────
export default function ProcessMonitoring() {
  const [requests, setRequests]         = useState([]);
  const [employees, setEmployees]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [updatingKey, setUpdatingKey]   = useState(null);
  const [autoRefresh, setAutoRefresh]   = useState(true);
  const [lastRefresh, setLastRefresh]   = useState(null);
  const [updateError, setUpdateError]   = useState('');

  // New table-view state
  const [stepFilter, setStepFilter]         = useState('all');   // left sidebar filter
  const [tableSearch, setTableSearch]       = useState('');       // search bar in table
  const [tableStatusFilter, setTableStatus] = useState('all');    // all / pending / in_progress / completed
  const [expandedRow, setExpandedRow]       = useState(null);     // "reqId-leg-stepNum"

  const intervalRef = useRef(null);

  // ── Load data ──────────────────────────────────────────────────────────────
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const [mon, emps] = await Promise.all([
        api.getProcessMonitoring(),
        api.getEmployees(),
      ]);
      setRequests(Array.isArray(mon) ? mon : []);
      setEmployees(emps.employees || []);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e.message || 'Failed to load monitoring data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  // Auto-refresh
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoRefresh) {
      intervalRef.current = setInterval(() => load(true), 30_000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, load]);

  // ── Global stats ───────────────────────────────────────────────────────────
  const globalStats = useMemo(() => {
    let totalSteps = 0, inProgress = 0, completed = 0, pending = 0;
    requests.forEach(r => {
      totalSteps += r.steps_total || 0;
      inProgress += r.steps_in_progress || 0;
      completed  += r.steps_completed || 0;
      pending    += r.steps_pending || 0;
    });
    return { totalReqs: requests.length, totalSteps, inProgress, completed, pending };
  }, [requests]);

  // ── Flatten all steps from all requests ───────────────────────────────────
  const allFlatSteps = useMemo(() => {
    const rows = [];
    requests.forEach(req => {
      (req.steps || []).forEach(step => {
        rows.push({ ...step, _req: req });
      });
    });
    return rows;
  }, [requests]);

  // ── Unique step names (for sidebar) ───────────────────────────────────────
  const uniqueStepNames = useMemo(() => {
    const seen = new Set();
    const order = [];
    allFlatSteps.forEach(s => {
      const n = s.step_name || '';
      if (!seen.has(n)) { seen.add(n); order.push(n); }
    });
    return order;
  }, [allFlatSteps]);

  // ── Filtered table rows ────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    return allFlatSteps.filter(s => {
      if (stepFilter !== 'all' && (s.step_name || '') !== stepFilter) return false;
      if (tableStatusFilter !== 'all' && s.status !== tableStatusFilter) return false;
      if (tableSearch) {
        const q = tableSearch.toLowerCase();
        const req = s._req;
        return (
          req.request_number?.toLowerCase().includes(q) ||
          req.device_name?.toLowerCase().includes(q) ||
          req.customer?.toLowerCase().includes(q) ||
          req.lot_no?.toLowerCase().includes(q) ||
          (s.step_name || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allFlatSteps, stepFilter, tableStatusFilter, tableSearch]);

  // ── Step update handler ────────────────────────────────────────────────────
  const handleStepUpdate = useCallback(async (reqId, stepNum, leg, payload) => {
    const key = `${reqId}-${leg}-${stepNum}`;
    setUpdatingKey(key);
    setUpdateError('');
    try {
      await api.updateStep(reqId, stepNum, payload, leg);
      await load(true);
    } catch (e) {
      setUpdateError(e.message || 'Update failed');
    } finally {
      setUpdatingKey(null);
    }
  }, [load]);

  // ── Assign handler from table row ─────────────────────────────────────────
  const handleAssignFromRow = useCallback(async (reqId, stepNum, leg, empId) => {
    await handleStepUpdate(reqId, stepNum, leg, { operator_id: empId });
  }, [handleStepUpdate]);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-500 dark:text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-sm font-medium">Loading process monitoring data…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-500 dark:text-slate-400">
        <AlertTriangle className="w-8 h-8 text-red-500" />
        <p className="text-sm font-medium">{error}</p>
        <button onClick={() => load()} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 pt-6 pb-4 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Process Monitoring</h1>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {requests.length} active request{requests.length !== 1 ? 's' : ''} &mdash; real-time step tracking
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">
              Updated {lastRefresh.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => setAutoRefresh(v => !v)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              autoRefresh
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/30'
                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Zap className="w-3.5 h-3.5 inline mr-1" />
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </button>
          <button
            onClick={() => load()}
            className="p-2 rounded-lg bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Summary Cards ─────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-6 pb-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Active Requests"   value={globalStats.totalReqs}  icon={FlaskConical}  color="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"      sub={`${globalStats.totalSteps} total steps`} />
        <SummaryCard label="Steps In Progress" value={globalStats.inProgress} icon={Activity}      color="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"       sub="currently active" />
        <SummaryCard label="Steps Pending"     value={globalStats.pending}    icon={Clock}         color="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300"   sub="waiting to start" />
        <SummaryCard label="Steps Completed"   value={globalStats.completed}  icon={CheckCircle2}  color="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300" sub={`${globalStats.totalSteps ? Math.round((globalStats.completed / globalStats.totalSteps) * 100) : 0}% overall`} />
      </div>

      {/* ── Main table layout ─────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex gap-4 px-6 pb-6">

        {/* ── Left: Step-name sidebar ───────────────────────────────────────── */}
        <aside className="w-56 xl:w-64 flex-shrink-0 flex flex-col gap-1 min-h-0">
          {/* Sidebar header */}
          <div className="flex items-center gap-2 px-3 py-2 mb-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Process Steps</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
            {/* All Steps button */}
            <button
              onClick={() => setStepFilter('all')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left group ${
                stepFilter === 'all'
                  ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
              }`}
            >
              <TableProperties className={`w-4 h-4 flex-shrink-0 ${stepFilter === 'all' ? 'text-blue-200' : 'text-slate-400 group-hover:text-blue-500'}`} />
              <span className="truncate">All Steps</span>
              <span className={`ml-auto text-xs font-bold rounded-full px-1.5 py-0.5 ${stepFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-300'}`}>
                {allFlatSteps.length}
              </span>
            </button>

            {/* Per-step buttons */}
            {uniqueStepNames.map(name => {
              const count = allFlatSteps.filter(s => s.step_name === name).length;
              const active = stepFilter === name;
              const grad = getStepGradient(name);
              return (
                <button
                  key={name}
                  onClick={() => setStepFilter(active ? 'all' : name)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left group ${
                    active
                      ? 'bg-slate-800 dark:bg-slate-700 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 bg-gradient-to-br ${grad}`} />
                  <span className="truncate flex-1 leading-tight">{name}</span>
                  <span className={`text-xs font-bold rounded-full px-1.5 py-0.5 flex-shrink-0 ${active ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-300'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ── Right: Table ──────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">

          {/* Table toolbar */}
          <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-sm">

            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={tableSearch}
                onChange={e => setTableSearch(e.target.value)}
                placeholder="Search RR#, device, customer…"
                className="w-full pl-8 pr-7 py-1.5 text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white placeholder-slate-400"
              />
              {tableSearch && (
                <button onClick={() => setTableSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <X className="w-3 h-3 text-slate-400 hover:text-slate-600" />
                </button>
              )}
            </div>

            {/* Status filter chips */}
            <div className="flex gap-1">
              {[
                { key: 'all',         label: 'All' },
                { key: 'pending',     label: 'Pending' },
                { key: 'in_progress', label: 'In Progress' },
                { key: 'completed',   label: 'Completed' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTableStatus(key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                    tableStatusFilter === key
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-blue-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <span className="ml-auto text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
              {filteredRows.length} row{filteredRows.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Update error banner */}
          {updateError && (
            <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              {updateError}
              <button onClick={() => setUpdateError('')} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}

          {/* Table */}
          <div className="flex-1 overflow-auto">
            {filteredRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400 gap-3">
                <ListChecks className="w-12 h-12 opacity-25" />
                <p className="text-sm font-medium">No steps match the current filters</p>
                <button onClick={() => { setStepFilter('all'); setTableSearch(''); setTableStatus('all'); }}
                  className="text-xs text-blue-500 hover:underline">Clear all filters</button>
              </div>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-900 dark:to-slate-950 text-white">
                    <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-300 whitespace-nowrap w-36">
                      Request No. RR#
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-300 whitespace-nowrap w-28">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-300 whitespace-nowrap">
                      Process Step
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-300 whitespace-nowrap">
                      Employee Assign
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-300 whitespace-nowrap w-40">
                      Date to Start
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-300 whitespace-nowrap w-40">
                      End Date
                    </th>
                    <th className="w-10 px-2 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((step, idx) => (
                    <TableStepRow
                      key={`${step._req.id}-${step.leg}-${step.step_number}-${idx}`}
                      step={step}
                      req={step._req}
                      employees={employees}
                      isUpdating={updatingKey === `${step._req.id}-${step.leg}-${step.step_number}`}
                      isExpanded={expandedRow === `${step._req.id}-${step.leg}-${step.step_number}`}
                      onToggleExpand={() =>
                        setExpandedRow(prev =>
                          prev === `${step._req.id}-${step.leg}-${step.step_number}` ? null
                            : `${step._req.id}-${step.leg}-${step.step_number}`
                        )
                      }
                      onUpdate={(stepNum, leg, payload) => handleStepUpdate(step._req.id, stepNum, leg, payload)}
                      onAssign={(empId) => handleAssignFromRow(step._req.id, step.step_number, step.leg, empId)}
                      isEven={idx % 2 === 0}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Table Row Component ───────────────────────────────────────────────────────
function TableStepRow({ step, req, employees, isUpdating, isExpanded, onToggleExpand, onUpdate, onAssign, isEven }) {
  const [showAssign, setShowAssign] = useState(false);
  const [editingStart, setEditingStart] = useState(false);
  const [editingEnd, setEditingEnd]     = useState(false);
  const assignRef   = useRef(null);
  const startRef    = useRef(null);
  const endRef      = useRef(null);
  const cfg  = STEP_STATUS_CONFIG[step.status] || STEP_STATUS_CONFIG.pending;
  const grad = getStepGradient(step.step_name);
  const emp  = employees.find(e => e.id === step.operator_id);

  // Convert ISO → "YYYY-MM-DD" for <input type="date">
  function toDateValue(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('en-CA'); // "YYYY-MM-DD"
    } catch { return ''; }
  }

  useEffect(() => {
    if (!showAssign) return;
    function handler(e) { if (assignRef.current && !assignRef.current.contains(e.target)) setShowAssign(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAssign]);

  // Close date pickers on outside click
  useEffect(() => {
    function handler(e) {
      if (startRef.current && !startRef.current.contains(e.target)) setEditingStart(false);
      if (endRef.current   && !endRef.current.contains(e.target))   setEditingEnd(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleStatusChange = async (newStatus) => {
    if (newStatus === step.status) return;
    const payload = { status: newStatus };
    if (newStatus === 'in_progress' && !step.started_at) payload.started_at = new Date().toISOString();
    await onUpdate(step.step_number, step.leg, payload);
  };

  const handleDateSave = async (field, dateValue) => {
    // dateValue is "YYYY-MM-DD" or ""
    const iso = dateValue ? new Date(dateValue + 'T00:00:00').toISOString() : null;
    await onUpdate(step.step_number, step.leg, { [field]: iso });
    if (field === 'started_at')   setEditingStart(false);
    if (field === 'completed_at') setEditingEnd(false);
  };

  const handleToggleStepPriority = async () => {
    await onUpdate(step.step_number, step.leg, { priority: step.priority ? 0 : 1 });
  };

  const rowBase = step.priority
    ? 'bg-red-50 dark:bg-red-900/15 border-l-4 border-l-red-500'
    : isEven
      ? 'bg-white dark:bg-slate-800'
      : 'bg-slate-50/60 dark:bg-slate-800/60';

  return (
    <>
      <tr
        className={`${rowBase} border-b border-slate-100 dark:border-slate-700/50 ${step.priority ? 'hover:bg-red-100/60 dark:hover:bg-red-900/25' : 'hover:bg-blue-50/40 dark:hover:bg-blue-900/10'} transition-colors group cursor-pointer`}
        onClick={onToggleExpand}
      >
        {/* RR# */}
        <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
          <div className="flex flex-col gap-0.5">
            <Link
              to={`/requests/${req.id}`}
              className="text-xs font-bold font-mono text-blue-600 dark:text-blue-400 hover:underline leading-tight"
            >
              {req.request_number}
            </Link>
            <span className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[120px]" title={req.device_name}>
              {req.device_name || '—'}
            </span>
            {req.num_legs > 1 && (
              <span className="inline-flex items-center gap-0.5 text-xs text-slate-400">
                <Layers className="w-3 h-3" /> Leg {step.leg}
              </span>
            )}
          </div>
        </td>

        {/* Step Status */}
        <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-1.5">
            <StepStatusPill status={step.status} />
            {isUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />}
          </div>
          {/* Quick action buttons */}
          <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {step.status === 'pending' && (
              <button
                onClick={() => handleStatusChange('in_progress')}
                title="Start"
                className="p-1 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-600 hover:bg-blue-200 transition-colors"
              >
                <Play className="w-3 h-3" />
              </button>
            )}
            {step.status === 'in_progress' && (
              <button
                onClick={() => handleStatusChange('completed')}
                title="Complete"
                className="p-1 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 hover:bg-emerald-200 transition-colors"
              >
                <CheckCircle2 className="w-3 h-3" />
              </button>
            )}
            {step.status === 'completed' && (
              <button
                onClick={() => handleStatusChange('in_progress')}
                title="Revert"
                className="p-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <Square className="w-3 h-3" />
              </button>
            )}
          </div>
        </td>

        {/* Process Step */}
        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 bg-gradient-to-br ${grad}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`font-semibold leading-tight ${step.priority ? 'text-red-700 dark:text-red-400' : 'text-slate-800 dark:text-slate-100'}`}>
                  {step.step_name}
                </span>
                {step.priority && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700 animate-pulse">
                    <Flame className="w-2.5 h-2.5 fill-red-500 dark:fill-red-400" />
                    Priority
                  </span>
                )}
              </div>
              {step.status === 'in_progress' && step.started_at && (
                <span className="text-xs text-blue-500 dark:text-blue-400">{elapsed(step.started_at)} elapsed</span>
              )}
            </div>
            {/* Flame priority toggle */}
            <button
              onClick={() => handleToggleStepPriority()}
              title={step.priority ? 'Remove priority' : 'Mark as priority'}
              className={`flex-shrink-0 p-1 rounded-lg transition-all hover:scale-110 ${
                step.priority
                  ? 'text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900/30'
                  : 'text-slate-300 dark:text-slate-600 hover:text-red-400 dark:hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100'
              }`}
            >
              <Flame className={`w-4 h-4 ${step.priority ? 'fill-red-500 dark:fill-red-400' : ''}`} />
            </button>
          </div>
        </td>

        {/* Employee Assign */}
        <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
          <div className="relative" ref={assignRef}>
            <button
              onClick={() => setShowAssign(v => !v)}
              className="flex items-center gap-1.5 text-xs hover:text-blue-600 dark:hover:text-blue-400 transition-colors group/emp"
            >
              {emp ? (
                <>
                  <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white text-xs font-bold shadow-sm`}>
                    {emp.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-slate-700 dark:text-slate-200">{emp.name}</span>
                </>
              ) : (
                <>
                  <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <span className="text-slate-400 italic">Unassigned</span>
                </>
              )}
              <ChevronDown className="w-3 h-3 text-slate-400 opacity-0 group-hover/emp:opacity-100 transition-opacity" />
            </button>
            {showAssign && (
              <AssignPopover
                employees={employees}
                currentId={step.operator_id}
                onAssign={(id) => { setShowAssign(false); onAssign(id); }}
                onClose={() => setShowAssign(false)}
              />
            )}
          </div>
        </td>

        {/* Date to Start */}
        <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
          <div ref={startRef}>
            {editingStart ? (
              <input
                type="date"
                autoFocus
                defaultValue={toDateValue(step.started_at)}
                onChange={e => { if (e.target.value) handleDateSave('started_at', e.target.value); }}
                onBlur={e => handleDateSave('started_at', e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleDateSave('started_at', e.target.value);
                  if (e.key === 'Escape') setEditingStart(false);
                }}
                className="text-sm px-2 py-1 rounded-lg border border-blue-400 dark:border-blue-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
              />
            ) : (
              <button
                onClick={() => setEditingStart(true)}
                className="group/date flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title="Click to edit start date"
              >
                <CalendarDays className="w-3.5 h-3.5 text-slate-400 group-hover/date:text-blue-500 flex-shrink-0" />
                {step.started_at ? (
                  <span>{formatDateOnly(step.started_at)}</span>
                ) : (
                  <span className="text-slate-300 dark:text-slate-600 italic text-xs">Set date…</span>
                )}
              </button>
            )}
          </div>
        </td>

        {/* End Date */}
        <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
          <div ref={endRef}>
            {editingEnd ? (
              <input
                type="date"
                autoFocus
                defaultValue={toDateValue(step.completed_at)}
                onChange={e => { if (e.target.value) handleDateSave('completed_at', e.target.value); }}
                onBlur={e => handleDateSave('completed_at', e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleDateSave('completed_at', e.target.value);
                  if (e.key === 'Escape') setEditingEnd(false);
                }}
                className="text-sm px-2 py-1 rounded-lg border border-emerald-400 dark:border-emerald-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-36"
              />
            ) : (
              <button
                onClick={() => setEditingEnd(true)}
                className="group/date flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                title="Click to edit end date"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 group-hover/date:text-emerald-500 flex-shrink-0" />
                {step.completed_at ? (
                  <span>{formatDateOnly(step.completed_at)}</span>
                ) : (
                  <span className="text-slate-300 dark:text-slate-600 italic text-xs">Set date…</span>
                )}
              </button>
            )}
          </div>
        </td>

        {/* Expand toggle */}
        <td className="px-2 py-3 text-center">
          <button
            onClick={onToggleExpand}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </td>
      </tr>

      {/* Expanded detail row */}
      {isExpanded && (
        <tr className={`${rowBase} border-b border-slate-100 dark:border-slate-700/50`}>
          <td colSpan={7} className="px-6 pb-4 pt-1">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600/50 p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-xs">

              <div>
                <p className="text-slate-400 font-semibold uppercase tracking-wider mb-1">Customer</p>
                <p className="text-slate-700 dark:text-slate-200 font-medium">{req.customer || '—'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold uppercase tracking-wider mb-1">Lot No.</p>
                <p className="text-slate-700 dark:text-slate-200 font-medium font-mono">{req.lot_no || '—'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold uppercase tracking-wider mb-1">Machine No.</p>
                <p className="text-slate-700 dark:text-slate-200 font-medium">{step.machine_no || '—'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold uppercase tracking-wider mb-1">Rack / Tray</p>
                <p className="text-slate-700 dark:text-slate-200 font-medium">
                  {[step.rack_no && `Rack ${step.rack_no}`, step.tray_no && `Tray ${step.tray_no}`].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold uppercase tracking-wider mb-1">Qty In / Out</p>
                <p className="text-slate-700 dark:text-slate-200 font-medium">
                  {step.qty_in != null ? `${step.qty_in}${step.qty_out != null ? ` / ${step.qty_out}` : ''}` : '—'}
                </p>
              </div>

              {step.notes && (
                <div className="col-span-2 sm:col-span-3 lg:col-span-5">
                  <p className="text-slate-400 font-semibold uppercase tracking-wider mb-1">Notes</p>
                  <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{step.notes}</p>
                </div>
              )}

              {step.custom_fields && Object.keys(step.custom_fields).length > 0 && (
                <div className="col-span-2 sm:col-span-3 lg:col-span-5">
                  <p className="text-slate-400 font-semibold uppercase tracking-wider mb-1">Custom Fields</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(step.custom_fields).map(([k, v]) => v && (
                      <span key={k} className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 text-slate-600 dark:text-slate-300">
                        <span className="text-slate-400">{k}:</span> {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="col-span-2 sm:col-span-3 lg:col-span-5 flex justify-end">
                <Link
                  to={`/requests/${req.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" /> Open Full Request
                </Link>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}


