import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import {
  ShieldCheck, ThumbsUp, ThumbsDown, ClipboardList,
  Eye, ExternalLink,
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

export default function ApprovalPage() {
  const { hasRole } = useAuth();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [actionMsg, setActionMsg] = useState({});

  const canApprove = hasRole('Admin', 'Planner');

  const load = () => {
    setLoading(true);
    api.getRequests({ status: 'approval' })
      .then(res => setRequests(Array.isArray(res) ? res : (res.requests || [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

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
          <div>
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
    </div>
  );
}