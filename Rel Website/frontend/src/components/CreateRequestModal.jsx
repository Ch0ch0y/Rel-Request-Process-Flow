import { useState, useEffect } from 'react';
import { X, GripVertical, PlusCircle, LayoutList } from 'lucide-react';
import api from '../api';

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

export const DEFAULT_PROCESS_PRESETS = [
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

export const AVAILABLE_STEPS = [
  'Incoming Inspection', 'Visual', 'Serialize Samples',
  'O/S', 'SAT', 'Bake', 'Dry Bake', 'HTS',
  'T&H Soak', 'Reflow', 'Electrical Test',
  'Reliability Test', 'Temperature Cycle', 'Moisture Resistance Test',
  'Preconditioning (Precon)', 'Forced Convection Reflow (FCR)',
  'Whisker Test', 'Staging',
  'Moisture Absorption and Desorption',
];

// Maps alternate/alias names to the canonical step name
export const STEP_MERGE_ALIASES = {
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

export function resolveStepAlias(name) {
  return STEP_MERGE_ALIASES[name.toLowerCase().trim()] || null;
}

export default function CreateRequestModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({});
  const [selectedSteps, setSelectedSteps] = useState([...DEFAULT_PROCESS_PRESETS[0].steps]);
  const [requestType, setRequestType] = useState('');
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
                      <span className={`text-xs font-semibold leading-tight ${active ? 'text-blue-700' : 'text-slate-700'}`}>{preset.label}</span>
                      <span className={`text-[10px] mt-0.5 ${active ? 'text-blue-500' : 'text-slate-400'}`}>{preset.steps.length} steps</span>
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
