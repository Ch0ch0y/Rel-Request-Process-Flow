import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import ProcessTimeline from '../components/ProcessTimeline';
import {
  Plus, Search, Filter, Trash2, ChevronRight, X, FileSpreadsheet, FileText, Clock,
  GripVertical, PlusCircle, MessageSquarePlus, LayoutList, AlertCircle
} from 'lucide-react';
import ImportExcelModal from '../components/ImportExcelModal';
import ImportWordModal from '../components/ImportWordModal';
import ImportWhiskerModal from '../components/ImportWhiskerModal';
import ImportAgileModal from '../components/ImportAgileModal';
import ConfirmDialog from '../components/ConfirmDialog';

const FIELDS = [
  { key: 'classification', label: 'Classification', type: 'text' },
  { key: 'originator', label: 'Originator', type: 'text' },
  { key: 'plant', label: 'Plant', type: 'text' },
  { key: 'device_name', label: 'Device Name', type: 'text' },
  { key: 'lot_no', label: 'Lot No.', type: 'text' },
  { key: 'customer', label: 'Customer', type: 'text' },
  { key: 'pkg_info', label: 'Package Info', type: 'text' },
  { key: 'automotive', label: 'Automotive', type: 'checkbox' },
  { key: 'date_ltc', label: 'Date LTC', type: 'date' },
  { key: 'product_hierarchy', label: 'Product Hierarchy', type: 'text' },
  { key: 'pdl', label: 'PDL', type: 'text' },
  { key: 'body_size_x', label: 'Body X (mm)', type: 'number' },
  { key: 'body_size_y', label: 'Body Y (mm)', type: 'number' },
  { key: 'package_thickness', label: 'Package Thickness', type: 'number' },
  { key: 'ball_pitch', label: 'Ball Pitch', type: 'number' },
  { key: 'ball_count', label: 'Ball Count', type: 'number' },
  { key: 'lead_pitch', label: 'Lead Pitch', type: 'number' },
  { key: 'lead_count', label: 'Lead Count', type: 'number' },
  { key: 'total_ss', label: 'Total SS', type: 'text' },
  { key: 'purpose', label: 'Purpose', type: 'textarea' },
  { key: 'engineer_special_instruction', label: 'Engineer Special Instruction', type: 'textarea' },
  { key: 'deadline', label: 'Deadline', type: 'date' },
];

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

const DAY_MS = 86_400_000;
const NEW_REQUEST_WINDOW_DAYS = 3;
const STALE_REQUEST_WINDOW_DAYS = 5;

function parseRequestDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isRecentlyApproved(req) {
  const approvedAt = parseRequestDate(req.approved_at);
  if (!approvedAt) return false;
  return Date.now() - approvedAt.getTime() <= NEW_REQUEST_WINDOW_DAYS * DAY_MS;
}

function getLastAttentionDate(req) {
  const candidates = [req.last_opened_at, req.updated_at, req.approved_at, req.created_at]
    .map(parseRequestDate)
    .filter(Boolean);

  if (!candidates.length) return null;

  return new Date(Math.max(...candidates.map(date => date.getTime())));
}

function isStaleRequest(req) {
  if (['completed', 'discontinued'].includes(req.status)) return false;
  const lastAttention = getLastAttentionDate(req);
  if (!lastAttention) return false;
  return Date.now() - lastAttention.getTime() >= STALE_REQUEST_WINDOW_DAYS * DAY_MS;
}

function getStaleRequestTitle(req) {
  const lastAttention = getLastAttentionDate(req);
  if (!lastAttention) return 'Check this request. It has not been opened or edited in 5+ days.';

  const staleDays = Math.max(5, Math.floor((Date.now() - lastAttention.getTime()) / DAY_MS));
  return `Check this request. No open or edit activity for ${staleDays} day(s).`;
}

