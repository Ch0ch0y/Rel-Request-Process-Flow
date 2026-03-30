import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, Loader2, CheckCircle2, Circle, Clock, XCircle, AlertCircle,
  ChevronsRight, ChevronDown, ChevronUp, Save, X, Trash2, ArrowRight, Archive, Edit3
} from 'lucide-react';
import EnhancedRetentionDetails from '../components/EnhancedRetentionDetails';
import { parseRetentionDetails, serializeRetentionDetails, hasRetentionData } from '../constants/retentionConstants';

const STATUS_STYLE = {
  pending:      'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  in_progress:  'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800',
  completed:    'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  discontinued: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
};
const STATUS_LABEL = {
  pending: 'Pending', in_progress: 'In Progress', completed: 'Completed', discontinued: 'Discontinued',
};
const STEP_ICON = {
  not_started: <Circle className="w-5 h-5 text-slate-600" />,
  in_queue:    <Clock className="w-5 h-5 text-yellow-400" />,
  in_progress: <ChevronsRight className="w-5 h-5 text-violet-400" />,
  completed:   <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
  failed:      <XCircle className="w-5 h-5 text-red-400" />,
};
const STEP_STATUS_STYLE = {
  not_started: 'text-slate-500',
  in_queue:    'text-yellow-400',
  in_progress: 'text-violet-400',
  completed:   'text-emerald-400',
  failed:      'text-red-400',
};

