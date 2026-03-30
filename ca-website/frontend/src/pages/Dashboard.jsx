import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import {
  ClipboardList, Clock, Microscope, CheckCircle2, XCircle,
  CalendarDays, ChevronRight, Loader2, TrendingUp,
  AlertTriangle, BarChart2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';

const STATUS_STYLE = {
  pending:      'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  in_progress:  'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800',
  completed:    'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  discontinued: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
};
const STATUS_LABEL = {
  pending: 'Pending', in_progress: 'In Progress',
  completed: 'Completed', discontinued: 'Discontinued',
};

const STEP_COLORS = ['bg-violet-500','bg-purple-500','bg-fuchsia-500','bg-pink-500',
  'bg-indigo-500','bg-sky-500','bg-teal-500','bg-emerald-500'];

function StatCard({ icon: Icon, label, value, iconBg, iconColor }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-[0.06] -mr-6 -mt-6 bg-current" />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1 font-heading">{value}</p>
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm border border-slate-700">
        <p className="font-medium">{label}</p>
        <p className="text-slate-300">{payload[0].value} request{payload[0].value !== 1 ? 's' : ''}</p>
      </div>
    );
  }
  return null;
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/api/dashboard').then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
    </div>
  );

  const s = data?.stats || {};
  const activeSteps = data?.active_steps || [];
  const recent = data?.recent_requests || [];
  const upcoming = data?.upcoming_schedule || [];
  const delayed = data?.delayed_requests || [];
  const upcomingDL = data?.upcoming_deadlines || [];
  const compRate = data?.completion_rate || { percent: 0, completed_30d: 0, total_30d: 0 };

  // Fixed 5-bar chart: always show all categories in order
  const statusDist = [
    { status: 'Total',        count: s.total        || 0, color: '#8b5cf6' },
    { status: 'Pending',      count: s.pending      || 0, color: '#f59e0b' },
    { status: 'In Progress',  count: s.in_progress  || 0, color: '#3b82f6' },
    { status: 'Completed',    count: s.completed    || 0, color: '#10b981' },
    { status: 'Discontinued', count: s.discontinued || 0, color: '#ef4444' },
  ];

  const donutData = [
    { value: compRate.percent > 0 ? compRate.percent : 0 },
    { value: compRate.percent > 0 ? 100 - compRate.percent : 100 },
  ];

  return (
    <div className="space-y-6 stagger-children">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white font-heading">Home Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Construction Analysis â€” overview</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        <StatCard icon={ClipboardList} label="Total"        value={s.total || 0}        iconBg="bg-violet-100 dark:bg-violet-900/40"  iconColor="text-violet-600 dark:text-violet-400" />
        <StatCard icon={Clock}        label="Pending"       value={s.pending || 0}       iconBg="bg-yellow-100 dark:bg-yellow-900/40"  iconColor="text-yellow-600 dark:text-yellow-400" />
        <StatCard icon={Microscope}   label="In Progress"   value={s.in_progress || 0}   iconBg="bg-blue-100 dark:bg-blue-900/40"      iconColor="text-blue-600 dark:text-blue-400" />
        <StatCard icon={CheckCircle2} label="Completed"     value={s.completed || 0}     iconBg="bg-emerald-100 dark:bg-emerald-900/40" iconColor="text-emerald-600 dark:text-emerald-400" />
        <StatCard icon={XCircle}      label="Discontinued"  value={s.discontinued || 0}  iconBg="bg-red-100 dark:bg-red-900/40"        iconColor="text-red-600 dark:text-red-400" />
      </div>

      {/* Status Distribution + Completion Rate */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Status Distribution Bar Chart */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-violet-500" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Status Distribution</h2>
          </div>
          {statusDist.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={statusDist} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="status" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {statusDist.map((entry, i) => (
                    <Cell key={i} fill={entry.color || '#8b5cf6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Completion Rate Donut */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 mb-3 self-start w-full">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Completion Rate</h2>
          </div>
          <div className="relative flex items-center justify-center">
            <PieChart width={140} height={140}>
              <Pie
                data={donutData}
                cx={65} cy={65}
                innerRadius={46} outerRadius={62}
                startAngle={90} endAngle={-270}
                dataKey="value"
                strokeWidth={0}
              >
                <Cell fill="#10b981" />
                <Cell fill="#e2e8f0" />
              </Pie>
            </PieChart>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-slate-900 dark:text-white leading-none">{compRate.percent}%</span>
            </div>
          </div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-2">
            {compRate.completed_30d} of {compRate.total_30d} completed
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Last 30 days</p>
          <div className="w-full mt-3 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${compRate.percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Steps Â· Recent Requests Â· Upcoming Schedule */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Active Steps */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Steps In Progress</h2>
            {activeSteps.length > 0 && (
              <span className="text-xs text-slate-400 dark:text-slate-500">{activeSteps.length} active</span>
            )}
          </div>
          {activeSteps.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">None active</p>
          ) : (
            <div className="space-y-1 max-h-72 overflow-y-auto pr-0.5">
              {activeSteps.map((item, i) => (
                <button
                  key={i}
                  onClick={() => navigate(`/requests/${item.request_id}/steps`)}
                  className="w-full flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left"
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${STEP_COLORS[i % STEP_COLORS.length]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-violet-600 dark:text-violet-400 font-mono">{item.ca_number}</span>
                      {item.leg_names.length > 0 && item.leg_names.map(leg => (
                        <span key={leg} className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                          {leg}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-slate-900 dark:text-white truncate mt-0.5">{item.step_name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.title}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-1" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Recent Requests */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Recent CA Requests</h2>
            <button onClick={() => navigate('/requests')} className="text-xs text-violet-600 dark:text-violet-400 hover:underline">View all</button>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">No requests yet</p>
          ) : recent.map(r => (
            <button key={r.id} onClick={() => navigate(`/requests/${r.id}`)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left mb-1">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-violet-600 dark:text-violet-400 font-mono">{r.ca_number}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{r.title}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${STATUS_STYLE[r.status] || 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'}`}>
                {STATUS_LABEL[r.status] || r.status}
              </span>
            </button>
          ))}
        </div>

        {/* Upcoming Schedule */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Upcoming Schedule</h2>
            <button onClick={() => navigate('/scheduling')} className="text-xs text-violet-600 dark:text-violet-400 hover:underline">View all</button>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">No scheduled items</p>
          ) : upcoming.map(u => (
            <div key={u.id} className="flex items-start gap-3 p-2.5 rounded-lg mb-1">
              <CalendarDays className="w-4 h-4 text-violet-500 dark:text-violet-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{u.step_name || u.request_title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{u.ca_number} Â· {u.scheduled_date ? new Date(u.scheduled_date).toLocaleDateString() : 'â€”'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delayed + Upcoming Deadlines */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Delayed Requests */}
        <div className="rounded-xl border border-red-200 dark:border-red-800/60 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Delayed Requests</h2>
              {delayed.length > 0 && (
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
                  {delayed.length}
                </span>
              )}
            </div>
            <button onClick={() => navigate('/requests')} className="text-xs text-red-500 hover:underline">View All â†’</button>
          </div>
          {delayed.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No delayed requests</p>
          ) : (
            <div className="space-y-2">
              {delayed.map(r => (
                <button key={r.id} onClick={() => navigate(`/requests/${r.id}`)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left border border-transparent hover:border-red-200 dark:hover:border-red-800">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-violet-600 dark:text-violet-400 font-mono">{r.ca_number}</span>
                      {(r.device || r.lot_number) && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {r.device || r.lot_number}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{r.title}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold text-red-500">{r.due_date ? new Date(r.due_date).toLocaleDateString() : 'â€”'}</p>
                    <p className="text-[10px] text-red-400">Overdue</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Deadline Requests */}
        <div className="rounded-xl border border-violet-200 dark:border-violet-800/60 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-violet-500" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Upcoming Deadlines</h2>
              {upcomingDL.length > 0 && (
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400">
                  {upcomingDL.length}
                </span>
              )}
            </div>
            <button onClick={() => navigate('/scheduling')} className="text-xs text-violet-500 hover:underline">View All â†’</button>
          </div>
          {upcomingDL.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No upcoming deadlines</p>
          ) : (
            <div className="space-y-2">
              {upcomingDL.map(r => (
                <button key={r.id} onClick={() => navigate(`/requests/${r.id}`)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors text-left border border-transparent hover:border-violet-200 dark:hover:border-violet-800">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-violet-600 dark:text-violet-400 font-mono">{r.ca_number}</span>
                      {r.purpose && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                          {r.purpose}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{r.title}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold text-violet-600 dark:text-violet-400">{r.due_date ? new Date(r.due_date).toLocaleDateString() : 'â€”'}</p>
                    <p className="text-[10px] text-violet-400 dark:text-violet-500">Due soon</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

