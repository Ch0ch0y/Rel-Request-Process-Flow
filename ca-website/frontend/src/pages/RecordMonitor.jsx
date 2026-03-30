import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Search, Loader2, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';

export default function RecordMonitor() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/api/records').then(r => setRecords(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    return !q || r.ca_number?.toLowerCase().includes(q) || r.title?.toLowerCase().includes(q) || r.submitter_name?.toLowerCase().includes(q);
  });

  const fmt = (d) => d ? new Date(d).toLocaleDateString() : '—';
  const completedSteps = (steps) => steps?.filter(s => s.status === 'completed').length ?? 0;

  return (
    <div className="space-y-5 stagger-children">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white font-heading">Record Monitor</h1>
        <p className="text-sm text-slate-500 mt-0.5">Archive of completed and discontinued CA requests</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search records…"
          className="w-full pl-9 pr-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-violet-500 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500 text-sm">{search ? 'No matching records' : 'No records yet'}</div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">CA #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">Submitter</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden lg:table-cell">Steps Done</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden lg:table-cell">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filtered.map(r => (
                <tr key={r.id} onClick={() => navigate(`/requests/${r.id}`)}
                  className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-mono text-violet-600 dark:text-violet-400 font-medium text-xs">{r.ca_number}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 dark:text-white truncate max-w-[160px]">{r.title}</div>
                    {r.sample_description && <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[160px]">{r.sample_description}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden md:table-cell">{r.submitter_name}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-slate-500 dark:text-slate-400">{completedSteps(r.steps)}/8</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs hidden lg:table-cell">
                    {r.status === 'completed' ? fmt(r.completed_at) : fmt(r.discontinued_at)}
                  </td>
                  <td className="px-4 py-3">
                    {r.status === 'completed' ? (
                      <span className="flex items-center gap-1 text-emerald-400 text-xs"><CheckCircle2 className="w-3.5 h-3.5" /> Completed</span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-400 text-xs"><XCircle className="w-3.5 h-3.5" /> Discontinued</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600"><ChevronRight className="w-4 h-4" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
