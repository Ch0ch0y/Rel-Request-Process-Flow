import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import EmployeeSelect from '../components/EmployeeSelect';
import MachineSelect from '../components/MachineSelect';
import SatDataFileControl, { SAT_DATA_FILE_KEY } from '../components/SatDataFileControl';
import {
  ArrowLeft, CheckCircle2, ClipboardList, Clock, ExternalLink,
  ImagePlus, Loader2, PackageSearch, RefreshCw, Save, Search,
  Trash2, Waves, X,
} from 'lucide-react';

const SAT_CATEGORIES = [
  { key: 't_scan_1_24', label: 'T-Scan 1-24', optional: false },
  { key: 'c_scan_1_1_24', label: '1. C-Scan 1-24', optional: false },
  { key: 'c_scan_2_1_24', label: '2. C-Scan 1-24', optional: true },
  { key: 't_scan_25_48', label: 'T-Scan 25-48', optional: false },
  { key: 'c_scan_1_25_48', label: '1. C-Scan 25-48', optional: false },
  { key: 'c_scan_2_25_48', label: '2. C-Scan 25-48', optional: true },
  { key: 't_scan_49_77', label: 'T-Scan 49-77', optional: false },
  { key: 'c_scan_1_49_77', label: '1. C-Scan 49-77', optional: false },
  { key: 'c_scan_2_49_77', label: '2. C-Scan 49-77', optional: true },
];

const SAT_GROUPS = [
  ['Samples 1-24', 'sat_files_1_24', 0],
  ['Samples 25-48', 'sat_files_25_48', 3],
  ['Samples 49-77', 'sat_files_49_77', 6],
];

const STATUS_OPTIONS = [
  { key: 'all', label: 'All SAT' },
  { key: 'pending', label: 'Incoming' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
];

function makeStepKey(item) {
  return `${item.request_id}:${item.leg}:${item.step_number}`;
}

function normalizeSatImages(value) {
  return value && !Array.isArray(value) && typeof value === 'object' ? value : {};
}

function toLocalDateTimeInput(value) {
  return typeof value === 'string' && value.length >= 16 ? value.slice(0, 16) : '';
}

function formatDateTime(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('en-PH', {
      timeZone: 'Asia/Manila',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return String(value);
  }
}

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-PH', {
      timeZone: 'Asia/Manila',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return String(value);
  }
}

function statusLabel(status) {
  if (status === 'pending') return 'Incoming';
  if (status === 'in_progress') return 'In Progress';
  if (status === 'completed') return 'Completed';
  return status?.replace('_', ' ') || 'Unknown';
}

