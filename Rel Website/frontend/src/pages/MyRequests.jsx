import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import ProcessTimeline from '../components/ProcessTimeline';
import ImportExcelModal from '../components/ImportExcelModal';
import ImportWordModal from '../components/ImportWordModal';
import ImportWhiskerModal from '../components/ImportWhiskerModal';
import ImportAgileModal from '../components/ImportAgileModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { Search, ChevronRight, Clock, FileText, FileSpreadsheet, Trash2, MessageSquarePlus, Plus } from 'lucide-react';
import CreateRequestModal from '../components/CreateRequestModal';

function StatusBadge({ status }) {
  const map = {
    incoming:      'bg-amber-100 text-amber-700 border-amber-200',
    pending:       'bg-amber-100 text-amber-700 border-amber-200',
    review:        'bg-blue-100 text-blue-700 border-blue-200',
    approval:      'bg-violet-100 text-violet-700 border-violet-200',
    testing:       'bg-orange-100 text-orange-700 border-orange-200',
    in_progress:   'bg-orange-100 text-orange-700 border-orange-200',
    analysis:      'bg-teal-100 text-teal-700 border-teal-200',
    report:        'bg-cyan-100 text-cyan-700 border-cyan-200',
    completed:     'bg-emerald-100 text-emerald-700 border-emerald-200',
    discontinued:  'bg-rose-100 text-rose-700 border-rose-200',
  };
  const labels = {
    incoming: 'Request', pending: 'Request', review: 'Review',
    approval: 'Approval', testing: 'Testing', in_progress: 'Testing',
    analysis: 'Analysis', report: 'Report', completed: 'Completed', discontinued: 'Discontinued',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${map[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {labels[status] || status?.replace('_', ' ')}
    </span>
  );
}

export default function MyRequests() {
  const { user, hasPerm } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [showImportWord, setShowImportWord] = useState(false);
  const [showImportWhisker, setShowImportWhisker] = useState(false);
  const [showImportAgile, setShowImportAgile] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState(''); // '' | 'REL' | 'RMS'
  const getReqType = (r) => r.request_type || (r.request_number?.startsWith('RMS') ? 'RMS' : 'REL');

  const canDeleteReq = (req) => {
    if (!hasPerm('delete_request')) return false;
    if (user?.role === 'Admin') return true;
    const completedSteps = req.steps?.filter(s => s.status === 'completed').length || 0;
    const totalSteps = req.steps?.length || 0;
    const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    return progress === 0;
  };

  const handleDelete = (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.deleteRequest(deleteConfirm);
      loadRequests();
    } catch (err) { alert(err.message); }
    setDeleteConfirm(null);
  };

  const loadRequests = () => {
    setLoading(true);
    setError(null);
    api.getRequests()
      .then(all => {
        const mine = all.filter(r => r.created_by === user?.id && r.status !== 'completed');
        setRequests(mine);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadRequests(); }, [user]);

  const filtered = (() => {
    let list = requests;
    if (typeFilter) list = list.filter(r => getReqType(r) === typeFilter);
    if (statusFilter) {
      if (statusFilter === 'request') list = list.filter(r => r.status === 'incoming' || r.status === 'pending');
      else if (statusFilter === 'testing') list = list.filter(r => r.status === 'testing' || r.status === 'in_progress');
      else list = list.filter(r => r.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        (r.request_number || '').toLowerCase().includes(q) ||
        (r.device_name || '').toLowerCase().includes(q) ||
        (r.customer || '').toLowerCase().includes(q) ||
        (r.lot_no || '').toLowerCase().includes(q) ||
        (r.classification || '').toLowerCase().includes(q) ||
        (r.status || '').toLowerCase().includes(q)
      );
    }
    return list;
  })();

  return (
    <div className="space-y-6 stagger-children">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-5 shadow-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-heading font-bold text-slate-900 dark:text-white tracking-tight">My Requests</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">RELDMS requests you have created.</p>
            </div>
          </div>
          {hasPerm('import_requests') && (
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setShowImport(true)}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3.5 py-2 font-medium text-sm shadow-sm hover:shadow-md transition-all">
                <FileSpreadsheet className="w-4 h-4" /> Import Excel
              </button>
              <button onClick={() => setShowImportWord(true)}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3.5 py-2 font-medium text-sm shadow-sm hover:shadow-md transition-all">
                <FileText className="w-4 h-4" /> Import Word
              </button>
              <button onClick={() => setShowImportWhisker(true)}
                className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg px-3.5 py-2 font-medium text-sm shadow-sm hover:shadow-md transition-all">
                <FileText className="w-4 h-4" /> Import Whisker
              </button>
              <button onClick={() => setShowImportAgile(true)}
                className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-3.5 py-2 font-medium text-sm shadow-sm hover:shadow-md transition-all">
                <FileSpreadsheet className="w-4 h-4" /> Import From Agile
              </button>
            </div>
          )}
          {hasPerm('create_request') && (
            <button onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-3.5 py-2 font-medium text-sm shadow-sm hover:shadow-md transition-all">
              <Plus className="w-4 h-4" /> New Request
            </button>
          )}
        </div>
      </div>

      {/* Search + type filter */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search your requests by REL#, device, customer, lot, classification..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-500
              focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm transition-all"
          />
        </div>
        {/* REL / RMS type filter */}
        <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden">
          <button
            onClick={() => setTypeFilter(f => f === 'REL' ? '' : 'REL')}
            className={`px-3 py-2.5 text-xs font-semibold transition-colors ${typeFilter === 'REL' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700'}`}
            title="Show REL (RR) requests only"
          >REL</button>
          <div className="w-px h-5 bg-slate-200 dark:bg-slate-600" />
          <button
            onClick={() => setTypeFilter(f => f === 'RMS' ? '' : 'RMS')}
            className={`px-3 py-2.5 text-xs font-semibold transition-colors ${typeFilter === 'RMS' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700'}`}
            title="Show RMS requests only"
          >RMS</button>
        </div>
      </div>

      {/* Stats bar */}
      {!loading && !error && (
        <div className="flex items-center gap-2 text-sm flex-wrap">
          {[
            { label: 'Total',        value: '',             match: () => true,                                                              color: 'text-slate-500 dark:text-slate-400',   active: 'bg-slate-100 dark:bg-slate-700 ring-1 ring-slate-300 dark:ring-slate-600' },
            { label: 'Request',      value: 'request',      match: r => r.status === 'incoming' || r.status === 'pending',                  color: 'text-amber-600',                        active: 'bg-amber-50 dark:bg-amber-900/30 ring-1 ring-amber-300' },
            { label: 'Review',       value: 'review',       match: r => r.status === 'review',                                              color: 'text-blue-600',                         active: 'bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-300' },
            { label: 'Approval',     value: 'approval',     match: r => r.status === 'approval',                                            color: 'text-violet-600',                       active: 'bg-violet-50 dark:bg-violet-900/30 ring-1 ring-violet-300' },
            { label: 'Testing',      value: 'testing',      match: r => r.status === 'testing' || r.status === 'in_progress',               color: 'text-orange-600',                       active: 'bg-orange-50 dark:bg-orange-900/30 ring-1 ring-orange-300' },
            { label: 'Analysis',     value: 'analysis',     match: r => r.status === 'analysis',                                            color: 'text-teal-600',                         active: 'bg-teal-50 dark:bg-teal-900/30 ring-1 ring-teal-300' },
            { label: 'Report',       value: 'report',       match: r => r.status === 'report',                                              color: 'text-cyan-600',                         active: 'bg-cyan-50 dark:bg-cyan-900/30 ring-1 ring-cyan-300' },
            { label: 'Discontinued', value: 'discontinued', match: r => r.status === 'discontinued',                                        color: 'text-rose-600',                         active: 'bg-rose-50 dark:bg-rose-900/30 ring-1 ring-rose-300' },
          ].map(({ label, value, match, color, active }) => {
            const count = value === '' ? requests.length : requests.filter(match).length;
            return (
              <button
                key={label}
                onClick={() => setStatusFilter(f => f === value ? '' : value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full transition-all cursor-pointer ${color} ${
                  statusFilter === value ? active : 'hover:bg-slate-100 dark:hover:bg-slate-700/50'
                }`}
              >
                {label}: <span className="font-semibold">{count}</span>
              </button>
            );
          })}
          {statusFilter && statusFilter !== '' && (
            <span className="text-xs text-slate-400 italic ml-1">
              Showing {filtered.length} result{filtered.length !== 1 ? 's' : ''} — click again to clear
            </span>
          )}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 text-lg">
            {search || statusFilter ? 'No matching requests found.' : 'You have not created any requests yet.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden">
          {filtered.map(req => {
            const legCount = req.steps ? new Set(req.steps.map(s => s.leg || 1)).size : 1;
            return (
              <Link
                key={req.id}
                to={`/requests/${req.id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 hover:shadow-[inset_3px_0_0_#3b82f6] dark:hover:shadow-[inset_3px_0_0_#60a5fa] transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <span className="font-mono text-base font-bold text-blue-700 dark:text-blue-400 tracking-tight">{req.original_rr_number || req.request_number}</span>
                    <StatusBadge status={req.status} />
                    {/* Blinking red dot for delayed */}
                    {req.deadline && new Date(req.deadline) < new Date() && req.status !== 'completed' && (
                      <span className="relative flex h-2.5 w-2.5" title="Delayed — past deadline">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                      </span>
                    )}
                    {req.automotive && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">Automotive</span>
                    )}
                    {req.classification && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">{req.classification}</span>
                    )}
                    {legCount > 1 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200">{legCount} LEGs</span>
                    )}
                  </div>
                  {req.original_rr_number && (
                    <p className="font-mono text-xs text-amber-500 dark:text-amber-400 font-semibold mb-0.5">
                      RR# {req.request_number}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
                    {req.device_name && <span>Device: {req.device_name}</span>}
                    {req.customer && <span>Customer: {req.customer}</span>}
                    {req.lot_no && <span>Lot: {req.lot_no}</span>}
                    <span>Created: {new Date(req.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                  </div>
                  {(() => {
                    const activeStep = req.steps?.find(s => s.status === 'in_progress') || req.steps?.find(s => s.status === 'pending');
                    return activeStep ? (
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-700/50">
                          <Clock className="w-3 h-3" />
                          {activeStep.step_name?.includes('Prior') ? 'SAT (Prior)' : activeStep.step_name?.includes('Post') ? 'SAT (Post)' : activeStep.step_name}
                        </span>
                      </div>
                    ) : null;
                  })()}
                  {req.note && (
                    <div className="mt-1.5 flex items-start gap-1.5 px-2 py-1.5 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 max-w-lg">
                      <MessageSquarePlus className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-amber-800 dark:text-amber-300 line-clamp-2 leading-snug">{req.note}</span>
                    </div>
                  )}
                  <div className="mt-2 w-48">
                    <ProcessTimeline steps={req.steps} compact />
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {req.deadline && (
                    <span className="text-xs text-slate-400 dark:text-slate-500">Due: {req.deadline}</span>
                  )}
                  {canDeleteReq(req) && (
                    <button onClick={(e) => handleDelete(req.id, e)}
                      className="p-1.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
      <ImportExcelModal open={showImport} onClose={() => setShowImport(false)} onImported={loadRequests} />
      <ImportWordModal open={showImportWord} onClose={() => setShowImportWord(false)} onImported={loadRequests} />
      <ImportWhiskerModal open={showImportWhisker} onClose={() => setShowImportWhisker(false)} onImported={loadRequests} />
      <ImportAgileModal open={showImportAgile} onClose={() => setShowImportAgile(false)} onImported={loadRequests} />
      <CreateRequestModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={loadRequests} />
      <ConfirmDialog
        open={!!deleteConfirm}
        title="Delete Request"
        message="Are you sure you want to permanently delete this request? All associated steps and data will be lost."
        confirmLabel="Delete Request"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
