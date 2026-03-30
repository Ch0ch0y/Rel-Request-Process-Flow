import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import {
  ShieldCheck, ThumbsUp, ThumbsDown, ClipboardList,
  Eye, ExternalLink, RefreshCw, TableProperties,
} from 'lucide-react';

const STATUS_COLORS = {
  approval: 'bg-violet-100 text-violet-700 border-violet-200',
  review:   'bg-blue-100 text-blue-700 border-blue-200',
  testing:  'bg-orange-100 text-orange-700 border-orange-200',
  analysis: 'bg-teal-100 text-teal-700 border-teal-200',
};
const STATUS_LABELS = {
  approval: 'Approval', review: 'Review', testing: 'Testing', analysis: 'Analysis',
};

const ML_COLS = [
  { key: 'ww',              label: 'WW' },
  { key: 'date_received',   label: 'Date Received at RelLab' },
  { key: 'rrs_no',          label: 'RRS No.' },
  { key: 'purpose',         label: 'Purpose' },
  { key: 'qual_type',       label: 'Qual Type' },
  { key: 'customer',        label: 'Customer' },
  { key: 'pkg_type',        label: 'Pkg. Type' },
  { key: 'lc_bc',           label: 'L/C B/C' },
  { key: 'rr_agile_no',     label: 'RR/Agile No.' },
  { key: 'test_level',      label: 'Test Level' },
  { key: 'qty',             label: 'Qty' },
  { key: 'num_days',        label: '# of Days' },
  { key: 'num_legs',        label: '# of Legs' },
  { key: 'est_start',       label: 'Est. Date/Time of Start' },
  { key: 'est_completion',  label: 'Est. Date of Completion' },
  { key: 'recommit',        label: 'Re-Commit' },
  { key: 'planner_remarks', label: 'Planner Remarks' },
];

// Keys the planner can edit inline (all others are read-only from request data)
const EDITABLE_KEYS = new Set(['test_level','qty','num_days','num_legs','est_start','est_completion','recommit','planner_remarks']);
// Maps frontend row key → backend PATCH body key
const CELL_FIELD_MAP = { qty: 'ml_qty', est_start: 'planner_est_start', est_completion: 'planner_est_end', planner_remarks: 'planner_note', test_level: 'test_level' };

const ML_STATUS_COLORS = {
  approval:     'bg-violet-100 text-violet-700 border-violet-200',
  review:       'bg-blue-100 text-blue-700 border-blue-200',
  testing:      'bg-orange-100 text-orange-700 border-orange-200',
  analysis:     'bg-teal-100 text-teal-700 border-teal-200',
  completed:    'bg-emerald-100 text-emerald-700 border-emerald-200',
  discontinued: 'bg-slate-100 text-slate-500 border-slate-200',
};