function statusPillClass(status) {
  if (status === 'pending') {
    return 'bg-amber-100 text-amber-700 border-amber-200';
  }
  if (status === 'in_progress') {
    return 'bg-blue-100 text-blue-700 border-blue-200';
  }
  if (status === 'completed') {
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  }
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

function createForm(step, fallbackOperatorId = '') {
  return {
    started_at: toLocalDateTimeInput(step.started_at),
    completed_at: toLocalDateTimeInput(step.completed_at),
    machine_no: step.machine_no || '',
    operator_id: step.operator_id || fallbackOperatorId || '',
    tray_no: step.tray_no || '',
    qty_in: step.qty_in ?? '',
    qty_out: step.qty_out ?? '',
    notes: step.notes || '',
  };
}

function SummaryCard({ label, value, status, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition-all ${
        active
          ? 'border-blue-500 bg-blue-50 shadow-sm'
          : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{value}</p>
        </div>
        <div className={`rounded-xl border px-2.5 py-1 text-xs font-semibold ${statusPillClass(status)}`}>
          {statusLabel(status)}
        </div>
      </div>
    </button>
  );
}

function QueueItem({ item, selected, onClick }) {
  const testCondition = item.custom_fields?.test_condition || '—';
  const operator = item.operator_name || item.operator_id || 'Unassigned';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition-all ${
        selected
          ? 'border-blue-500 bg-blue-50 shadow-sm'
          : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-heading text-base font-bold text-slate-900 truncate">{item.request_number}</p>
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusPillClass(item.step_status)}`}>
              {statusLabel(item.step_status)}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600 truncate">{item.device_name || '—'}{item.customer ? ` · ${item.customer}` : ''}</p>
        </div>
        <div className="rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
          Leg {item.leg} · SAT {item.step_number}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-500 sm:grid-cols-2">
        <p><span className="font-semibold text-slate-700">Condition:</span> {testCondition}</p>
        <p><span className="font-semibold text-slate-700">Operator:</span> {operator}</p>
        <p><span className="font-semibold text-slate-700">Lot:</span> {item.lot_no || '—'}</p>
        <p><span className="font-semibold text-slate-700">Deadline:</span> {formatDate(item.deadline)}</p>
      </div>
    </button>
  );
}

function SATImageGrid({ satImages, imageUploading, onUploadImage, onUploadAttachment, onRemoveImage, onPreviewImage, canUpdate }) {
  return (
    <div className="space-y-3">
      {SAT_GROUPS.map(([groupLabel, fileKey, startIndex]) => {
        const extraImages = satImages[fileKey] || [];
        const uploadingExtra = imageUploading === fileKey;

        return (
          <div key={fileKey} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
              <p className="text-sm font-semibold text-slate-700">{groupLabel}</p>
            </div>

            <div className="grid grid-cols-1 divide-y divide-slate-200 lg:grid-cols-4 lg:divide-x lg:divide-y-0">
              {SAT_CATEGORIES.slice(startIndex, startIndex + 3).map(({ key, label, optional }) => {
                const images = satImages[key] || [];
                const uploading = imageUploading === key;

                return (
                  <div key={key} className="space-y-2 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-semibold text-slate-600">{label}</p>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400">
                        {optional && <span className="italic">Opt.</span>}
                        <span>{images.length}/2</span>
                      </div>
                    </div>

                    {images.length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {images.map((url, idx) => (
                          <div key={idx} className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200">
                            <button
                              type="button"
                              onClick={() => onPreviewImage(url, `${label} ${idx + 1}`)}
                              className="absolute inset-0 cursor-zoom-in"
                              title={`View ${label} ${idx + 1}`}
                            >
                              <img src={url} alt={`${label} ${idx + 1}`} className="h-full w-full object-cover transition-opacity group-hover:opacity-90" />
                              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/55 px-1.5 py-1 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                                View
                              </span>
                            </button>
                            {canUpdate && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onRemoveImage(key, idx);
                                }}
                                className="absolute right-1 top-1 z-10 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                                title="Remove image"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {canUpdate && images.length < 2 && (
                      <label className="flex cursor-pointer items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 px-2 py-2 text-xs font-medium text-slate-500 transition-colors hover:border-blue-400 hover:text-blue-600">
                        <ImagePlus className="h-3.5 w-3.5" />
                        {uploading ? 'Uploading…' : `Add (${2 - images.length} left)`}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          disabled={uploading}
                          onChange={(event) => onUploadImage(event, key)}
                        />
                      </label>
                    )}

                    {!canUpdate && images.length === 0 && (
                      <p className="text-xs italic text-slate-300">No image uploaded</p>
                    )}
                  </div>
                );
              })}

              <div className="space-y-2 bg-slate-50/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-600">Attachments</p>
                  <span className="text-[11px] text-slate-400">{extraImages.length}/3</span>
                </div>

                {extraImages.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {extraImages.map((url, idx) => (
                      <div key={idx} className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => onPreviewImage(url, `Attachment ${idx + 1}`)}
                          className="absolute inset-0 cursor-zoom-in"
                          title={`View attachment ${idx + 1}`}
                        >
                          <img src={url} alt={`Attachment ${idx + 1}`} className="h-full w-full object-cover transition-opacity group-hover:opacity-90" />
                          <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/55 px-1.5 py-1 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                            View
                          </span>
                        </button>
                        {canUpdate && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onRemoveImage(fileKey, idx);
                            }}
                            className="absolute right-1 top-1 z-10 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                            title="Remove attachment"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {canUpdate && extraImages.length < 3 && (
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-blue-200 px-2 py-3 text-xs font-medium text-blue-500 transition-colors hover:border-blue-400 hover:bg-blue-50">
                    <ImagePlus className="h-4 w-4" />
                    <span>{uploadingExtra ? 'Uploading…' : 'Add Attach File'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      disabled={uploadingExtra}
                      onChange={(event) => onUploadAttachment(event, fileKey)}
                    />
                  </label>
                )}

                {!canUpdate && extraImages.length === 0 && (
                  <p className="text-xs italic text-slate-300">No attachment uploaded</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function SATSonoscan() {
  const { user, hasPerm, hasRole } = useAuth();
  const canUpdate = hasPerm('update_steps') || hasRole('Admin', 'Technician') || !!user?.isGuest;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('in_progress');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedStep, setSelectedStep] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [form, setForm] = useState(null);
  const [satImages, setSatImages] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [flashMessage, setFlashMessage] = useState('');
  const [imageUploading, setImageUploading] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getSatSonoscanQueue();
      setRows(Array.isArray(data) ? data : []);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err.message || 'Failed to load SAT queue');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRequestStep = useCallback(async (requestId, leg, stepNumber) => {
    const request = await api.getRequest(requestId);
    const step = (request.steps || []).find((entry) =>
      Number(entry.leg || 1) === Number(leg || 1) && Number(entry.step_number) === Number(stepNumber)
    );

    if (!step) {
      throw new Error('SAT step not found in request detail');
    }

    return { request, step };
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    const timer = setInterval(() => {
      loadQueue();
    }, 60_000);
    return () => clearInterval(timer);
  }, [loadQueue]);

  useEffect(() => {
    if (!flashMessage) return undefined;
    const timer = setTimeout(() => setFlashMessage(''), 3500);
    return () => clearTimeout(timer);
  }, [flashMessage]);

  const counts = useMemo(() => ({
    pending: rows.filter((item) => item.step_status === 'pending').length,
    in_progress: rows.filter((item) => item.step_status === 'in_progress').length,
    completed: rows.filter((item) => item.step_status === 'completed').length,
  }), [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((item) => {
      if (statusFilter !== 'all' && item.step_status !== statusFilter) return false;
      if (!search.trim()) return true;
      const query = search.trim().toLowerCase();
      return [
        item.request_number,
        item.device_name,
        item.customer,
        item.lot_no,
        item.operator_name,
        item.operator_id,
        item.custom_fields?.test_condition,
      ].some((value) => String(value || '').toLowerCase().includes(query));
    });
  }, [rows, search, statusFilter]);

  const selectedQueueItem = useMemo(
    () => rows.find((item) => makeStepKey(item) === selectedKey) || null,
    [rows, selectedKey]
  );

  const clearSelection = () => {
    setSelectedKey(null);
    setSelectedRequest(null);
    setSelectedStep(null);
    setForm(null);
    setSatImages({});
    setMessage('');
  };

  const openQueueItem = useCallback(async (item) => {
    setSelectedKey(makeStepKey(item));
    setMessage('');
    setDetailLoading(true);
    try {
      const { request, step } = await loadRequestStep(item.request_id, item.leg, item.step_number);
      setSelectedRequest(request);
      setSelectedStep(step);
      setForm(createForm(step, user?.employee_id || ''));
      setSatImages(normalizeSatImages(step.attachments));
    } catch (err) {
      setSelectedKey(null);
      setSelectedRequest(null);
      setSelectedStep(null);
      setForm(null);
      setSatImages({});
      setMessage(err.message || 'Failed to load SAT step');
    } finally {
      setDetailLoading(false);
    }
  }, [loadRequestStep, user?.employee_id]);

  const refreshSelection = useCallback(async (deselect = false, successText = '') => {
    await loadQueue();
    if (deselect || !selectedStep || !selectedRequest) {
      clearSelection();
      if (successText) setFlashMessage(successText);
      return;
    }

    const { request, step } = await loadRequestStep(selectedRequest.id, selectedStep.leg || 1, selectedStep.step_number);
    setSelectedRequest(request);
    setSelectedStep(step);
    setForm(createForm(step, user?.employee_id || ''));
    setSatImages(normalizeSatImages(step.attachments));
    if (successText) setMessage(successText);
  }, [loadQueue, loadRequestStep, selectedRequest, selectedStep, user?.employee_id]);

  const handleImageUpload = async (event, categoryKey) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const existing = satImages[categoryKey] || [];
    const remaining = 2 - existing.length;
    if (remaining <= 0) {
      setMessage('Maximum 2 images allowed per SAT section.');
      return;
    }

    setImageUploading(categoryKey);
    try {
      const uploaded = [];
      for (const file of files.slice(0, remaining)) {
        const result = await api.upload(file);
        uploaded.push(result.url);
      }
      setSatImages((current) => ({ ...current, [categoryKey]: [...(current[categoryKey] || []), ...uploaded] }));
    } catch (err) {
      setMessage(err.message || 'Failed to upload SAT image');
    } finally {
      setImageUploading(null);
      event.target.value = '';
    }
  };

  const handleAttachmentUpload = async (event, fileKey) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const existing = satImages[fileKey] || [];
    const remaining = 3 - existing.length;
    if (remaining <= 0) {
      setMessage('Maximum 3 attachments allowed per SAT sample group.');
      return;
    }

    setImageUploading(fileKey);
    try {
      const uploaded = [];
      for (const file of files.slice(0, remaining)) {
        const result = await api.upload(file);
        uploaded.push(result.url);
      }
      setSatImages((current) => ({ ...current, [fileKey]: [...(current[fileKey] || []), ...uploaded] }));
    } catch (err) {
      setMessage(err.message || 'Failed to upload SAT attachment');
    } finally {
      setImageUploading(null);
      event.target.value = '';
    }
  };

  const handleSatDataUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImageUploading(SAT_DATA_FILE_KEY);
    try {
      const result = await api.upload(file);
      setSatImages((current) => ({
        ...current,
        [SAT_DATA_FILE_KEY]: {
          url: result.url,
          filename: result.filename || '',
          original_filename: result.original_filename || file.name,
          name: result.original_filename || file.name,
          size: file.size,
          uploaded_at: new Date().toISOString(),
        },
      }));
      setMessage('SAT data file uploaded. Save the step to keep it.');
    } catch (err) {
      setMessage(err.message || 'Failed to upload SAT data file.');
    } finally {
      setImageUploading(null);
      event.target.value = '';
    }
  };

  const removeSatDataFile = () => {
    setSatImages((current) => {
      const next = { ...current };
      delete next[SAT_DATA_FILE_KEY];
      return next;
    });
  };

  const removeImage = (key, index) => {
    setSatImages((current) => ({
      ...current,
      [key]: (current[key] || []).filter((_, currentIndex) => currentIndex !== index),
    }));
  };

  const handleSave = async (mode = 'save') => {
    if (!selectedRequest || !selectedStep || !form) return;

    if (mode === 'done') {
      const missing = [];
      if (!form.started_at) missing.push('Start of Process');
      if (!form.completed_at) missing.push('End of Process');
      if (!form.machine_no?.trim()) missing.push('Machine');
      if (!form.operator_id?.trim()) missing.push('Employee No.');
      if (!form.tray_no?.trim()) missing.push('Tray');
      if (form.qty_in === '' || form.qty_in === null || form.qty_in === undefined) missing.push('Quantity In');
      if (form.qty_out === '' || form.qty_out === null || form.qty_out === undefined) missing.push('Quantity Out');
      if (missing.length > 0) {
        setMessage(`Done requires: ${missing.join(', ')}`);
        return;
      }
    }

    const payload = {
      machine_no: form.machine_no,
      operator_id: form.operator_id,
      tray_no: form.tray_no,
      notes: form.notes,
      attachments: satImages,
    };

    if (form.started_at) payload.started_at = form.started_at;
    if (form.completed_at) payload.completed_at = form.completed_at;
    if (form.qty_in !== '' && form.qty_in !== null && form.qty_in !== undefined) payload.qty_in = Number(form.qty_in);
    if (form.qty_out !== '' && form.qty_out !== null && form.qty_out !== undefined) payload.qty_out = Number(form.qty_out);

    if (mode === 'done') {
      payload.status = 'completed';
    } else if (selectedStep.status === 'pending') {
      payload.status = 'in_progress';
    }

    setSaving(true);
    setMessage('');

    try {
      await api.updateStep(selectedRequest.id, selectedStep.step_number, payload, selectedStep.leg || 1);

      if (mode === 'done') {
        const sameLegSteps = (selectedRequest.steps || [])
          .filter((step) => Number(step.leg || 1) === Number(selectedStep.leg || 1))
          .sort((left, right) => left.step_number - right.step_number);
        const currentIndex = sameLegSteps.findIndex((step) => Number(step.step_number) === Number(selectedStep.step_number));
        const nextStep = currentIndex >= 0 ? sameLegSteps[currentIndex + 1] : null;
        if (nextStep && nextStep.status === 'pending') {
          try {
            await api.updateStep(selectedRequest.id, nextStep.step_number, { status: 'in_progress' }, selectedStep.leg || 1);
          } catch {
          }
        }
        await refreshSelection(true, `${selectedRequest.request_number} SAT step marked done.`);
      } else {
        await refreshSelection(false, selectedStep.status === 'pending' ? 'SAT step saved and moved to In Progress.' : 'SAT step saved.');
      }
    } catch (err) {
      setMessage(err.message || 'Failed to save SAT step');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400 px-6 py-5 text-white shadow-lg shadow-amber-500/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
              <Waves className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">Technician Workbench</p>
              <h1 className="mt-1 font-heading text-3xl font-black">SAT / Sonoscan</h1>
              <p className="mt-1 max-w-2xl text-sm text-white/85">
                Track incoming, active, and completed SAT steps, then record machine, operator, quantities, notes, and SAT images without opening the full request page.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[260px] flex-1 lg:min-w-[320px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search request, device, lot, operator, condition..."
                className="w-full rounded-2xl border border-white/30 bg-white px-10 py-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-white focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={loadQueue}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/15 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-white/80">
          <p>{rows.length} SAT step{rows.length !== 1 ? 's' : ''} in queue</p>
          <p>{lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}` : 'Waiting for first refresh'}</p>
        </div>
      </div>

      {flashMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {flashMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <SummaryCard label="Incoming" value={counts.pending} status="pending" active={statusFilter === 'pending'} onClick={() => setStatusFilter('pending')} />
        <SummaryCard label="In Progress" value={counts.in_progress} status="in_progress" active={statusFilter === 'in_progress'} onClick={() => setStatusFilter('in_progress')} />
        <SummaryCard label="Completed" value={counts.completed} status="completed" active={statusFilter === 'completed'} onClick={() => setStatusFilter('completed')} />
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setStatusFilter(option.key)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
              statusFilter === option.key
                ? 'border-blue-500 bg-blue-600 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_1.35fr]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">SAT Queue</p>
                <h2 className="mt-1 font-heading text-xl font-bold text-slate-900">{statusFilter === 'all' ? 'All SAT Steps' : statusLabel(statusFilter)}</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {filteredRows.length} result{filteredRows.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="max-h-[calc(100vh-22rem)] space-y-3 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-14 text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Loading SAT queue…</span>
                </div>
              ) : filteredRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-14 text-center text-slate-400">
                  <ClipboardList className="h-10 w-10 opacity-40" />
                  <div>
                    <p className="text-sm font-semibold text-slate-500">No SAT step found</p>
                    <p className="mt-1 text-xs">Try another status filter or search term.</p>
                  </div>
                </div>
              ) : (
                filteredRows.map((item) => (
                  <QueueItem
                    key={makeStepKey(item)}
                    item={item}
                    selected={makeStepKey(item) === selectedKey}
                    onClick={() => openQueueItem(item)}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        <div>
          {!selectedKey ? (
            <div className="flex min-h-[32rem] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
              <PackageSearch className="h-12 w-12 text-slate-300" />
              <h3 className="mt-4 font-heading text-xl font-bold text-slate-800">Select a SAT step</h3>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                Choose an Incoming, In Progress, or Completed SAT entry from the list to record results, attach images, and finish the step.
              </p>
            </div>
          ) : detailLoading || !form || !selectedRequest || !selectedStep ? (
            <div className="flex min-h-[32rem] items-center justify-center rounded-3xl border border-slate-200 bg-white text-slate-400 shadow-sm">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading SAT step…
              </div>
            </div>
          ) : (
            <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 xl:hidden"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back
                    </button>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusPillClass(selectedStep.status)}`}>
                      {statusLabel(selectedStep.status)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                      Leg {selectedStep.leg || 1} · SAT {selectedStep.step_number}
                    </span>
                  </div>
                  <h2 className="mt-2 font-heading text-2xl font-black text-slate-900">{selectedRequest.request_number}</h2>
                  <p className="mt-1 text-sm text-slate-500">{selectedRequest.device_name || '—'}{selectedRequest.customer ? ` · ${selectedRequest.customer}` : ''}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="hidden items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 xl:inline-flex"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to list
                  </button>
                  <Link
                    to={`/requests/${selectedRequest.id}`}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
                  >
                    Open full request
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Lot No.</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{selectedRequest.lot_no || '—'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">SAT Condition</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{selectedStep.custom_fields?.test_condition || '—'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Deadline</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{formatDate(selectedRequest.deadline)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">Start of Process</label>
                  <input
                    type="datetime-local"
                    value={form.started_at}
                    disabled={!canUpdate}
                    onChange={(event) => setForm((current) => ({ ...current, started_at: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">End of Process</label>
                  <input
                    type="datetime-local"
                    value={form.completed_at}
                    disabled={!canUpdate}
                    onChange={(event) => setForm((current) => ({ ...current, completed_at: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">Machine</label>
                  <MachineSelect value={form.machine_no} onChange={(value) => setForm((current) => ({ ...current, machine_no: value }))} disabled={!canUpdate} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">Employee No.</label>
                  <EmployeeSelect value={form.operator_id} onChange={(value) => setForm((current) => ({ ...current, operator_id: value }))} highlightRequired={false} disabled={!canUpdate} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">Tray</label>
                  <input
                    type="text"
                    value={form.tray_no}
                    disabled={!canUpdate}
                    onChange={(event) => setForm((current) => ({ ...current, tray_no: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">Quantity In</label>
                    <input
                      type="number"
                      min="0"
                      value={form.qty_in}
                      disabled={!canUpdate}
                      onChange={(event) => setForm((current) => ({ ...current, qty_in: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">Quantity Out</label>
                    <input
                      type="number"
                      min="0"
                      value={form.qty_out}
                      disabled={!canUpdate}
                      onChange={(event) => setForm((current) => ({ ...current, qty_out: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">Notes</label>
                <textarea
                  rows={4}
                  value={form.notes}
                  disabled={!canUpdate}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                  placeholder="Add SAT observations or remarks..."
                />
              </div>

              <div className="space-y-3 border-t border-slate-100 pt-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">SAT Images</p>
                    <p className="mt-1 text-sm text-slate-500">Upload T-Scan, C-Scan, and supporting attachments for this SAT step.</p>
                  </div>
                  <SatDataFileControl
                    fileData={satImages[SAT_DATA_FILE_KEY]}
                    canUpdate={canUpdate}
                    uploading={imageUploading === SAT_DATA_FILE_KEY}
                    onUpload={handleSatDataUpload}
                    onRemove={removeSatDataFile}
                  />
                </div>
                <SATImageGrid
                  satImages={satImages}
                  imageUploading={imageUploading}
                  onUploadImage={handleImageUpload}
                  onUploadAttachment={handleAttachmentUpload}
                  onRemoveImage={removeImage}
                  onPreviewImage={(url, label) => setImagePreview({ url, label })}
                  canUpdate={canUpdate}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 md:grid-cols-3">
                <p><span className="font-semibold text-slate-700">Current Start:</span> {formatDateTime(selectedStep.started_at)}</p>
                <p><span className="font-semibold text-slate-700">Current End:</span> {formatDateTime(selectedStep.completed_at)}</p>
                <p><span className="font-semibold text-slate-700">Request Status:</span> {selectedRequest.status?.replace('_', ' ') || '—'}</p>
              </div>

              {message && (
                <div className={`rounded-2xl border px-4 py-3 text-sm ${message.toLowerCase().includes('failed') || message.toLowerCase().includes('requires') ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                  {message}
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={clearSelection}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to list
                </button>
                {canUpdate && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSave('save')}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSave('done')}
                      disabled={saving || selectedStep.status === 'completed'}
                      className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Done
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {imagePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setImagePreview(null)}>
          <div className="relative w-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setImagePreview(null)}
              className="absolute -top-10 right-0 text-white transition-colors hover:text-slate-300"
              title="Close preview"
            >
              <X className="h-6 w-6" />
            </button>
            <img src={imagePreview.url} alt={imagePreview.label} className="max-h-[80vh] w-full rounded-2xl bg-slate-950 object-contain shadow-2xl" />
            <div className="mt-3 flex items-center justify-between gap-3 text-sm text-slate-300">
              <p>{imagePreview.label}</p>
              <a href={imagePreview.url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-200 transition-colors hover:text-white">
                Open original
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}