import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import {
  Activity, RefreshCw, Loader2, Search, X, Filter, ChevronRight,
  CheckCircle2, Clock, AlertTriangle, Play, Square, User, Wrench,
  Package, Layers, CalendarDays, Tag, ClipboardCheck,
  Eye, Edit3, Save, XCircle, Users, BarChart3, Zap, ListChecks,
  ChevronDown, ChevronUp, Building2, FlaskConical, Cpu,
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

function ProgressBar({ completed, total, inProgress }) {
  if (!total) return null;
  const comp = Math.min(completed / total, 1) * 100;
  const prog = Math.min(inProgress / total, 1) * 100;
  return (
    <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
      <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${comp}%` }} />
      <div className="h-full bg-blue-400 transition-all duration-500" style={{ width: `${prog}%` }} />
    </div>
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
function StepCard({ step, employees, onUpdate, requestId, isUpdating }) {
  const [showAssign, setShowAssign] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const cfg = STEP_STATUS_CONFIG[step.status] || STEP_STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  const grad = getStepGradient(step.step_name);
  const emp = employees.find(e => e.id === step.operator_id);

  const handleAssign = async (empId) => {
    setShowAssign(false);
    await onUpdate(step.step_number, step.leg, { operator_id: empId });
  };

  const handleStatusChange = async (newStatus) => {
    if (newStatus === step.status) return;
    const payload = { status: newStatus };
    if (newStatus === 'in_progress' && !step.started_at) {
      payload.started_at = new Date().toISOString();
    }
    await onUpdate(step.step_number, step.leg, payload);
  };

  const isLoading = isUpdating === `${step.leg}-${step.step_number}`;

  return (
    <div className={`relative rounded-xl border transition-all duration-200 ${cfg.bg} ${isLoading ? 'opacity-60' : ''}`}>
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-gradient-to-b ${grad}`} />

      <div className="pl-4 pr-3 py-3">
        {/* Header row */}
        <div className="flex items-start gap-2">
          {/* Step number badge */}
          <div className={`flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br ${grad} flex items-center justify-center text-white text-xs font-bold shadow`}>
            {step.step_number}
          </div>

          {/* Step name + status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-slate-800 dark:text-slate-100 leading-tight">
                {step.step_name}
              </span>
              <StepStatusPill status={step.status} />
              {step.status === 'in_progress' && step.started_at && (
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {elapsed(step.started_at)} elapsed
                </span>
              )}
            </div>

            {/* Employee assignment */}
            <div className="flex items-center gap-1.5 mt-1">
              <User className="w-3 h-3 text-slate-400 flex-shrink-0" />
              <div className="relative">
                <button
                  onClick={() => setShowAssign(v => !v)}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 transition-colors"
                >
                  {emp ? (
                    <span className="font-medium text-slate-700 dark:text-slate-200">{emp.name}</span>
                  ) : (
                    <span className="text-slate-400 italic">Unassigned — click to assign</span>
                  )}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showAssign && (
                  <AssignPopover
                    employees={employees}
                    currentId={step.operator_id}
                    onAssign={handleAssign}
                    onClose={() => setShowAssign(false)}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
            {/* Status action buttons */}
            {step.status === 'pending' && (
              <button
                onClick={() => handleStatusChange('in_progress')}
                title="Start step"
                className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
            )}
            {step.status === 'in_progress' && (
              <button
                onClick={() => handleStatusChange('completed')}
                title="Complete step"
                className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            )}
            {step.status === 'completed' && (
              <button
                onClick={() => handleStatusChange('in_progress')}
                title="Revert to in progress"
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                <Square className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setShowDetails(v => !v)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Quick info pills */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {step.machine_no && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300">
              <Wrench className="w-3 h-3" /> {step.machine_no}
            </span>
          )}
          {step.rack_no && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300">
              <Package className="w-3 h-3" /> Rack {step.rack_no}
            </span>
          )}
          {step.tray_no && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300">
              <Tag className="w-3 h-3" /> Tray {step.tray_no}
            </span>
          )}
          {step.qty_in != null && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300">
              In: {step.qty_in}{step.qty_out != null ? ` / Out: ${step.qty_out}` : ''}
            </span>
          )}
        </div>

        {/* Expandable details */}
        {showDetails && (
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600/50 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <div>
              <span className="text-slate-400 dark:text-slate-500 font-medium">Started</span>
              <p className="text-slate-700 dark:text-slate-200">{formatDT(step.started_at)}</p>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500 font-medium">Completed</span>
              <p className="text-slate-700 dark:text-slate-200">{formatDT(step.completed_at)}</p>
            </div>
            {step.notes && (
              <div className="col-span-2">
                <span className="text-slate-400 dark:text-slate-500 font-medium">Notes</span>
                <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{step.notes}</p>
              </div>
            )}
            {step.custom_fields && Object.keys(step.custom_fields).length > 0 && (
              <div className="col-span-2">
                <span className="text-slate-400 dark:text-slate-500 font-medium">Custom Fields</span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {Object.entries(step.custom_fields).map(([k, v]) => v && (
                    <span key={k} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs">
                      {k}: {v}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Leg Panel ─────────────────────────────────────────────────────────────────
function LegPanel({ legNum, steps, employees, onUpdate, updatingKey }) {
  const total    = steps.length;
  const completed = steps.filter(s => s.status === 'completed').length;
  const inProg   = steps.filter(s => s.status === 'in_progress').length;
  const pct      = total ? Math.round((completed / total) * 100) : 0;

  return (
    <div>
      {/* Leg header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow">
            {legNum}
          </div>
          <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-200">Leg {legNum}</h3>
          <span className="text-xs text-slate-400">
            {completed}/{total} steps · {inProg} active
          </span>
        </div>
        <span className={`text-sm font-bold ${pct === 100 ? 'text-emerald-600' : 'text-blue-600'}`}>{pct}%</span>
      </div>

      {/* Progress bar */}
      <div className="mb-4 px-1">
        <ProgressBar completed={completed} inProgress={inProg} total={total} />
      </div>

      {/* Step cards */}
      <div className="space-y-2">
        {steps.map(step => (
          <StepCard
            key={`${legNum}-${step.step_number}`}
            step={step}
            employees={employees}
            onUpdate={onUpdate}
            isUpdating={updatingKey}
          />
        ))}
      </div>
    </div>
  );
}

// ── Request List Item ─────────────────────────────────────────────────────────
function RequestListItem({ req, isSelected, onClick }) {
  const pct = req.steps_total
    ? Math.round((req.steps_completed / req.steps_total) * 100)
    : 0;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-3 rounded-xl transition-all duration-150 border ${
        isSelected
          ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`text-xs font-bold font-mono ${isSelected ? 'text-blue-200' : 'text-blue-600 dark:text-blue-400'}`}>
              {req.request_number}
            </span>
            <RequestStatusBadge status={req.status} />
          </div>
          <p className={`text-sm font-semibold truncate leading-tight ${isSelected ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>
            {req.device_name || '—'}
          </p>
          {req.customer && (
            <p className={`text-xs truncate ${isSelected ? 'text-blue-200' : 'text-slate-400 dark:text-slate-500'}`}>
              {req.customer}
            </p>
          )}
        </div>
        <ChevronRight className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isSelected ? 'text-blue-200' : 'text-slate-300 dark:text-slate-600'}`} />
      </div>

      {/* Mini progress */}
      {req.steps_total > 0 && (
        <div className="mt-2">
          <div className="flex justify-between text-xs mb-1">
            <span className={isSelected ? 'text-blue-200' : 'text-slate-400'}>
              {req.steps_completed}/{req.steps_total} steps
            </span>
            <span className={`font-semibold ${isSelected ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>{pct}%</span>
          </div>
          <div className={`h-1.5 rounded-full overflow-hidden ${isSelected ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
            <div
              className={`h-full rounded-full transition-all duration-500 ${isSelected ? 'bg-white' : 'bg-emerald-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Leg count */}
      <div className={`flex items-center gap-1 mt-1.5 text-xs ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
        <Layers className="w-3 h-3" />
        {req.num_active_legs || req.num_legs || 1} leg{(req.num_active_legs || req.num_legs || 1) > 1 ? 's' : ''}
        {req.steps_in_progress > 0 && (
          <span className={`ml-auto inline-flex items-center gap-0.5 ${isSelected ? 'text-blue-200' : 'text-blue-600 dark:text-blue-400'}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            {req.steps_in_progress} active
          </span>
        )}
      </div>
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ProcessMonitoring() {
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [listSearch, setListSearch] = useState('');
  const [listStatusFilter, setListStatusFilter] = useState('all');
  const [stepStatusFilter, setStepStatusFilter] = useState('all');
  const [stepSearch, setStepSearch] = useState('');
  const [legFilter, setLegFilter] = useState('all');
  const [updatingKey, setUpdatingKey] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [updateError, setUpdateError] = useState('');
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
      // Auto-select first request if nothing selected yet
      if (!selectedId && mon.length > 0) setSelectedId(mon[0].id);
    } catch (e) {
      setError(e.message || 'Failed to load monitoring data');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => { load(); }, []);

  // Auto-refresh
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoRefresh) {
      intervalRef.current = setInterval(() => load(true), 30_000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, load]);

  // ── Selected request ───────────────────────────────────────────────────────
  const selectedReq = useMemo(() => requests.find(r => r.id === selectedId), [requests, selectedId]);

  // ── Filtered request list ──────────────────────────────────────────────────
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      if (listStatusFilter !== 'all' && r.status !== listStatusFilter) return false;
      if (!listSearch) return true;
      const q = listSearch.toLowerCase();
      return (
        r.request_number?.toLowerCase().includes(q) ||
        r.device_name?.toLowerCase().includes(q) ||
        r.customer?.toLowerCase().includes(q) ||
        r.lot_no?.toLowerCase().includes(q)
      );
    });
  }, [requests, listSearch, listStatusFilter]);

  // ── Available legs for selected request ───────────────────────────────────
  const legNumbers = useMemo(() => {
    if (!selectedReq) return [];
    return [...new Set((selectedReq.steps || []).map(s => s.leg))].sort((a, b) => a - b);
  }, [selectedReq]);

  // ── Filtered steps ─────────────────────────────────────────────────────────
  const filteredSteps = useMemo(() => {
    if (!selectedReq) return [];
    return (selectedReq.steps || []).filter(s => {
      if (legFilter !== 'all' && s.leg !== Number(legFilter)) return false;
      if (stepStatusFilter !== 'all' && s.status !== stepStatusFilter) return false;
      if (stepSearch) {
        const q = stepSearch.toLowerCase();
        if (!s.step_name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [selectedReq, legFilter, stepStatusFilter, stepSearch]);

  // Group steps by leg
  const stepsByLeg = useMemo(() => {
    const map = new Map();
    filteredSteps.forEach(s => {
      if (!map.has(s.leg)) map.set(s.leg, []);
      map.get(s.leg).push(s);
    });
    return map;
  }, [filteredSteps]);

  // ── Global stats ───────────────────────────────────────────────────────────
  const globalStats = useMemo(() => {
    let totalReqs = requests.length;
    let totalSteps = 0, inProgress = 0, completed = 0, pending = 0;
    requests.forEach(r => {
      totalSteps += r.steps_total || 0;
      inProgress += r.steps_in_progress || 0;
      completed  += r.steps_completed || 0;
      pending    += r.steps_pending || 0;
    });
    return { totalReqs, totalSteps, inProgress, completed, pending };
  }, [requests]);

  // ── Step update handler ────────────────────────────────────────────────────
  const handleStepUpdate = useCallback(async (stepNum, leg, payload) => {
    if (!selectedId) return;
    const key = `${leg}-${stepNum}`;
    setUpdatingKey(key);
    setUpdateError('');
    try {
      await api.updateStep(selectedId, stepNum, payload, leg);
      // Refresh silently
      await load(true);
    } catch (e) {
      setUpdateError(e.message || 'Update failed');
    } finally {
      setUpdatingKey(null);
    }
  }, [selectedId, load]);

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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-md">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Process Monitoring</h1>
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
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              autoRefresh
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-700'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Zap className="w-3.5 h-3.5 inline mr-1" />
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </button>
          <button
            onClick={() => load()}
            className="p-2 rounded-lg bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-slate-700 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-500 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Summary Cards ─────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-6 pb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          label="Active Requests"
          value={globalStats.totalReqs}
          icon={FlaskConical}
          color="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
          sub={`${globalStats.totalSteps} total steps`}
        />
        <SummaryCard
          label="Steps In Progress"
          value={globalStats.inProgress}
          icon={Activity}
          color="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
          sub="currently active"
        />
        <SummaryCard
          label="Steps Pending"
          value={globalStats.pending}
          icon={Clock}
          color="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300"
          sub="waiting to start"
        />
        <SummaryCard
          label="Steps Completed"
          value={globalStats.completed}
          icon={CheckCircle2}
          color="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
          sub={`${globalStats.totalSteps ? Math.round((globalStats.completed / globalStats.totalSteps) * 100) : 0}% overall`}
        />
      </div>

      {/* ── Main split layout ─────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex gap-0 px-6 pb-6">
        {/* ── Left: Request List ─────────────────────────────────────────────── */}
        <div className="w-72 xl:w-80 flex-shrink-0 flex flex-col min-h-0 mr-4">
          {/* Search + filter */}
          <div className="space-y-2 mb-3 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={listSearch}
                onChange={e => setListSearch(e.target.value)}
                placeholder="Search REL#, device, customer…"
                className="w-full pl-9 pr-8 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white placeholder-slate-400"
              />
              {listSearch && (
                <button onClick={() => setListSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}
            </div>
            <div className="flex gap-1 flex-wrap">
              {[
                { key: 'all', label: 'All' },
                { key: 'incoming', label: 'Incoming' },
                { key: 'review', label: 'Review' },
                { key: 'approval', label: 'Approval' },
                { key: 'testing', label: 'Testing' },
                { key: 'analysis', label: 'Analysis' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setListStatusFilter(key)}
                  className={`px-2 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    listStatusFilter === key
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-blue-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                <FlaskConical className="w-8 h-8 opacity-40" />
                <p className="text-sm">No requests found</p>
              </div>
            ) : (
              filteredRequests.map(req => (
                <RequestListItem
                  key={req.id}
                  req={req}
                  isSelected={selectedId === req.id}
                  onClick={() => {
                    setSelectedId(req.id);
                    setLegFilter('all');
                    setStepStatusFilter('all');
                    setStepSearch('');
                  }}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Right: Step Detail ─────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          {!selectedReq ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-3">
              <ListChecks className="w-12 h-12 opacity-30" />
              <p className="text-sm">Select a request to view its process steps</p>
            </div>
          ) : (
            <>
              {/* Request header */}
              <div className="flex-shrink-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-4 shadow-sm">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-bold font-mono text-blue-600 dark:text-blue-400">
                        {selectedReq.request_number}
                      </span>
                      <RequestStatusBadge status={selectedReq.status} />
                      {selectedReq.classification && (
                        <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                          {selectedReq.classification}
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight truncate">
                      {selectedReq.device_name || '—'}
                    </h2>
                    <div className="flex items-center gap-4 mt-1 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                      {selectedReq.customer && (
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{selectedReq.customer}</span>
                      )}
                      {selectedReq.plant && (
                        <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{selectedReq.plant}</span>
                      )}
                      {selectedReq.lot_no && (
                        <span className="flex items-center gap-1"><Tag className="w-3 h-3" />Lot: {selectedReq.lot_no}</span>
                      )}
                      {selectedReq.deadline && (
                        <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />Deadline: {formatDateOnly(selectedReq.deadline)}</span>
                      )}
                    </div>
                  </div>

                  {/* Overall progress ring + counts */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                        {selectedReq.steps_total
                          ? Math.round((selectedReq.steps_completed / selectedReq.steps_total) * 100)
                          : 0}%
                      </div>
                      <div className="text-xs text-slate-400">complete</div>
                    </div>
                    <div className="w-px h-10 bg-slate-200 dark:bg-slate-600" />
                    <div className="space-y-0.5 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        {selectedReq.steps_completed} completed
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        {selectedReq.steps_in_progress} in progress
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                        {selectedReq.steps_pending} pending
                      </div>
                    </div>
                    <Link
                      to={`/requests/${selectedReq.id}`}
                      className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-600 hover:border-blue-300 transition-colors"
                      title="Open full request"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                {/* Overall progress bar */}
                <div className="mt-3">
                  <ProgressBar
                    completed={selectedReq.steps_completed}
                    inProgress={selectedReq.steps_in_progress}
                    total={selectedReq.steps_total}
                  />
                </div>
              </div>

              {/* Update error */}
              {updateError && (
                <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 mb-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {updateError}
                  <button onClick={() => setUpdateError('')} className="ml-auto"><X className="w-4 h-4" /></button>
                </div>
              )}

              {/* Step filters */}
              <div className="flex-shrink-0 flex items-center gap-2 mb-4 flex-wrap">
                {/* Leg filter */}
                {legNumbers.length > 1 && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => setLegFilter('all')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        legFilter === 'all'
                          ? 'bg-violet-600 text-white border-violet-600'
                          : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-violet-300'
                      }`}
                    >
                      All Legs
                    </button>
                    {legNumbers.map(l => (
                      <button
                        key={l}
                        onClick={() => setLegFilter(String(l))}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          legFilter === String(l)
                            ? 'bg-violet-600 text-white border-violet-600'
                            : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-violet-300'
                        }`}
                      >
                        Leg {l}
                      </button>
                    ))}
                  </div>
                )}

                {/* Status filter */}
                <div className="flex gap-1">
                  {['all', 'pending', 'in_progress', 'completed'].map(s => (
                    <button
                      key={s}
                      onClick={() => setStepStatusFilter(s)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        stepStatusFilter === s
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-blue-300'
                      }`}
                    >
                      {s === 'all' ? 'All' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Step name search */}
                <div className="relative ml-auto">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    value={stepSearch}
                    onChange={e => setStepSearch(e.target.value)}
                    placeholder="Filter steps…"
                    className="pl-8 pr-7 py-1.5 text-xs w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 dark:text-white placeholder-slate-400"
                  />
                  {stepSearch && (
                    <button onClick={() => setStepSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                      <X className="w-3 h-3 text-slate-400" />
                    </button>
                  )}
                </div>
              </div>

              {/* Steps area */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                {stepsByLeg.size === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                    <ClipboardCheck className="w-10 h-10 opacity-30" />
                    <p className="text-sm">No steps match the current filters</p>
                  </div>
                ) : (
                  <div className={`${legNumbers.length > 1 ? 'grid grid-cols-1 xl:grid-cols-2 gap-6' : ''}`}>
                    {[...stepsByLeg.entries()].map(([leg, steps]) => (
                      <LegPanel
                        key={leg}
                        legNum={leg}
                        steps={steps}
                        employees={employees}
                        onUpdate={handleStepUpdate}
                        updatingKey={updatingKey}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
