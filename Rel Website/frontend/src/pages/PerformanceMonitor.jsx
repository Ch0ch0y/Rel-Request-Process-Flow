import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import {
  BarChart3, RefreshCw, Loader2, AlertTriangle, Users, TrendingUp, Calendar, Award
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts';

const PERIOD_OPTIONS = [
  { value: 7, label: 'Last 7 Days' },
  { value: 14, label: 'Last 14 Days' },
  { value: 30, label: 'Last 30 Days' },
  { value: 60, label: 'Last 60 Days' },
  { value: 90, label: 'Last 90 Days' },
];

const EMPLOYEE_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
  '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4',
  '#84cc16', '#e879f9', '#22d3ee', '#a3e635', '#fb923c',
  '#818cf8', '#f472b6', '#fbbf24', '#34d399', '#60a5fa',
];

function StatCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
          <p className="text-3xl font-bold mt-0.5">{value}</p>
          {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
        </div>
        <div className="opacity-30"><Icon className="w-10 h-10" /></div>
      </div>
    </div>
  );
}

function BarViz({ value, max, color = '#2563eb' }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5">
      <div className="h-2.5 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function PerformanceMonitor() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.getEmployeePerformance(days);
      setData(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const totalSteps = data.reduce((s, d) => s + d.steps_completed, 0);
  const totalRequests = data.reduce((s, d) => s + d.requests_touched, 0);
  const maxSteps = data.length > 0 ? Math.max(...data.map(d => d.steps_completed)) : 0;
  const maxPerDay = data.length > 0 ? Math.max(...data.map(d => d.steps_per_day)) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/20">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Performance Monitor</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Employee productivity · steps completed · daily rate</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={days} onChange={e => setDays(Number(e.target.value))}
            className="border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs focus:outline-none focus:border-blue-500">
            {PERIOD_OPTIONS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Employees" value={data.length} sub="active in period" icon={Users}
          color="bg-blue-600 text-white border-blue-700 shadow-md shadow-blue-600/20" />
        <StatCard label="Total Steps" value={totalSteps} sub="completed" icon={TrendingUp}
          color="bg-emerald-600 text-white border-emerald-700 shadow-md shadow-emerald-600/20" />
        <StatCard label="Requests" value={totalRequests} sub="touched" icon={Calendar}
          color="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700" />
        <StatCard label="Top Rate" value={maxPerDay} sub="steps/day" icon={Award}
          color="bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20" />
      </div>

      {/* Charts */}
      {!loading && !error && data.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Bar Chart - Steps Completed */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-violet-500" /> Steps Completed per Employee
            </h3>
            <ResponsiveContainer width="100%" height={Math.max(280, data.length * 36)}>
              <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis dataKey="employee_name" type="category" width={120}
                  tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#e2e8f0', fontWeight: 600 }}
                  itemStyle={{ color: '#94a3b8' }}
                  formatter={(v, name) => [v, name === 'steps_completed' ? 'Steps' : name]}
                  labelFormatter={l => l}
                />
                <Bar dataKey="steps_completed" radius={[0, 6, 6, 0]} barSize={22}>
                  {data.map((_, i) => (
                    <Cell key={i} fill={EMPLOYEE_COLORS[i % EMPLOYEE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart - Steps Distribution */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" /> Steps Distribution
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={data} dataKey="steps_completed" nameKey="employee_name"
                  cx="50%" cy="50%" outerRadius={100} innerRadius={50}
                  paddingAngle={2} label={({ name, percent }) => `${name.split(',')[0]} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#94a3b8' }}
                  style={{ fontSize: 10 }}>
                  {data.map((_, i) => (
                    <Cell key={i} fill={EMPLOYEE_COLORS[i % EMPLOYEE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#e2e8f0' }}
                  formatter={(v, name) => [`${v} steps`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3 justify-center">
              {data.map((emp, i) => (
                <div key={emp.operator_id} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: EMPLOYEE_COLORS[i % EMPLOYEE_COLORS.length] }} />
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">{emp.employee_name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading…</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20 gap-2 text-red-500">
              <AlertTriangle className="w-5 h-5" /><span className="text-sm">{error}</span>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Users className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No performance data for this period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Employee</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Steps Completed</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Steps / Day</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active Days</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Requests</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 min-w-[200px]">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {data.map((emp, idx) => (
                  <tr key={emp.operator_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: EMPLOYEE_COLORS[idx % EMPLOYEE_COLORS.length] }} />
                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-200">{emp.employee_name}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">ID: {emp.operator_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-lg font-bold text-slate-800 dark:text-slate-200">{emp.steps_completed}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-semibold ${emp.steps_per_day >= maxPerDay ? 'text-emerald-600' : 'text-slate-600 dark:text-slate-400'}`}>
                        {emp.steps_per_day}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{emp.active_days}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{emp.requests_touched}</td>
                    <td className="px-4 py-3">
                      <BarViz value={emp.steps_completed} max={maxSteps} color={EMPLOYEE_COLORS[idx % EMPLOYEE_COLORS.length]} />
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {emp.step_types.slice(0, 4).map(t => (
                          <span key={t} className="inline-block px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-[10px] text-slate-500 dark:text-slate-400 rounded">
                            {t}
                          </span>
                        ))}
                        {emp.step_types.length > 4 && (
                          <span className="text-[10px] text-slate-400">+{emp.step_types.length - 4} more</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
        {!loading && data.length > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {data.length} employee{data.length !== 1 ? 's' : ''} · {totalSteps} total steps in {days} days
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
