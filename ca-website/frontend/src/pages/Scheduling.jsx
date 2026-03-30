import { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Plus, Loader2, Pencil, Trash2, X } from 'lucide-react';

const STATUS_STYLE = {
  scheduled:   'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800',
  in_progress: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  completed:   'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  cancelled:   'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
};

const CA_STEPS = [
  'Sample Receipt & Logging', 'Visual Inspection', 'X-Ray Analysis',
  'Decapsulation', 'SEM / Optical Imaging', 'Cross-Section Analysis',
  'EDX / Chemical Analysis', 'Report Generation',
];

const EMPTY_FORM = {
  request_id: '', step_name: '', analyst_id: '', scheduled_date: '', due_date: '', notes: '', status: 'scheduled',
};

export default function Scheduling() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [requests, setRequests] = useState([]);
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]   = useState(null);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);

  const canEdit = ['Admin', 'REL Engineer', 'Planner'].includes(user?.role);

  const fetchAll = () => {
    setLoading(true);
    Promise.all([api.get('/api/schedule'), api.get('/api/requests'), api.get('/api/users')])
      .then(([s, r, u]) => { setEntries(s.data); setRequests(r.data); setUsers(u.data); })
      .catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { fetchAll(); }, []);

  const openCreate = () => { setEditId(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit   = (e) => {
    setEditId(e.id);
    setForm({
      request_id: e.request_id, step_name: e.step_name || '', analyst_id: e.analyst_id || '',
      scheduled_date: e.scheduled_date?.slice(0, 10) || '', due_date: e.due_date?.slice(0, 10) || '',
      notes: e.notes || '', status: e.status,
    });
    setShowForm(true);
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setSaving(true);
    try {
      if (editId) { await api.patch(`/api/schedule/${editId}`, form); }
      else        { await api.post('/api/schedule', form); }
      setShowForm(false); fetchAll();
    } catch (e) { alert(e.response?.data?.detail || 'Error'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this schedule entry?')) return;
    await api.delete(`/api/schedule/${id}`).catch(console.error);
    fetchAll();
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString() : '—';
  const activeRequests = requests.filter(r => ['pending','in_progress'].includes(r.status));

  return (
    <div className="space-y-5 stagger-children">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white font-heading">Scheduling</h1>
          <p className="text-sm text-slate-500 mt-0.5">{entries.length} schedule entr{entries.length !== 1 ? 'ies' : 'y'}</p>
        </div>
        {canEdit && (
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium shadow-lg shadow-violet-600/20">
            <Plus className="w-4 h-4" /> Add Schedule
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-violet-500 animate-spin" /></div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-slate-500 text-sm">No schedule entries yet</div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                {['CA #', 'Step', 'Analyst', 'Scheduled', 'Due', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {entries.map(e => (
                <tr key={e.id} className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <td className="px-4 py-3 font-mono text-violet-600 dark:text-violet-400 text-xs font-medium">{e.ca_number || `REQ-${e.request_id}`}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{e.step_name || '—'}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{e.analyst_name || '—'}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{fmt(e.scheduled_date)}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{fmt(e.due_date)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_STYLE[e.status] || 'text-slate-400 border-slate-700'}`}>
                      {e.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {canEdit && (
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(e)} className="text-slate-500 hover:text-violet-400 transition-colors"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(e.id)} className="text-slate-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900">
              <h3 className="font-semibold text-slate-900 dark:text-white">{editId ? 'Edit Schedule' : 'Add Schedule'}</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-slate-500 hover:text-white" /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">CA Request *</label>
                <select required value={form.request_id} onChange={e => setForm(p => ({ ...p, request_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20">
                  <option value="">— Select Request —</option>
                  {activeRequests.map(r => <option key={r.id} value={r.id}>{r.ca_number} — {r.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Step Name</label>
                <select value={form.step_name} onChange={e => setForm(p => ({ ...p, step_name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20">
                  <option value="">— Any Step —</option>
                  {CA_STEPS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Analyst</label>
                <select value={form.analyst_id} onChange={e => setForm(p => ({ ...p, analyst_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20">
                  <option value="">— Select Analyst —</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                </select>
              </div>
              {[['scheduled_date','Scheduled Date'],['due_date','Due Date']].map(([k,l]) => (
                <div key={k}>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{l}</label>
                  <input type="date" value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20" />
                </div>
              ))}
              {editId && (
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20">
                    {['scheduled','in_progress','completed','cancelled'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Notes</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors">Cancel</button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? 'Save' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