// DEFAULT_PROCESS_PRESETS moved to CreateRequestModal.jsx
const DEFAULT_PROCESS_PRESETS = [
  {
    id: 'default',
    label: '15-Step Flow',
    description: 'Standard reliability qualification flow',
    steps: [
      'Incoming Inspection', 'Visual', 'Serialize Samples', 'O/S', 'SAT',
      'Bake', 'Dry Bake', 'T & H Soak', 'Forced Convection Reflow (FCR)', 'SAT', 'O/S', 'Visual',
      'Reliability Test', 'SAT', 'O/S', 'Visual',
    ],
  },
  {
    id: 'mrt',
    label: 'MRT Process',
    description: 'Moisture Resistance Test qualification flow',
    steps: [
      'Incoming Inspection', 'Visual', 'Serialize Samples', 'O/S', 'SAT',
      'Bake', 'Dry Bake', 'Preconditioning (Precon)',
      'Moisture Resistance Test', 'Forced Convection Reflow (FCR)',
      'SAT', 'O/S', 'Visual',
    ],
  },
  {
    id: 'reliability',
    label: 'Reliability Test',
    description: 'Reliability testing qualification flow',
    steps: [
      'Incoming Inspection', 'Visual', 'Serialize Samples', 'O/S', 'SAT',
      'Bake', 'Dry Bake', 'T & H Soak', 'Forced Convection Reflow (FCR)',
      'Reliability Test', 'SAT', 'O/S', 'Visual',
    ],
  },
  {
    id: 'relmon',
    label: 'RelMon',
    description: 'Reliability Monitor flow (RMS)',
    requestType: 'RMS',
    steps: [
      'Incoming Inspection', 'Visual', 'Serialize Samples', 'O/S', 'SAT',
      'Bake', 'Reflow', 'Temperature Cycle', 'SAT', 'O/S', 'Visual',
    ],
  },
];

const AVAILABLE_STEPS = [
  'Incoming Inspection', 'Visual', 'Serialize Samples',
  'O/S', 'SAT', 'Bake', 'Dry Bake', 'HTS',
  'T&H Soak', 'Reflow', 'Electrical Test',
  'Reliability Test', 'Temperature Cycle', 'Moisture Resistance Test',
  'Preconditioning (Precon)', 'Forced Convection Reflow (FCR)',
  'Whisker Test', 'Staging',
  'Moisture Absorption and Desorption',
];

// Maps alternate/alias names to the canonical step name
const STEP_MERGE_ALIASES = {
  't & h soak': 'T&H Soak',
  't&h soak': 'T&H Soak',
  'reflow': 'Forced Convection Reflow (FCR)',
  'fcr': 'Forced Convection Reflow (FCR)',
  'forced convection reflow': 'Forced Convection Reflow (FCR)',
  'mrt': 'Moisture Resistance Test',
  'moisture resistance test': 'Moisture Resistance Test',
  'precon': 'Preconditioning (Precon)',
  'preconditioning': 'Preconditioning (Precon)',
  'preconditioning (precon)': 'Preconditioning (Precon)',
  'hts': 'HTS',
};

function resolveStepAlias(name) {
  return STEP_MERGE_ALIASES[name.toLowerCase().trim()] || null;
}

function CreateRequestModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({});
  const [selectedSteps, setSelectedSteps] = useState([...DEFAULT_PROCESS_PRESETS[0].steps]);
  const [requestType, setRequestType] = useState(''); // blank by default
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [presets, setPresets] = useState(DEFAULT_PROCESS_PRESETS);
  const [selectedPresetId, setSelectedPresetId] = useState('default');
  const [nextNumber, setNextNumber] = useState('');
  const [customStep, setCustomStep] = useState('');
  const [rrsSuggestions, setRrsSuggestions] = useState([]);
  const [stepMergeWarning, setStepMergeWarning] = useState('');
  const [stepSuggestions, setStepSuggestions] = useState([]);

  useEffect(() => {
    if (!open) return;
    api.getSettings().then(s => {
      if (s.process_presets && s.process_presets.length) setPresets(s.process_presets);
      if (s.process_steps && s.process_steps.length) {
        // Auto-select the matching preset if current steps match one
        const match = (s.process_presets || DEFAULT_PROCESS_PRESETS).find(p =>
          p.steps.length === s.process_steps.length && p.steps.every((st, i) => st === s.process_steps[i]));
        const defaultPreset = (s.process_presets || DEFAULT_PROCESS_PRESETS)[0];
        const chosen = match || defaultPreset;
        setSelectedPresetId(chosen.id);
        setSelectedSteps([...chosen.steps]);
      }
    }).catch(() => {});
    api.getRrsSuggestions().then(setRrsSuggestions).catch(() => {});
    if (requestType) {
      api.getNextRequestNumber(requestType).then(r => setNextNumber(r.next_number || '')).catch(() => {});
    } else {
      setNextNumber('');
    }
  }, [open, requestType]);

  if (!open) return null;
  const fieldsDisabled = !requestType;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedSteps.length === 0) {
      setError('Please add at least one process step.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.createRequest({ ...form, request_type: requestType, custom_steps: selectedSteps });
      onCreated();
      onClose();
      setForm({});
      setSelectedSteps([...DEFAULT_PROCESS_PRESETS[0].steps]);
      setSelectedPresetId('default');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const update = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const addStep = (stepName) => {
    const alias = resolveStepAlias(stepName);
    const canonical = alias || stepName;
    if (alias && alias.toLowerCase() !== stepName.toLowerCase()) {
      setStepMergeWarning(`"${stepName}" is the same as "${alias}". Added as "${alias}".`);
      setTimeout(() => setStepMergeWarning(''), 4000);
    } else {
      setStepMergeWarning('');
    }
    setSelectedSteps(prev => [...prev, canonical]);
  };

  const handleCustomStepChange = (value) => {
    setCustomStep(value);
    if (value.trim().length >= 1) {
      const q = value.toLowerCase();
      const filtered = AVAILABLE_STEPS.filter(s => s.toLowerCase().includes(q));
      // Also add alias matches
      const aliasMatches = Object.entries(STEP_MERGE_ALIASES)
        .filter(([k]) => k.includes(q))
        .map(([, v]) => v)
        .filter(v => !filtered.includes(v));
      setStepSuggestions([...new Set([...filtered, ...aliasMatches])].slice(0, 8));
    } else {
      setStepSuggestions([]);
    }
  };

  const removeStep = (idx) => {
    setSelectedSteps(prev => prev.filter((_, i) => i !== idx));
  };

  const moveStep = (idx, direction) => {
    setSelectedSteps(prev => {
      const arr = [...prev];
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= arr.length) return arr;
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="font-heading text-lg font-bold text-slate-900">New Request</h2>
            {nextNumber && (
              <p className="mt-0.5 flex items-center gap-2">
                <span className="font-mono text-xl font-bold text-blue-700 tracking-tight">{nextNumber}</span>
                <span className="text-xs text-slate-400">Auto-generated {requestType}#</span>
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        {error && <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4">
          <div className="mt-4 mb-6">
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Request Type</label>
            <select value={requestType} onChange={e => setRequestType(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm transition-all">
              <option value="" disabled>Select type...</option>
              <option value="REL">REL</option>
              <option value="RMS">RMS</option>
            </select>
          </div>
          {/* RRS field */}
          <div className="mb-4">
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">RRS #</label>
            <input
              type="text"
              list="rrs-suggestions-list"
              value={form.rrs_no || ''}
              onChange={e => update('rrs_no', e.target.value)}
              placeholder="Enter or search RRS number..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm transition-all"
              disabled={fieldsDisabled}
            />
            <datalist id="rrs-suggestions-list">
              {rrsSuggestions.map(rrs => <option key={rrs} value={rrs} />)}
            </datalist>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 opacity-" style={{ opacity: fieldsDisabled ? 0.5 : 1 }}>
            {FIELDS.map(f => (
              <div key={f.key} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">{f.label}</label>
                {f.type === 'checkbox' ? (
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={form[f.key] || false} onChange={e => update(f.key, e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" disabled={fieldsDisabled} />
                    <span className="text-sm text-slate-600">Yes</span>
                  </label>
                ) : f.type === 'textarea' ? (
                  <textarea value={form[f.key] || ''} onChange={e => update(f.key, e.target.value)} rows={2}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm transition-all" disabled={fieldsDisabled} />
                ) : (
                  <input type={f.type} value={form[f.key] || ''} onChange={e => update(f.key, f.type === 'number' ? (e.target.value ? Number(e.target.value) : '') : e.target.value)}
                    step={f.type === 'number' ? 'any' : undefined}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm transition-all" disabled={fieldsDisabled} />
                )}
              </div>
            ))}
          </div>
          {/* Process Steps Builder */}
          <div className="mt-6 border-t border-slate-200 pt-4 opacity-" style={{ opacity: fieldsDisabled ? 0.5 : 1, pointerEvents: fieldsDisabled ? 'none' : 'auto' }}>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">Process Steps ({selectedSteps.length})</label>
            </div>
            {/* Preset Selector */}
            <div className="mb-3">
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <LayoutList className="w-3 h-3" /> Select Process
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {presets.map(preset => {
                  const active = selectedPresetId === preset.id;
                  return (
                    <button key={preset.id} type="button"
                      onClick={() => {
                        setSelectedPresetId(preset.id);
                        setSelectedSteps([...preset.steps]);
                        if (preset.requestType) setRequestType(preset.requestType);
                      }}
                      className={`flex flex-col items-start px-2.5 py-2 rounded-lg border text-left transition-all ${
                        active
                          ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400'
                          : 'bg-slate-50 border-slate-200 hover:bg-blue-50 hover:border-blue-300'
                      }`} disabled={fieldsDisabled}>
                      <span className={`text-xs font-semibold leading-tight ${
                        active ? 'text-blue-700' : 'text-slate-700'
                      }`}>{preset.label}</span>
                      <span className={`text-[10px] mt-0.5 ${
                        active ? 'text-blue-500' : 'text-slate-400'
                      }`}>{preset.steps.length} steps</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Current steps */}
            {selectedSteps.length > 0 && (
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 mb-3 max-h-52 overflow-y-auto">
                {selectedSteps.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-3 py-2 group text-sm">
                    <GripVertical className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                    <span className="text-xs font-medium text-slate-400 w-5">{idx + 1}.</span>
                    <span className="flex-1 text-slate-700">{step}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button type="button" onClick={() => moveStep(idx, -1)} disabled={idx === 0}
                        className="p-0.5 rounded hover:bg-slate-100 text-slate-400 disabled:opacity-30">▲</button>
                      <button type="button" onClick={() => moveStep(idx, 1)} disabled={idx === selectedSteps.length - 1}
                        className="p-0.5 rounded hover:bg-slate-100 text-slate-400 disabled:opacity-30">▼</button>
                      <button type="button" onClick={() => removeStep(idx)}
                        className="p-0.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-500">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add step buttons */}
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_STEPS.map(name => (
                <button key={name} type="button" onClick={() => addStep(name)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 border border-slate-200 hover:border-blue-200 transition-colors">
                  <PlusCircle className="w-3 h-3" /> {name}
                </button>
              ))}
            </div>
            {stepMergeWarning && (
              <div className="mb-2 px-3 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-xs flex items-start gap-1.5">
                <span className="mt-0.5">⚠️</span>
                <span>{stepMergeWarning}</span>
              </div>
            )}
            {/* Custom step input */}
            <div className="flex gap-2 mt-2 relative">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={customStep}
                  onChange={e => handleCustomStepChange(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && customStep.trim()) {
                      e.preventDefault();
                      addStep(customStep.trim());
                      setCustomStep('');
                      setStepSuggestions([]);
                    } else if (e.key === 'Escape') {
                      setStepSuggestions([]);
                    }
                  }}
                  onBlur={() => setTimeout(() => setStepSuggestions([]), 150)}
                  placeholder="Type to search or add custom step..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 text-xs"
                  disabled={fieldsDisabled}
                />
                {stepSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                    {stepSuggestions.map(s => (
                      <button key={s} type="button"
                        onMouseDown={() => { addStep(s); setCustomStep(''); setStepSuggestions([]); }}
                        className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button type="button" onClick={() => { if (customStep.trim()) { addStep(customStep.trim()); setCustomStep(''); setStepSuggestions([]); } }}
                disabled={!customStep.trim() || fieldsDisabled}
                className="px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors">
                Add
              </button>
            </div>
          </div>
        </form>
        <div className="px-6 py-4 border-t border-slate-200 flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium">Cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium disabled:opacity-50 shadow-sm">
            {loading ? 'Creating...' : 'Create Request'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Requests() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [stepFilter] = useState(searchParams.get('step') || '');
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showImportWord, setShowImportWord] = useState(false);
  const [showImportWhisker, setShowImportWhisker] = useState(false);
  const [showImportAgile, setShowImportAgile] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [typeFilter, setTypeFilter] = useState(''); // '' | 'REL' | 'RMS'
  const { hasRole, hasPerm, user } = useAuth();

  const canCreate = hasPerm('create_request');
  // Helper: derive request type from request_type field or request_number prefix
  const getReqType = (r) => r.request_type || (r.request_number?.startsWith('RMS') ? 'RMS' : 'REL');

  // Delete is Admin-only
  const canDeleteRequest = () => user?.role === 'Admin';

  const loadRequests = () => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    api.getRequests(params)
      .then(data => setRequests(data.filter(r => r.status !== 'completed')))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  // Apply step filter + sort client-side
  const displayRequests = (() => {
    const base = typeFilter ? requests.filter(r => getReqType(r) === typeFilter) : requests;
    if (!stepFilter) return base;
    // Filter: requests that have the target step in_progress or pending
    const filtered = base.filter(req =>
      req.steps?.some(s => s.step_name === stepFilter && (s.status === 'in_progress' || s.status === 'pending'))
    );
    // Sort: in_queue (in_progress) first, then pending; within each group sort by started_at ASC (earliest first), nulls last
    return filtered.slice().sort((a, b) => {
      const stepA = a.steps?.find(s => s.step_name === stepFilter && (s.status === 'in_progress' || s.status === 'pending'));
      const stepB = b.steps?.find(s => s.step_name === stepFilter && (s.status === 'in_progress' || s.status === 'pending'));
      const rankA = stepA?.status === 'in_progress' ? 0 : 1;
      const rankB = stepB?.status === 'in_progress' ? 0 : 1;
      if (rankA !== rankB) return rankA - rankB;
      // Within same status, sort by started_at ascending (earlier = higher priority)
      const tA = stepA?.started_at ? new Date(stepA.started_at).getTime() : (a.planner_est_start ? new Date(a.planner_est_start).getTime() : Infinity);
      const tB = stepB?.started_at ? new Date(stepB.started_at).getTime() : (b.planner_est_start ? new Date(b.planner_est_start).getTime() : Infinity);
      return tA - tB;
    });
  })();

  useEffect(() => { loadRequests(); }, [statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadRequests();
  };

  const handleDelete = async (id, e) => {
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

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const handleDropdown = (open) => setDropdownOpen(open);
  const handleNav = (path) => {
    setDropdownOpen(false);
    window.location.href = path;
  };

  return (
    <div className="space-y-6 stagger-children">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-5 shadow-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <LayoutList className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="relative z-50" onMouseEnter={() => handleDropdown(true)} onMouseLeave={() => handleDropdown(false)}>
              <button
                className="text-xl font-heading font-bold text-slate-900 dark:text-white tracking-tight bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 py-2 w-56 flex items-center justify-between focus:outline-none"
                style={{ minWidth: '180px' }}
                onClick={() => setDropdownOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={dropdownOpen}
              >
                All Requests
                <span className="ml-2">▼</span>
              </button>
              {dropdownOpen && (
                <div className="absolute left-0 mt-2 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50">
                  <button onClick={() => handleNav('/requests')} className="block w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-900 dark:text-white">All Requests</button>
                  <button onClick={() => handleNav('/my-requests')} className="block w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-900 dark:text-white">My Requests</button>
                  <button onClick={() => handleNav('/completed')} className="block w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-900 dark:text-white">Completed Requests</button>
                </div>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage RELDMS requests.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {hasPerm('import_requests') && (
              <>
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
              </>
            )}
            {canCreate && (
              <button onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg px-3.5 py-2 font-medium text-sm shadow-sm hover:shadow-md transition-all">
                <Plus className="w-4 h-4" /> New Request
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Step filter chip */}
      {stepFilter && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg text-sm">
          <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <span className="text-blue-700 dark:text-blue-300 font-medium">Showing step: <span className="font-semibold">{stepFilter}</span></span>
          <span className="text-blue-500 dark:text-blue-400 text-xs ml-1">· In Queue first, sorted by start date</span>
          <a href="/requests?status=testing" className="ml-auto text-xs text-blue-500 hover:text-blue-700 font-medium flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> Clear
          </a>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by REL#, device, customer, lot, originator, plant, status..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-500
                focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm transition-all"
            />
          </div>
          <button type="submit"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors">
            <Search className="w-4 h-4" /> Search
          </button>
        </form>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select value={statusFilter} onChange={e => {
              const val = e.target.value;
              setStatusFilter(val);
              if (val) { setSearchParams({ status: val }); } else { setSearchParams({}); }
            }}
            className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-700 dark:text-slate-100
              focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm transition-all">
            <option value="">All Status</option>
            <option value="incoming">Request (Incoming)</option>
            <option value="review">Review</option>
            <option value="approval">Approval</option>
            <option value="testing">Testing</option>
            <option value="analysis">Analysis</option>
            <option value="in_progress">In Progress (Legacy)</option>
            <option value="discontinued">Discontinued</option>
            <option value="delayed">Delayed</option>
            <option value="upcoming">Upcoming Deadlines</option>
          </select>
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
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      ) : displayRequests.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-slate-400 text-lg">No requests found.</p>
          {canCreate && (
            <button onClick={() => setShowCreate(true)}
              className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium">
              Create your first request
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden">
          {displayRequests.map(req => {
            const legCount = req.steps ? new Set(req.steps.map(s => s.leg || 1)).size : 1;
            const isNewlyApproved = isRecentlyApproved(req);
            const isStale = isStaleRequest(req);
            const staleTitle = getStaleRequestTitle(req);

            return (
            <Link
              key={req.id}
              to={`/requests/${req.id}`}
              className={`flex items-center gap-4 px-6 py-4 transition-all group ${isStale
                ? 'bg-amber-50/50 dark:bg-amber-900/10 shadow-[inset_3px_0_0_#f59e0b] hover:bg-amber-50/80 dark:hover:bg-amber-900/20'
                : 'hover:bg-blue-50/40 dark:hover:bg-blue-900/10 hover:shadow-[inset_3px_0_0_#3b82f6] dark:hover:shadow-[inset_3px_0_0_#60a5fa]'}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                                  {/* REL# at the top */}
                                  {req.request_number && (
                                    <div className="font-mono text-lg font-extrabold text-blue-700 dark:text-blue-400 mb-1 tracking-tight">
                                      {req.request_number}
                                    </div>
                                  )}
                                  {/* Request Title */}
                                  {req.title && (
                                    <div className="font-heading text-base font-bold text-slate-900 dark:text-white mb-1 truncate">
                                      {req.title}
                                    </div>
                                  )}
                  <StatusBadge status={req.status} />
                  {req.rrs_no && (
                    <span className="inline-flex flex-col items-center ml-2">
                      <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold border bg-violet-50 text-violet-700 border-violet-200" style={{lineHeight: '1.1'}}>
                        RRS#<br/>
                        <span className="font-mono text-base font-bold text-violet-700">{req.rrs_no}</span>
                      </span>
                    </span>
                  )}
                  {/* Blinking red dot for delayed requests */}
                  {req.deadline && new Date(req.deadline) < new Date() && req.status !== 'completed' && (
                    <span className="relative flex h-2.5 w-2.5" title="Delayed — past deadline">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                    </span>
                  )}
                  {req.note && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200" title={req.note}>
                      <MessageSquarePlus className="w-3 h-3" /> Notice
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
                  {isNewlyApproved && (
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200"
                      title="Approved within the last 3 days"
                    >
                      NEW
                    </span>
                  )}
                  {isStale && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200"
                      title={staleTitle}
                    >
                      <AlertCircle className="w-3 h-3" /> Check
                    </span>
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
                  <span>by {req.created_by_username}</span>
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
                {canDeleteRequest() && (
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

      <CreateRequestModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={loadRequests} />
      <ImportExcelModal open={showImport} onClose={() => setShowImport(false)} onImported={loadRequests} />
      <ImportWordModal open={showImportWord} onClose={() => setShowImportWord(false)} onImported={loadRequests} />
      <ImportWhiskerModal open={showImportWhisker} onClose={() => setShowImportWhisker(false)} onImported={loadRequests} />
      <ImportAgileModal open={showImportAgile} onClose={() => setShowImportAgile(false)} onImported={loadRequests} />
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
