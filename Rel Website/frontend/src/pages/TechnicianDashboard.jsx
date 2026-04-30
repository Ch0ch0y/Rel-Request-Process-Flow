import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api';
import {
  PackageSearch, Eye, Waves, Flame, Thermometer, PauseCircle,
  ClipboardList, AlertTriangle, Timer, Calendar, Activity,
  CheckCircle2, ArrowRight, Wrench, ChevronRight, ChevronDown,
  MessageSquarePlus, FileSpreadsheet, RefreshCw, UserCheck,
  Search, X, Users, Zap, ListChecks, Clock,
} from 'lucide-react';

/* ── PHT live clock ──────────────────────────────────────────────────────── */
function usePHTClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const fmt = (opts) => now.toLocaleString('en-PH', { timeZone: 'Asia/Manila', ...opts });
  return {
    time: fmt({ hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
    date: fmt({ month: 'long', day: 'numeric', year: 'numeric' }),
  };
}

/* ── Step card definitions ───────────────────────────────────────────────── */
const STEP_CARDS = [
  { key: 'incoming', label: 'Incoming Inspection', icon: PackageSearch,
    color: { ring: 'ring-orange-400', glow: 'shadow-orange-200 dark:shadow-orange-900/40', border: 'border-orange-200 dark:border-orange-700/50', bg: 'from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/30', iconBg: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400' },
    match: (s) => /incoming inspection/i.test(s.step_name) },
  { key: 'visual', label: 'Visual', icon: Eye,
    color: { ring: 'ring-blue-400', glow: 'shadow-blue-200 dark:shadow-blue-900/40', border: 'border-blue-200 dark:border-blue-700/50', bg: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/30', iconBg: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
    match: (s) => /^visual$/i.test(s.step_name?.trim()) },
  { key: 'sat', label: 'SAT', icon: Waves,
    color: { ring: 'ring-purple-400', glow: 'shadow-purple-200 dark:shadow-purple-900/40', border: 'border-purple-200 dark:border-purple-700/50', bg: 'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/30', iconBg: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400' },
    match: (s) => /\bsat\b/i.test(s.step_name) },
  { key: 'bake', label: 'Bake', icon: Flame,
    color: { ring: 'ring-amber-400', glow: 'shadow-amber-200 dark:shadow-amber-900/40', border: 'border-amber-200 dark:border-amber-700/50', bg: 'from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/30', iconBg: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
    match: (s) => /\bbake\b/i.test(s.step_name) },
  { key: 'hts', label: 'HTS', icon: Thermometer,
    color: { ring: 'ring-red-400', glow: 'shadow-red-200 dark:shadow-red-900/40', border: 'border-red-200 dark:border-red-700/50', bg: 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/30', iconBg: 'bg-red-500', text: 'text-red-600 dark:text-red-400' },
    match: (s) => /hts|high.temp/i.test(s.step_name) },
  { key: 'hold', label: 'On Hold', icon: PauseCircle,
    color: { ring: 'ring-rose-400', glow: 'shadow-rose-200 dark:shadow-rose-900/40', border: 'border-rose-200 dark:border-rose-700/50', bg: 'from-rose-50 to-rose-100 dark:from-rose-900/20 dark:to-rose-900/30', iconBg: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400' },
    match: (s) => s.status === 'hold' },
];

/* ── Status pill ─────────────────────────────────────────────────────────── */
function StatusPill({ status }) {
  const cfg = {
    pending:     'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300',
    in_progress: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    completed:   'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
    hold:        'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300',
  };
  const labels = { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed', hold: 'On Hold' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg[status] || cfg.pending}`}>
      {status === 'in_progress' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse inline-block" />}
      {labels[status] || status}
    </span>
  );
}

/* ── Section card wrapper ────────────────────────────────────────────────── */
function SectionCard({ className = '', children }) {
  return (
    <div className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm ${className}`}>
      {children}
    </div>
  );
}

/* ── Empty state ─────────────────────────────────────────────────────────── */
function Empty({ icon: Icon, text, color = 'text-slate-400' }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2">
      <Icon className={`w-8 h-8 ${color} opacity-50`} />
      <p className="text-sm text-slate-400 dark:text-slate-500">{text}</p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════════════ */
export default function TechnicianDashboard({ stats }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { time, date } = usePHTClock();

  /* ── State ─────────────────────────────────────────────────────────────── */
  const [employees, setEmployees]       = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState(null);
  const [empSearch, setEmpSearch]       = useState('');
  const [dropOpen, setDropOpen]         = useState(false);
  const [editing, setEditing]           = useState(false);
  const [pmData, setPmData]             = useState([]);
  const [pmLoading, setPmLoading]       = useState(false);
  const [lastRefresh, setLastRefresh]   = useState(null);
  const [workExpanded, setWorkExpanded] = useState(true);
  const dropRef = useRef(null);

  /* ── Close dropdown on outside click ───────────────────────────────────── */
  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) { setDropOpen(false); setEditing(false); } };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Load employees ─────────────────────────────────────────────────────── */
  useEffect(() => {
    api.getEmployees()
      .then(res => {
        // API returns { employees: [...] }
        const list = Array.isArray(res) ? res : (res?.employees ?? []);
        setEmployees(list);
        // Auto-select the logged-in employee if they are in the list
        if (user?.employee_id || user?.name) {
          const match = list.find(e => e.id === user.employee_id || e.name === user.name);
          if (match) setSelectedEmpId(match.id);
        }
      })
      .catch(() => {});
  }, [user]);

  /* ── Load Process Monitoring data ──────────────────────────────────────── */
  const loadPM = () => {
    setPmLoading(true);
    api.getProcessMonitoring()
      .then(data => { setPmData(Array.isArray(data) ? data : []); setLastRefresh(new Date()); })
      .catch(() => { setPmData([]); })
      .finally(() => setPmLoading(false));
  };
  useEffect(() => { loadPM(); }, []);

  /* ── Derived: selected employee object ──────────────────────────────────── */
  const selectedEmployee = useMemo(
    () => employees.find(e => e.id === selectedEmpId) ?? null,
    [employees, selectedEmpId]
  );

  /* ── Derived: steps assigned to selected employee ───────────────────────── */
  const assignedSteps = useMemo(() => {
    if (!selectedEmpId) return [];
    const result = [];
    for (const req of pmData) {
      for (const step of req.steps ?? []) {
        if (String(step.operator_id) === String(selectedEmpId) && step.status !== 'completed') {
          result.push({
            ...step,
            request_number: req.request_number,
            device_name:    req.device_name,
            customer:       req.customer,
            request_id:     req.id,
            deadline:       req.deadline,
          });
        }
      }
    }
    return result;
  }, [pmData, selectedEmpId]);

  /* ── Derived: card counts ────────────────────────────────────────────────── */
  const stepCounts = useMemo(() =>
    Object.fromEntries(
      STEP_CARDS.map(card => [card.key, assignedSteps.filter(card.match).length])
    ),
    [assignedSteps]
  );

  /* ── Filtered employee dropdown ─────────────────────────────────────────── */
  const filteredEmps = useMemo(() =>
    !empSearch
      ? employees
      : employees.filter(e =>
          [e.name, e.id, e.position]
            .some(f => f?.toLowerCase().includes(empSearch.toLowerCase()))
        ),
    [employees, empSearch]
  );

  /* ── Export work list to CSV ─────────────────────────────────────────────── */
  const exportCSV = () => {
    if (!assignedSteps.length) return;
    const header = ['Request #', 'Device / Customer', 'Step', 'Leg', 'Status', 'Machine', 'Rack', 'Started At', 'Deadline'];
    const rows = assignedSteps.map(s => [
      s.request_number, `${s.device_name || ''} / ${s.customer || ''}`.replace(/^\/|\/$/g, '').trim(),
      s.step_name, s.leg ?? '', s.status,
      s.machine_no || '', s.rack_no || '',
      s.started_at ? new Date(s.started_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: false }) : '',
      s.deadline || '',
    ]);
    const csv = [[`Work List — ${selectedEmployee?.name || 'Employee'} — ${date}`], header, ...rows]
      .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `worklist_${(selectedEmployee?.name || 'emp').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  };

  /* ── Helpers ─────────────────────────────────────────────────────────────── */
  const fmtTime = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  };

  /* ═══════════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-5">

      {/* ── HERO HEADER ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-400 dark:from-orange-700 dark:via-amber-700 dark:to-yellow-600 shadow-lg">
        {/* subtle noise texture */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='60' height='60' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E")`
        }} />
        <div className="relative px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left: identity */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner ring-2 ring-white/30">
              <Wrench className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-xl font-heading font-extrabold text-white tracking-tight drop-shadow">
                Technician Dashboard
              </h1>
              <p className="text-white/80 text-sm mt-0.5">
                {selectedEmployee
                  ? <span className="flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5" /> Showing work for <strong>{selectedEmployee.name}</strong></span>
                  : 'Select an employee to see their assigned work'}
              </p>
            </div>
          </div>

          {/* Right: clock */}
          <div className="text-right flex-shrink-0">
            <p className="text-3xl font-mono font-bold text-white drop-shadow leading-none">{time}</p>
            <p className="text-white/80 text-xs mt-1">{date} · PHT</p>
          </div>
        </div>

        {/* ── Employee Selector bar ─────────────────────────────────────── */}
        <div className="relative px-6 pb-5" ref={dropRef}>
          <div className="bg-white/20 dark:bg-black/20 backdrop-blur-sm rounded-xl p-3 flex items-center gap-3 border border-white/30">
            <Users className="w-4 h-4 text-white/80 flex-shrink-0" />
            <div className="flex-1 relative">
              {/* Inline combobox — type to filter instantly */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  value={editing ? empSearch : (selectedEmployee ? `${selectedEmployee.name}${selectedEmployee.id ? ' · ' + selectedEmployee.id : ''}` : '')}
                  onFocus={() => { setEditing(true); setEmpSearch(''); setDropOpen(true); }}
                  onChange={e => { setEmpSearch(e.target.value); setDropOpen(true); }}
                  placeholder="Type name or ID to search…"
                  className={`w-full pl-8 pr-8 py-2 bg-white dark:bg-slate-800 rounded-lg text-sm shadow-sm border border-white/40 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-400 dark:text-white placeholder:text-slate-400 ${
                    !editing && selectedEmployee ? 'text-slate-800 dark:text-slate-100 font-medium' : 'text-slate-700 dark:text-slate-200'
                  }`}
                />
                {(selectedEmployee || (editing && empSearch)) && (
                  <button
                    onMouseDown={e => { e.preventDefault(); setSelectedEmpId(null); setEditing(false); setDropOpen(false); setEmpSearch(''); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors"
                    title="Clear selection"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Suggestions dropdown */}
              {dropOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600 shadow-xl z-50 overflow-hidden">
                  <div className="max-h-60 overflow-y-auto">
                    {filteredEmps.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-slate-400">No employees found</p>
                    ) : (
                      filteredEmps.map(emp => (
                        <button
                          key={emp.id}
                          onMouseDown={e => { e.preventDefault(); setSelectedEmpId(emp.id); setDropOpen(false); setEditing(false); setEmpSearch(''); }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-left ${emp.id === selectedEmpId ? 'bg-orange-50 dark:bg-orange-900/20 font-semibold' : ''}`}
                        >
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {emp.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-slate-800 dark:text-slate-100 font-medium truncate">{emp.name}</p>
                            {emp.id && <p className="text-xs text-slate-400 truncate">ID: {emp.id} {emp.position ? `· ${emp.position}` : ''}</p>}
                          </div>
                          {emp.id === selectedEmpId && <CheckCircle2 className="w-4 h-4 text-orange-500 flex-shrink-0" />}
                        </button>
                      ))
                    )}
                  </div>
                  {selectedEmpId && (
                    <div className="border-t border-slate-100 dark:border-slate-700 px-3 py-2">
                      <button
                        onMouseDown={e => { e.preventDefault(); setSelectedEmpId(null); setDropOpen(false); setEditing(false); }}
                        className="text-xs text-rose-500 hover:text-rose-700 font-medium flex items-center gap-1"
                      >
                        <X className="w-3 h-3" /> Clear selection
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Refresh button */}
            <button
              onClick={loadPM}
              disabled={pmLoading}
              title="Refresh Process Monitoring data"
              className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <RefreshCw className={`w-4 h-4 text-white ${pmLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {lastRefresh && (
            <p className="text-white/60 text-xs mt-1.5 text-right">
              Data updated: {lastRefresh.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
            </p>
          )}
        </div>
      </div>

      {/* ── STEP COUNT CARDS ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {STEP_CARDS.map(card => {
          const Icon = card.icon;
          const count = stepCounts[card.key] ?? 0;
          const c = card.color;
          return (
            <div
              key={card.key}
              className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${c.bg} ${c.border} shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.03] cursor-default group`}
            >
              {/* decorative circle */}
              <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full ${c.iconBg} opacity-10 group-hover:opacity-20 transition-opacity`} />
              <div className="relative p-4 flex flex-col gap-3">
                <div className={`w-9 h-9 rounded-xl ${c.iconBg} flex items-center justify-center shadow-sm`}>
                  <Icon className="w-4.5 h-4.5 text-white" strokeWidth={2.5} style={{ width: '1.1rem', height: '1.1rem' }} />
                </div>
                <div>
                  <p className={`text-3xl font-extrabold font-heading leading-none ${c.text}`}>{count}</p>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 leading-tight">{card.label}</p>
                  {!selectedEmpId && <p className="text-[10px] text-slate-400 italic mt-0.5">Select employee</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── WORK TO DO LIST ─────────────────────────────────────────────── */}
      <SectionCard>
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-sm">
              <ListChecks className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-slate-800 dark:text-slate-100 text-base">Work To Do List</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {selectedEmployee
                  ? assignedSteps.length > 0
                    ? `${assignedSteps.length} active step${assignedSteps.length !== 1 ? 's' : ''} assigned to ${selectedEmployee.name}`
                    : `No active steps assigned to ${selectedEmployee.name}`
                  : 'Select an employee above to see their assigned work from Process Monitoring'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Active badge */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700/50">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse inline-block" />
              Active
            </span>

            {/* Export button */}
            <button
              onClick={exportCSV}
              disabled={!assignedSteps.length}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 text-white disabled:text-slate-400 dark:disabled:text-slate-500 transition-colors shadow-sm disabled:cursor-not-allowed"
              title="Export work list to CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export to Excel
            </button>

            {/* Expand/collapse */}
            <button
              onClick={() => setWorkExpanded(v => !v)}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${workExpanded ? '' : '-rotate-90'}`} />
            </button>
          </div>
        </div>

        {workExpanded && (
          <>
            {!selectedEmpId ? (
              <Empty icon={Users} text="Select an employee to view their assigned tasks" />
            ) : pmLoading ? (
              <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading process data…</span>
              </div>
            ) : assignedSteps.length === 0 ? (
              <Empty icon={CheckCircle2} text={`No active steps assigned to ${selectedEmployee?.name}`} color="text-emerald-400" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-slate-100 dark:border-slate-700">
                      <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Request #</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Device / Customer</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Step</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Leg</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Machine</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Started</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Deadline</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {assignedSteps.map((step, idx) => (
                      <tr
                        key={`${step.request_id}-${step.id}-${idx}`}
                        className="hover:bg-orange-50/60 dark:hover:bg-orange-900/10 transition-colors group"
                      >
                        <td className="px-4 py-3">
                          <Link
                            to={`/requests/${step.request_id}`}
                            className="font-mono font-bold text-blue-700 dark:text-blue-400 hover:underline text-sm"
                          >
                            {step.request_number}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-slate-700 dark:text-slate-200 font-medium truncate max-w-[140px]">{step.device_name || '—'}</p>
                          <p className="text-xs text-slate-400 truncate">{step.customer || ''}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-700 dark:text-slate-200">{step.step_name}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                          {step.leg != null ? `Leg ${step.leg}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill status={step.status} />
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                          {step.machine_no || '—'}{step.rack_no ? ` / ${step.rack_no}` : ''}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 opacity-60 flex-shrink-0" />
                            {fmtTime(step.started_at)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                          {step.deadline
                            ? <span className="text-violet-600 dark:text-violet-400 font-semibold">{step.deadline}</span>
                            : <span className="text-slate-400">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </SectionCard>

      {/* ── DELAYED / ON HOLD / UPCOMING ────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Delayed */}
          <SectionCard className="flex flex-col border-red-200 dark:border-red-700/50">
            <div className="px-5 py-4 border-b border-red-100 dark:border-red-800/30 flex items-center justify-between">
              <h3 className="font-heading font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm">
                <div className="w-6 h-6 rounded-md bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                </div>
                Delayed
                {stats.delayed_requests > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white">{stats.delayed_requests}</span>
                )}
              </h3>
              <Link to="/requests?status=delayed" className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-0.5">
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="flex-1 divide-y divide-slate-50 dark:divide-slate-700/50">
              {!stats.delayed_requests_list?.length ? (
                <Empty icon={CheckCircle2} text="No delayed requests" color="text-emerald-400" />
              ) : stats.delayed_requests_list.slice(0, 5).map(item => (
                <Link key={item.id} to={`/requests/${item.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors gap-3">
                  <div className="min-w-0">
                    <p className="font-mono font-bold text-blue-700 dark:text-blue-400 text-sm">{item.request_number}</p>
                    <p className="text-xs text-slate-400 truncate">{item.device_name || '—'}</p>
                  </div>
                  <p className="text-xs text-red-500 font-semibold whitespace-nowrap">Due: {item.deadline}</p>
                </Link>
              ))}
            </div>
          </SectionCard>

          {/* On Hold */}
          <SectionCard className="flex flex-col border-orange-200 dark:border-orange-700/50">
            <div className="px-5 py-4 border-b border-orange-100 dark:border-orange-800/30 flex items-center justify-between">
              <h3 className="font-heading font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm">
                <div className="w-6 h-6 rounded-md bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
                  <PauseCircle className="w-3.5 h-3.5 text-orange-500" />
                </div>
                On Hold
                {stats.hold_requests_list?.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-500 text-white">{stats.hold_requests_list.length}</span>
                )}
              </h3>
              <Link to="/requests" className="text-xs text-orange-500 hover:text-orange-700 font-semibold flex items-center gap-0.5">
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="flex-1 divide-y divide-slate-50 dark:divide-slate-700/50">
              {!stats.hold_requests_list?.length ? (
                <Empty icon={CheckCircle2} text="No requests on hold" color="text-emerald-400" />
              ) : stats.hold_requests_list.slice(0, 5).map(item => (
                <Link key={item.id} to={`/requests/${item.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors gap-3">
                  <div className="min-w-0">
                    <p className="font-mono font-bold text-blue-700 dark:text-blue-400 text-sm">{item.request_number}</p>
                    <p className="text-xs text-slate-400 truncate">{item.device_name || '—'}</p>
                    {item.hold_steps && (
                      <p className="text-xs text-orange-500 truncate mt-0.5">{item.hold_steps}</p>
                    )}
                  </div>
                  {item.deadline && (
                    <p className="text-xs text-slate-400 whitespace-nowrap">Due: {item.deadline}</p>
                  )}
                </Link>
              ))}
            </div>
          </SectionCard>

          {/* Upcoming Deadlines */}
          <SectionCard className="flex flex-col border-violet-200 dark:border-violet-700/50">
            <div className="px-5 py-4 border-b border-violet-100 dark:border-violet-800/30 flex items-center justify-between">
              <h3 className="font-heading font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm">
                <div className="w-6 h-6 rounded-md bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                  <Timer className="w-3.5 h-3.5 text-violet-500" />
                </div>
                Upcoming Deadlines
                {stats.upcoming_deadline_requests > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-violet-500 text-white">{stats.upcoming_deadline_requests}</span>
                )}
              </h3>
              <Link to="/requests?status=upcoming" className="text-xs text-violet-500 hover:text-violet-700 font-semibold flex items-center gap-0.5">
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="flex-1 divide-y divide-slate-50 dark:divide-slate-700/50">
              {!stats.upcoming_deadline_list?.length ? (
                <Empty icon={Calendar} text="No upcoming deadlines" />
              ) : stats.upcoming_deadline_list.slice(0, 5).map(item => (
                <Link key={item.id} to={`/requests/${item.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-colors gap-3">
                  <div className="min-w-0">
                    <p className="font-mono font-bold text-blue-700 dark:text-blue-400 text-sm">{item.request_number}</p>
                    <p className="text-xs text-slate-400 truncate">{item.device_name || '—'}</p>
                  </div>
                  <p className="text-xs text-violet-600 dark:text-violet-400 font-semibold whitespace-nowrap">Due: {item.deadline}</p>
                </Link>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── RECENT ACTIVITY + NOTICES ────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Recent Activity */}
          <SectionCard>
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-heading font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm">
                <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                  <Activity className="w-3.5 h-3.5 text-slate-500" />
                </div>
                Recent Activity
              </h3>
              <Link to="/requests" className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-0.5">
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {!stats.recent_activity?.length ? (
                <Empty icon={ClipboardList} text="No recent activity" />
              ) : stats.recent_activity.slice(0, 7).map(item => (
                <Link key={item.id} to={`/requests/${item.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors gap-3">
                  <div className="min-w-0">
                    <p className="font-mono font-bold text-blue-700 dark:text-blue-400 text-sm">{item.request_number}</p>
                    <p className="text-xs text-slate-400 truncate">{item.device_name || item.customer || '—'}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                      item.status === 'completed' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' :
                      item.status === 'testing' || item.status === 'in_progress' ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800' :
                      'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                    }`}>
                      {item.status?.replace('_', ' ')}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                  </div>
                </Link>
              ))}
            </div>
          </SectionCard>

          {/* Notices Board */}
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/15 dark:to-amber-950/10 border border-amber-200 dark:border-amber-700/40 rounded-2xl shadow-sm flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-amber-200 dark:border-amber-700/40 flex items-center justify-between">
              <h3 className="font-heading font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-2 text-sm">
                <div className="w-6 h-6 rounded-md bg-amber-200/60 dark:bg-amber-900/60 flex items-center justify-center">
                  <MessageSquarePlus className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                Notices Board
                {stats.noticed_requests_list?.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">{stats.noticed_requests_list.length}</span>
                )}
              </h3>
              <Link to="/requests" className="text-xs text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-0.5">
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-amber-100 dark:divide-amber-800/30 flex-1 overflow-y-auto max-h-72">
              {!stats.noticed_requests_list?.length ? (
                <Empty icon={MessageSquarePlus} text="No active notices" color="text-amber-400" />
              ) : stats.noticed_requests_list.map(item => (
                <Link key={item.id} to={`/requests/${item.id}`}
                  className="flex items-start justify-between px-5 py-3 hover:bg-amber-100/60 dark:hover:bg-amber-800/20 transition-colors gap-3">
                  <div className="min-w-0">
                    <p className="font-mono font-bold text-blue-700 dark:text-blue-400 text-sm">{item.request_number}</p>
                    <p className="text-xs text-amber-600/70 dark:text-amber-400/70 truncate mb-1">{item.device_name || item.customer || ''}</p>
                    <div className="flex items-start gap-1">
                      <MessageSquarePlus className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-amber-800 dark:text-amber-300/80 line-clamp-2">{item.note}</span>
                    </div>
                  </div>
                  {item.deadline && (
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold whitespace-nowrap">{item.deadline}</p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