export default function ApprovalPage() {
  const { hasRole } = useAuth();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [actionMsg, setActionMsg] = useState({});

  const [masterlist, setMasterlist] = useState([]);
  const [mlLoading, setMlLoading] = useState(true);
  const [mlError, setMlError] = useState('');

  // Inline cell editing state
  const [editingCell, setEditingCell] = useState({ rowId: null, colKey: null, value: '', original: '' });
  const skipBlurRef = useRef(false);

  const canApprove = hasRole('Admin', 'Planner');

  const load = () => {
    setLoading(true);
    api.getRequests({ status: 'approval' })
      .then(res => setRequests(Array.isArray(res) ? res : (res.requests || [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  const loadMasterlist = () => {
    setMlLoading(true);
    setMlError('');
    api.getMasterlistRequests()
      .then(data => setMasterlist(Array.isArray(data) ? data : []))
      .catch(e => setMlError(e.message))
      .finally(() => setMlLoading(false));
  };

  useEffect(() => { load(); loadMasterlist(); }, []);

  const handleAction = async (id, action) => {
    setActionLoading(prev => ({ ...prev, [id]: action }));
    setActionMsg(prev => ({ ...prev, [id]: '' }));
    try {
      let res;
      if (action === 'approve') res = await api.approveRequest(id);
      else if (action === 'reject') res = await api.rejectRequest(id);
      setActionMsg(prev => ({ ...prev, [id]: res?.message || 'Done' }));
      setTimeout(() => {
        setActionMsg(prev => ({ ...prev, [id]: '' }));
        load();
      }, 1500);
    } catch (e) {
      setActionMsg(prev => ({ ...prev, [id]: 'Error: ' + e.message }));
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: null }));
    }
  };

  const startCellEdit = (rowId, colKey, val) => {
    if (!canApprove || !EDITABLE_KEYS.has(colKey)) return;
    const v = String(val || '');
    setEditingCell({ rowId, colKey, value: v, original: v });
  };

  const cancelCellEdit = () => {
    skipBlurRef.current = true;
    setEditingCell({ rowId: null, colKey: null, value: '', original: '' });
  };

  const commitCell = async (rowId, colKey, value, original) => {
    if (skipBlurRef.current) { skipBlurRef.current = false; return; }
    setEditingCell({ rowId: null, colKey: null, value: '', original: '' });
    if (value === original) return;
    const backendKey = CELL_FIELD_MAP[colKey] || colKey;
    setMasterlist(prev => prev.map(r => r.id === rowId ? { ...r, [colKey]: value } : r));
    try {
      await api.updateRequestMasterlistFields(rowId, { [backendKey]: value });
    } catch {
      setMasterlist(prev => prev.map(r => r.id === rowId ? { ...r, [colKey]: original } : r));
    }
  };

  if (!canApprove) {
    return (
      <div className="p-8 text-center">
        <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">Access restricted to Admin and Planner.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 stagger-children">

      {/* Section 1: Approval Queue */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-heading font-bold text-slate-900 dark:text-white tracking-tight">
                Approval Queue
              </h1>
              {!loading && requests.length > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700">
                  {requests.length} pending
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {loading ? 'Loading...' : requests.length === 0
                ? 'No requests pending approval'
                : requests.length + ' request' + (requests.length !== 1 ? 's' : '') + ' waiting for management decision'}
            </p>
          </div>
          <button onClick={load}
            className="ml-auto px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">{error}</div>
      ) : requests.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-12 text-center">
          <ClipboardList className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">No requests pending approval</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">All caught up!</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-violet-500" />
            <h3 className="font-heading font-semibold text-slate-800 dark:text-slate-100">Pending Approval</h3>
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">{requests.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30">
                  {['Request #','Classification','Device','Customer','Lot No.','Submitted By','Date','Status','Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {requests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="px-4 py-3">
                      <Link to={'/requests/' + req.id} className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                        {req.request_number}<ExternalLink className="w-3 h-3 opacity-60" />
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{req.classification || ''}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">{req.device_name || ''}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{req.customer || ''}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{req.lot_no || ''}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{req.created_by_username || ''}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{req.created_at ? new Date(req.created_at).toLocaleDateString() : ''}</td>
                    <td className="px-4 py-3">
                      <span className={'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ' + (STATUS_COLORS[req.status] || 'bg-slate-100 text-slate-600 border-slate-200')}>
                        {STATUS_LABELS[req.status] || req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {actionMsg[req.id] ? (
                          <span className={'text-xs font-medium ' + (actionMsg[req.id].startsWith('Error') ? 'text-red-600' : 'text-emerald-600')}>
                            {actionMsg[req.id]}
                          </span>
                        ) : (
                          <>
                            <button onClick={() => handleAction(req.id, 'approve')} disabled={!!actionLoading[req.id]}
                              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors">
                              {actionLoading[req.id] === 'approve' ? <span className="w-3 h-3 border border-white/50 border-t-white rounded-full animate-spin" /> : <ThumbsUp className="w-3 h-3" />}
                              Approve
                            </button>
                            <button onClick={() => handleAction(req.id, 'reject')} disabled={!!actionLoading[req.id]}
                              className="flex items-center gap-1 px-2.5 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors">
                              {actionLoading[req.id] === 'reject' ? <span className="w-3 h-3 border border-white/50 border-t-white rounded-full animate-spin" /> : <ThumbsDown className="w-3 h-3" />}
                              Reject
                            </button>
                            <Link to={'/requests/' + req.id}
                              className="flex items-center gap-1 px-2.5 py-1 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-xs font-medium transition-colors">
                              <Eye className="w-3 h-3" /> View
                            </Link>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 2: Masterlist */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex flex-wrap items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <TableProperties className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-heading font-bold text-slate-900 dark:text-white text-base leading-tight">Masterlist</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {masterlist.length > 0 ? masterlist.length + ' RELDMS request(s)' : 'No requests found'}
              {canApprove && masterlist.length > 0 && <span className="ml-2 text-blue-500">· Click a cell to edit</span>}
            </p>
          </div>
          <button onClick={loadMasterlist} title="Refresh"
            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <RefreshCw className={'w-4 h-4 ' + (mlLoading ? 'animate-spin' : '')} />
          </button>
        </div>

        {mlLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
          </div>
        ) : mlError ? (
          <div className="m-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 text-sm">{mlError}</div>
        ) : masterlist.length === 0 ? (
          <div className="py-14 text-center">
            <TableProperties className="w-10 h-10 text-slate-200 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">No RELDMS requests found</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">All existing RELDMS requests will appear here automatically.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-blue-600">
                  <th className="border border-blue-500 px-2 py-2 text-left text-[10px] font-bold text-white uppercase tracking-wide whitespace-nowrap">Status</th>
                  {ML_COLS.map(col => (
                    <th key={col.key} className="border border-blue-500 px-2 py-2 text-left text-[10px] font-bold text-white uppercase tracking-wide whitespace-nowrap">
                      {col.label}{canApprove && EDITABLE_KEYS.has(col.key) && <span className="ml-1 opacity-60 font-normal normal-case">✎</span>}
                    </th>
                  ))}
                  <th className="border border-blue-500 px-2 py-2 text-center text-[10px] font-bold text-white uppercase tracking-wide whitespace-nowrap">Link</th>
                </tr>
              </thead>
              <tbody>
                {masterlist.map((row, ri) => (
                  <tr key={row.id} className={ri % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/80 dark:bg-slate-800/50'}>
                    <td className="border border-slate-200 dark:border-slate-700 px-2 py-1 whitespace-nowrap">
                      {row.status && (
                        <span className={'inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ' + (ML_STATUS_COLORS[row.status] || 'bg-slate-100 text-slate-500 border-slate-200')}>
                          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                        </span>
                      )}
                    </td>
                    {ML_COLS.map(col => {
                      const isEditing = editingCell.rowId === row.id && editingCell.colKey === col.key;
                      const isEditable = canApprove && EDITABLE_KEYS.has(col.key);
                      const rawVal = row[col.key] || '';
                      // Format date_received as a readable date string
                      const displayVal = col.key === 'date_received' && rawVal
                        ? (() => { try { return new Date(rawVal).toLocaleDateString(); } catch { return rawVal; } })()
                        : rawVal;
                      return (
                        <td
                          key={col.key}
                          onClick={() => { if (!isEditing) startCellEdit(row.id, col.key, rawVal); }}
                          className={[
                            'border border-slate-200 dark:border-slate-700',
                            isEditing
                              ? 'p-0 outline outline-2 outline-blue-500 bg-white dark:bg-slate-900 relative z-10'
                              : isEditable
                                ? 'px-2 py-1 cursor-text hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                : 'px-2 py-1',
                          ].join(' ')}
                        >
                          {isEditing ? (
                            col.key === 'planner_remarks' ? (
                              <textarea
                                autoFocus
                                rows={2}
                                value={editingCell.value}
                                onChange={e => setEditingCell(prev => ({ ...prev, value: e.target.value }))}
                                onBlur={() => commitCell(row.id, col.key, editingCell.value, editingCell.original)}
                                onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); cancelCellEdit(); } }}
                                className="w-full px-2 py-1 border-none outline-none bg-transparent text-[11px] text-slate-900 dark:text-white resize-none min-w-[150px]"
                              />
                            ) : (
                              <input
                                autoFocus
                                type="text"
                                value={editingCell.value}
                                onChange={e => setEditingCell(prev => ({ ...prev, value: e.target.value }))}
                                onBlur={() => commitCell(row.id, col.key, editingCell.value, editingCell.original)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
                                  if (e.key === 'Escape') { e.preventDefault(); cancelCellEdit(); }
                                }}
                                className="w-full px-2 py-1 border-none outline-none bg-transparent text-[11px] text-slate-900 dark:text-white min-w-[60px]"
                              />
                            )
                          ) : (
                            <span className={'block text-slate-700 dark:text-slate-300 ' + (col.key !== 'planner_remarks' ? 'truncate max-w-[130px]' : 'max-w-[160px]')}>
                              {displayVal || (isEditable ? <span className="text-slate-300 dark:text-slate-600 select-none">—</span> : '')}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="border border-slate-200 dark:border-slate-700 px-2 py-1 whitespace-nowrap text-center">
                      <Link to={'/requests/' + row.id} title="View request"
                        className="inline-flex items-center justify-center text-blue-500 hover:text-blue-700 dark:hover:text-blue-300">
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}