export default function RequestDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedStep, setExpandedStep] = useState(null);
  const [editStep, setEditStep] = useState({});
  const [savingStep, setSavingStep] = useState(null);
  const [showDiscontinue, setShowDiscontinue] = useState(false);
  const [discontinueReason, setDiscontinueReason] = useState('');
  const [deadlineModal, setDeadlineModal] = useState({ open: false, value: '' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [retentionEditing, setRetentionEditing] = useState(false);
  const [retentionSaving, setRetentionSaving] = useState(false);

  const fetch = () => {
    api.get(`/api/requests/${id}`).then(r => setRequest(r.data)).catch(() => navigate('/requests')).finally(() => setLoading(false));
  };
  useEffect(() => { fetch(); }, [id]);

  const canApprove  = ['Admin', 'REL Engineer'].includes(user?.role);
  const canManage   = ['Admin', 'REL Engineer', 'Analyst'].includes(user?.role);
  const isAdmin     = user?.role === 'Admin';

  const handleApprove = async (due_date) => {
    setActionLoading(true);
    try {
      await api.post(`/api/requests/${id}/approve`, { due_date });
      setDeadlineModal({ open: false, value: '' });
      fetch();
    } catch (e) { alert(e.response?.data?.detail || 'Error'); }
    finally { setActionLoading(false); }
  };

  const handleDiscontinue = async () => {
    if (!discontinueReason.trim()) { alert('Please provide a reason.'); return; }
    setActionLoading(true);
    try { await api.post(`/api/requests/${id}/discontinue`, { reason: discontinueReason }); fetch(); setShowDiscontinue(false); } catch (e) { alert(e.response?.data?.detail || 'Error'); } finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await api.delete(`/api/requests/${id}`);
      navigate('/requests');
    } catch (e) {
      alert(e.response?.data?.detail || 'Error deleting request');
      setActionLoading(false);
    }
  };

  const handleStepSave = async (step) => {
    setSavingStep(step.id);
    try { await api.patch(`/api/steps/${step.id}`, { status: editStep[step.id]?.status ?? step.status, remarks: editStep[step.id]?.remarks ?? step.remarks ?? '' }); fetch(); setExpandedStep(null); } catch (e) { alert(e.response?.data?.detail || 'Error'); } finally { setSavingStep(null); }
  };

  const handleRetentionSave = async (retentionData) => {
    setRetentionSaving(true);
    try {
      const serialized = serializeRetentionDetails(retentionData);
      await api.updateRequest(id, { retention_details: serialized });
      fetch();
      setRetentionEditing(false);
    } catch (e) { alert(e.response?.data?.detail || 'Error saving retention'); }
    finally { setRetentionSaving(false); }
  };

  const STEP_STATUS_OPTS = ['not_started', 'in_queue', 'in_progress', 'completed', 'failed'];

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-violet-500 animate-spin" /></div>;
  if (!request) return null;

  const req = request;
  const steps = req.steps || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto stagger-children">
      {/* Deadline Modal */}
      {deadlineModal.open && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 w-full max-w-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Set Deadline Before Approving</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              CA: <span className="font-mono font-semibold text-violet-600 dark:text-violet-400">{req.ca_number}</span>
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
                disabled={!deadlineModal.value || actionLoading}
                onClick={() => handleApprove(deadlineModal.value)}
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm & Approve'}
              </button>
              <button
                onClick={() => setDeadlineModal({ open: false, value: '' })}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate('/requests')} className="mt-1 text-slate-500 hover:text-white transition-colors"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-violet-400 font-medium">{req.ca_number}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_STYLE[req.status] || ''}`}>{STATUS_LABEL[req.status] || req.status}</span>
            <span className="text-slate-600 text-xs">Priority: {req.priority}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white font-heading mt-1">{req.title}</h1>
        </div>
        <div className="flex gap-2 mt-1 flex-shrink-0">
          {canApprove && req.status === 'pending' && (
            <button onClick={() => setDeadlineModal({ open: true, value: '' })} disabled={actionLoading}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium disabled:opacity-50">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Approve'}
            </button>
          )}
          {canManage && !['completed','discontinued'].includes(req.status) && (
            <button onClick={() => setShowDiscontinue(true)}
              className="px-3 py-1.5 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 text-sm font-medium">
              Discontinue
            </button>
          )}
          {isAdmin && (
            <button onClick={() => setShowDeleteConfirm(true)} disabled={actionLoading}
              className="px-3 py-1.5 rounded-lg border border-red-600/50 text-red-500 hover:bg-red-600 hover:text-white hover:border-red-600 text-sm font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          )}
        </div>
      </div>

      {/* General Information */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
          <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">General Information</h2>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-3">
          {[
            ['Request Number', req.ca_number],
            ['Reference Project', req.reference_project],
            ['Classification', req.classification],
            ['Product Hierarchy', req.product_hierarchy],
            ['Originator', req.originator],
            ['Created By', req.submitter_name],
            ['PDL', req.pdl],
            ['Plant', req.plant],
            ['Body Size X (mm)', req.body_size_x],
            ['Device Name', req.device_name || req.device],
            ['Body Size Y (mm)', req.body_size_y],
            ['Lot No', req.lot_no || req.lot_number],
            ['Package Thickness (mm)', req.package_thickness],
            ['Customer', req.customer],
            ['Ball Pitch (mm)', req.ball_pitch],
            ['PKG Info', req.pkg_info],
            ['Ball Count', req.ball_count],
            ['Automotive', req.automotive],
            ['Lead Pitch (mm)', req.lead_pitch],
            ['Date', req.created_at ? new Date(req.created_at).toLocaleDateString() : '—'],
            ['Lead Count', req.lead_count],
            ['Department', req.department],
            ['Total S/S', req.total_ss],
          ].map(([label, val]) => (
            <div key={label}>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 mb-0.5">{label}</div>
              <div className="text-sm text-slate-800 dark:text-slate-200">{val || '—'}</div>
            </div>
          ))}
        </div>
        {req.purpose && (
          <div className="px-5 pb-5">
            <div className="text-[11px] text-slate-400 dark:text-slate-500 mb-1">Purpose</div>
            <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap bg-slate-50 dark:bg-slate-700/40 rounded-lg px-3 py-2">{req.purpose}</p>
          </div>
        )}
      </div>

      {/* Material Information */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
          <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Material Information</h2>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-3">
          {[
            ['BCB Material', req.bcb_material],
            ['Mfg Site', req.mfg_site],
            ['Bump Height', req.bump_height],
            ['Masking Material', req.masking_material],
            ['Bump Material', req.bump_material],
            ['Others1', req.others1],
            ['Bump Pitch', req.bump_pitch],
            ['Others2', req.others2],
            ['Bump Size', req.bump_size],
            ['Others3', req.others3],
            ['Bumping House', req.bumping_house],
            ['Others4', req.others4],
            ['Chip Attach Flux Cleaning Method', req.chip_attach_flux_cleaning_method],
            ['Others5', req.others5],
            ['Chip Attach Flux', req.chip_attach_flux],
            ['Passive Component', req.passive_component],
            ['Die Attach Material', req.die_attach_material],
            ['PCB Finish', req.pcb_finish],
            ['Die coat after W/B', req.die_coat_after_wb],
            ['Plating Option', req.plating_option],
            ['Die Pad Config', req.die_pad_config],
            ['Rel Site', req.rel_site],
            ['Die Pad Metal', req.die_pad_metal],
            ['Solder Ball Attach Paste', req.solder_ball_attach_paste],
            ['Die Pad Pitch (μm)', req.die_pad_pitch],
            ['Solder Ball Material', req.solder_ball_material],
            ['Die Passivation', req.die_passivation],
            ['Solder Ball Size (mm)', req.solder_ball_size],
            ['Die Size (mm)', req.die_size],
            ['Solder Mask Material', req.solder_mask_material],
            ['Die Thick (μm)', req.die_thick],
            ['Solder Paste Material', req.solder_paste_material],
            ['Down Bond', req.down_bond],
            ['Sub Layer', req.sub_layer],
            ['EMC/Encap Material', req.emc_encap_material],
            ['Sub Pad Design', req.sub_pad_design],
            ["Heat Dissipation Mat'l", req.heat_dissipation_matl],
            ['Sub Pad Opening Size', req.sub_pad_opening_size],
            ['LF Ag Option', req.lf_ag_option],
            ['Sub Surface Treatment', req.sub_surface_treatment],
            ['LF Etch/Stamp', req.lf_etch_stamp],
            ['UBM Material', req.ubm_material],
            ['LF Inner Lead Pitch (μm)', req.lf_inner_lead_pitch],
            ['UBM Opening Size (μm)', req.ubm_opening_size],
            ['LF/Sub Material', req.lf_sub_material],
            ['Underfill Material', req.underfill_material],
            ['LF/Sub Pad Size (μm)', req.lf_sub_pad_size],
            ['Wafer Type', req.wafer_type],
            ['LF/Sub Supplier', req.lf_sub_supplier],
            ['Wire Length Max (mm)', req.wire_length_max],
            ['LF/Sub Thickness (μm)', req.lf_sub_thickness],
            ['Wire Material', req.wire_material],
            ['Lid Attach Epoxy', req.lid_attach_epoxy],
            ['Wire Size (μm)', req.wire_size],
            ['Line Width', req.line_width],
            ['Wire Supplier', req.wire_supplier],
            [null, null],
            ['Wire Type', req.wire_type],
          ].filter(([label]) => label !== null).map(([label, val]) => (
            <div key={label}>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 mb-0.5">{label}</div>
              <div className="text-sm text-slate-800 dark:text-slate-200">{val || '—'}</div>
            </div>
          ))}
        </div>
      </div>

      {req.note && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Notes</div>
          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{req.note}</p>
        </div>
      )}

      {req.discontinue_reason && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-red-400">Discontinue Reason</div>
            <p className="text-sm text-slate-300 mt-1">{req.discontinue_reason}</p>
          </div>
        </div>
      )}

      {/* CA Steps */}
      <div>
        <button
          onClick={() => navigate(`/requests/${id}/steps`)}
          className="w-full flex items-center justify-between px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:border-violet-400 dark:hover:border-violet-500 transition-colors group">
          <div className="flex items-center gap-2">
            <ChevronsRight className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-semibold text-slate-900 dark:text-white">CA Steps</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">({steps.length} steps)</span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-violet-400 transition-colors" />
        </button>
      </div>

      {/* Retention Details */}
      {req.status === 'completed' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Archive className="w-4 h-4 text-violet-400" />
              <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Retention Details</h2>
            </div>
            {canManage && !retentionEditing && (
              <button onClick={() => setRetentionEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-colors">
                <Edit3 className="w-3.5 h-3.5" />
                {hasRetentionData(req.retention_details) ? 'Edit' : 'Add'}
              </button>
            )}
          </div>
          {retentionEditing ? (
            <div className="p-5">
              <EnhancedRetentionDetails
                retentionDetails={req.retention_details}
                onSave={handleRetentionSave}
                onCancel={() => setRetentionEditing(false)}
                saving={retentionSaving}
              />
            </div>
          ) : hasRetentionData(req.retention_details) ? (
            <div className="p-5">
              {(() => {
                const data = parseRetentionDetails(req.retention_details);
                const rd = data.retentionData || {};
                const sections = [
                  { label: 'A. Reliability Tested Units', data: rd.reliabilityTested },
                  { label: 'B. Excess Units', data: rd.excessUnits },
                  { label: 'C. Sent to Tanyag Units', data: rd.sentToTanyag },
                ];
                return (
                  <div className="space-y-4">
                    {sections.map(s => {
                      if (!s.data || !Object.values(s.data).some(v => v)) return null;
                      return (
                        <div key={s.label}>
                          <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">{s.label}</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
                            {Object.entries(s.data).filter(([,v]) => v).map(([k,v]) => (
                              <div key={k}>
                                <div className="text-[10px] text-slate-400 dark:text-slate-500">{k.replace(/([A-Z])/g, ' $1').trim()}</div>
                                <div className="text-sm text-slate-800 dark:text-slate-200">{String(v)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">
              No retention details recorded yet.
            </div>
          )}
        </div>
      )}

      {/* Discontinue modal */}
      {showDiscontinue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-white">Discontinue Request</h3>
              <button onClick={() => setShowDiscontinue(false)}><X className="w-5 h-5 text-slate-500 hover:text-white" /></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <label className="block text-sm text-slate-600 dark:text-slate-400">Reason for discontinuation</label>
              <textarea rows={3} value={discontinueReason} onChange={e => setDiscontinueReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 resize-none" />
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowDiscontinue(false)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors">Cancel</button>
                <button onClick={handleDiscontinue} disabled={actionLoading}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium disabled:opacity-50">
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Discontinue'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-red-500/30 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-500" />
                <h3 className="font-semibold text-slate-900 dark:text-white">Delete Request</h3>
              </div>
              <button onClick={() => setShowDeleteConfirm(false)}><X className="w-5 h-5 text-slate-500 hover:text-white" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Are you sure you want to permanently delete <span className="font-semibold text-slate-900 dark:text-white">{req.ca_number}</span>?
              </p>
              <p className="text-xs text-red-400">This action cannot be undone. All associated steps and data will be deleted.</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  Cancel
                </button>
                <button onClick={handleDelete} disabled={actionLoading}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors">
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete Permanently
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
