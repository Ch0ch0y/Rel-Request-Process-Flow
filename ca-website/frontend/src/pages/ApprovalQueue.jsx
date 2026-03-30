import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import {
  ShieldCheck, ThumbsUp, ThumbsDown, Eye, RefreshCw,
  ClipboardList, ExternalLink,
} from 'lucide-react';

const PRIORITY_STYLE = {
  Critical: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  High:     'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  Normal:   'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600',
  Low:      'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800',
};

export default function ApprovalQueue() {
  const { user } = useAuth();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [actionMsg, setActionMsg] = useState({});
  const [deadlineModal, setDeadlineModal] = useState({ open: false, reqId: null, caNumber: '', value: '' });

  const canApprove = ['Admin', 'REL Engineer', 'Planner'].includes(user?.role);

  const load = () => {
    setLoading(true);
    setError('');
    api.getRequests()
      .then(data => setRequests((Array.isArray(data) ? data : []).filter(r => r.status === 'pending')))
      .catch(e => setError(e.message || 'Failed to load requests'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (id, due_date) => {
    setActionLoading(prev => ({ ...prev, [id]: 'approve' }));
    setActionMsg(prev => ({ ...prev, [id]: '' }));
    try {
      const res = await api.approveRequest(id, due_date);
      setActionMsg(prev => ({ ...prev, [id]: res?.message || 'Approved!' }));
      setTimeout(() => {
        setActionMsg(prev => ({ ...prev, [id]: '' }));
        load();
      }, 1500);
    } catch (e) {
      setActionMsg(prev => ({ ...prev, [id]: 'Error: ' + (e.response?.data?.detail || e.message) }));
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: null }));
    }
  };

  const handleDiscontinue = async (id) => {
    const reason = window.prompt('Reason for discontinuing (optional):') ?? null;
    if (reason === null) return; // cancelled
    setActionLoading(prev => ({ ...prev, [id]: 'discontinue' }));
    setActionMsg(prev => ({ ...prev, [id]: '' }));
    try {
      const res = await api.discontinueRequest(id, reason);
      setActionMsg(prev => ({ ...prev, [id]: res?.message || 'Discontinued.' }));
      setTimeout(() => {
        setActionMsg(prev => ({ ...prev, [id]: '' }));
        load();
      }, 1500);
    } catch (e) {
      setActionMsg(prev => ({ ...prev, [id]: 'Error: ' + (e.response?.data?.detail || e.message) }));
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: null }));
    }
  };

  return (
    <div className="space-y-6 p-6">

      {/* Deadline Modal */}
      {deadlineModal.open && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 w-full max-w-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Set Deadline Before Approving</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              CA: <span className="font-mono font-semibold text-violet-600 dark:text-violet-400">{deadlineModal.caNumber}</span>
            </p>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Deadline Date <span className="text-red-500">*</span></label>
            <input
              type="date"
              value={deadlineModal.value}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setDeadlineModal(m => ({ ...m, value: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 mb-4"
            />
            <div className="flex gap-2">
              <button
                disabled={!deadlineModal.value}
                onClick={() => {
                  const { reqId, value } = deadlineModal;
                  setDeadlineModal({ open: false, reqId: null, caNumber: '', value: '' });
                  handleApprove(reqId, value);
                }}
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Confirm &amp; Approve
              </button>
              <button
                onClick={() => setDeadlineModal({ open: false, reqId: null, caNumber: '', value: '' })}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-5 h-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Approval Queue</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            CA requests awaiting approval
            {!loading && requests.length > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700">
                {requests.length}
              </span>
            )}
          </p>
        </div>
        <button onClick={load} disabled={loading} title="Refresh"
          className="p-2 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
          <RefreshCw className={'w-4 h-4 ' + (loading ? 'animate-spin' : '')} />
        </button>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-14 text-center">
          <ClipboardList className="w-10 h-10 text-slate-200 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">No requests pending approval</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">All caught up!</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-violet-500" />
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Pending Approval</h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
              {requests.length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30">
                  {['CA No.', 'Title', 'Customer', 'Lot No.', 'Submitter', 'Priority', 'Date', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {requests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                    {/* CA Number */}
                    <td className="px-4 py-3">
                      <Link to={'/requests/' + req.id}
                        className="font-mono text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1">
                        {req.ca_number}
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </Link>
                    </td>
                    {/* Title */}
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium max-w-[220px]">
                      <span className="block truncate" title={req.title}>{req.title || '—'}</span>
                      {req.device_name && (
                        <span className="block text-xs text-slate-400 truncate">{req.device_name}</span>
                      )}
                    </td>
                    {/* Customer */}
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {req.customer || '—'}
                    </td>
                    {/* Lot No. */}
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {req.lot_no || req.lot_number || '—'}
                    </td>
                    {/* Submitter */}
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {req.submitter_name || '—'}
                    </td>
                    {/* Priority */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {req.priority && (
                        <span className={'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ' + (PRIORITY_STYLE[req.priority] || PRIORITY_STYLE.Normal)}>
                          {req.priority}
                        </span>
                      )}
                    </td>
                    {/* Date */}
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                      {req.created_at ? new Date(req.created_at).toLocaleDateString() : '—'}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {actionMsg[req.id] ? (
                        <span className={'text-xs font-medium ' + (actionMsg[req.id].startsWith('Error') ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400')}>
                          {actionMsg[req.id]}
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          {canApprove && (
                            <>
                              <button
                                onClick={() => setDeadlineModal({ open: true, reqId: req.id, caNumber: req.ca_number, value: '' })}
                                disabled={!!actionLoading[req.id]}
                                className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
                              >
                                {actionLoading[req.id] === 'approve'
                                  ? <span className="w-3 h-3 border border-white/50 border-t-white rounded-full animate-spin" />
                                  : <ThumbsUp className="w-3 h-3" />}
                                Approve
                              </button>
                              <button
                                onClick={() => handleDiscontinue(req.id)}
                                disabled={!!actionLoading[req.id]}
                                className="flex items-center gap-1 px-2.5 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
                              >
                                {actionLoading[req.id] === 'discontinue'
                                  ? <span className="w-3 h-3 border border-white/50 border-t-white rounded-full animate-spin" />
                                  : <ThumbsDown className="w-3 h-3" />}
                                Reject
                              </button>
                            </>
                          )}
                          <Link to={'/requests/' + req.id}
                            className="flex items-center gap-1 px-2.5 py-1 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-xs font-medium transition-colors">
                            <Eye className="w-3 h-3" /> View
                          </Link>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
