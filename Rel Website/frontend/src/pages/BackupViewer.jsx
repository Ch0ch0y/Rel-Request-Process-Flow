import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../api';
import ProcessTimeline from '../components/ProcessTimeline';
import {
  Archive, Search, ChevronRight, ChevronDown, X,
  CheckCircle2, AlertTriangle, Package, RefreshCw, Database,
  User, Calendar, Layers, Image as ImageIcon,
  ArrowLeft, FolderOpen
} from 'lucide-react';

// ── SAT categories (must match server + RequestDetail) ──────────────────────
const SAT_CATEGORIES = [
  { key: 't_scan_1_24',    label: 'T-Scan 1\u201324',     optional: false },
  { key: 'c_scan_1_1_24',  label: '1. C-Scan 1\u201324',  optional: false },
  { key: 'c_scan_2_1_24',  label: '2. C-Scan 1\u201324',  optional: true  },
  { key: 't_scan_25_48',   label: 'T-Scan 25\u201348',    optional: false },
  { key: 'c_scan_1_25_48', label: '1. C-Scan 25\u201348', optional: false },
  { key: 'c_scan_2_25_48', label: '2. C-Scan 25\u201348', optional: true  },
  { key: 't_scan_49_77',   label: 'T-Scan 49\u201377',    optional: false },
  { key: 'c_scan_1_49_77', label: '1. C-Scan 49\u201377', optional: false },
  { key: 'c_scan_2_49_77', label: '2. C-Scan 49\u201377', optional: true  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(v) {
  if (!v) return '—';
  try { return new Date(v).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return String(v); }
}

function fmtDateTime(v) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return String(v); }
}

function StatusBadge({ status }) {
  const map = {
    pending:     'bg-slate-100 text-slate-600 border-slate-200',
    in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
    completed:   'bg-emerald-100 text-emerald-700 border-emerald-200',
    failed:      'bg-red-100 text-red-700 border-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${map[status] || map.pending}`}>
      {(status || 'pending').replace('_', ' ')}
    </span>
  );
}

function InfoRow({ label, value }) {
  const display = (value === null || value === undefined || value === '')
    ? '—'
    : (typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value));
  return (
    <div className="flex justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-xs font-medium uppercase tracking-wider text-slate-400 shrink-0 mr-2">{label}</span>
      <span className={`text-sm text-right ${display === '—' ? 'text-slate-300' : 'text-slate-700'}`}>{display}</span>
    </div>
  );
}

// ── Step detail panel (read-only) ────────────────────────────────────────────
function StepPanel({ step }) {
  const isSAT = step.step_name?.toUpperCase() === 'SAT';
  const satImages = (!Array.isArray(step.attachments) && typeof step.attachments === 'object' && step.attachments)
    ? step.attachments
    : {};

  const [lightbox, setLightbox] = useState(null); // { url, label }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold
          ${step.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
            step.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
            step.status === 'failed'      ? 'bg-red-100 text-red-700' :
            'bg-slate-100 text-slate-500'}`}>
          {step.step_number}
        </div>
        <div>
          <h4 className="font-semibold text-slate-800 text-sm">{step.step_name}</h4>
          <StatusBadge status={step.status} />
        </div>
      </div>

      <div className="space-y-0 bg-white rounded-lg border border-slate-100 px-3 py-1">
        <InfoRow label="Started"   value={fmtDateTime(step.started_at)} />
        <InfoRow label="Completed" value={fmtDateTime(step.completed_at)} />
        <InfoRow label="Machine #" value={step.machine_no} />
        <InfoRow label="Operator"  value={step.operator_id} />
        <InfoRow label="Tray #"    value={step.tray_no} />
        <InfoRow label="Qty In"    value={step.qty_in} />
        <InfoRow label="Qty Out"   value={step.qty_out} />
        {step.custom_fields?.test_condition && (
          <InfoRow label="Test Condition" value={step.custom_fields.test_condition} />
        )}
        {step.notes && <InfoRow label="Notes" value={step.notes} />}
      </div>

      {isSAT && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">SAT Images</p>
          {[['1–24', 0], ['25–48', 3], ['49–77', 6]].map(([rangeLabel, groupStart]) => {
            const group = SAT_CATEGORIES.slice(groupStart, groupStart + 3);
            const hasAny = group.some(({ key }) => (satImages[key] || []).length > 0);
            if (!hasAny) return null;
            return (
              <div key={groupStart} className="rounded-lg border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-600">Samples {rangeLabel}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 divide-x divide-slate-200">
                  {group.map(({ key, label, optional }) => {
                    const imgs = satImages[key] || [];
                    return (
                      <div key={key} className="p-2">
                        <p className="text-xs font-semibold text-slate-500 mb-1.5 truncate">
                          {label}{optional ? ' (Opt.)' : ''}
                        </p>
                        {imgs.length > 0 ? (
                          <div className="grid grid-cols-2 gap-1">
                            {imgs.map((url, idx) => (
                              <button key={idx} onClick={() => setLightbox({ url, label: `${label} ${idx + 1}` })}
                                className="rounded overflow-hidden border border-slate-200 aspect-square block w-full">
                                <img src={url} alt={`${label} ${idx + 1}`}
                                  className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-300 italic">—</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}>
          <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setLightbox(null)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300">
              <X className="w-6 h-6" />
            </button>
            <img src={lightbox.url} alt={lightbox.label}
              className="w-full rounded-lg shadow-2xl object-contain max-h-[80vh]" />
            <p className="text-center text-slate-300 text-sm mt-2">{lightbox.label}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Request detail panel (read-only) ──────────────────────────────────────────
function RequestDetail({ request, onClose }) {
  const [selectedStep, setSelectedStep] = useState(null);
  const [selectedLeg, setSelectedLeg] = useState(1);

  const legs = [...new Set((request.steps || []).map(s => Number(s.leg) || 1))].sort((a, b) => a - b);
  const legSteps = (request.steps || []).filter(s => (Number(s.leg) || 1) === selectedLeg);

  // Reset leg when request changes
  useEffect(() => {
    setSelectedStep(null);
    setSelectedLeg(1);
  }, [request.id]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-200 bg-white sticky top-0 z-10">
        <button onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-heading font-bold text-slate-900 truncate">{request.request_number}</h2>
          <p className="text-xs text-slate-400 truncate">{request.device_name || '—'} · {request.customer || '—'}</p>
        </div>
        <StatusBadge status={request.status} />
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* General info */}
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">General Information</h3>
          <div className="space-y-0">
            <InfoRow label="Req. Number"    value={request.request_number} />
            <InfoRow label="Classification" value={request.classification} />
            <InfoRow label="Originator"     value={request.originator} />
            <InfoRow label="Plant"          value={request.plant} />
            <InfoRow label="Device Name"    value={request.device_name} />
            <InfoRow label="Lot No."        value={request.lot_no} />
            <InfoRow label="Customer"       value={request.customer} />
            <InfoRow label="Package Info"   value={request.pkg_info} />
            <InfoRow label="Automotive"     value={request.automotive} />
            <InfoRow label="Date LTC"       value={fmtDate(request.date_ltc)} />
            <InfoRow label="Product Hier."  value={request.product_hierarchy} />
            <InfoRow label="PDL"            value={request.pdl} />
            <InfoRow label="Body Size X"    value={request.body_size_x} />
            <InfoRow label="Body Size Y"    value={request.body_size_y} />
            <InfoRow label="Pkg Thickness"  value={request.package_thickness} />
            <InfoRow label="Ball Pitch"     value={request.ball_pitch} />
            <InfoRow label="Ball Count"     value={request.ball_count} />
            <InfoRow label="Lead Pitch"     value={request.lead_pitch} />
            <InfoRow label="Lead Count"     value={request.lead_count} />
            <InfoRow label="Total SS"       value={request.total_ss} />
            <InfoRow label="Deadline"       value={fmtDate(request.deadline)} />
            <InfoRow label="Created By"     value={request.created_by_username} />
            <InfoRow label="Created At"     value={fmtDateTime(request.created_at)} />
          </div>
        </div>

        {/* Purpose / Instructions */}
        {(request.purpose || request.engineer_special_instruction) && (
          <div className="p-4 border-b border-slate-100 space-y-3">
            {request.purpose && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Purpose</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{request.purpose}</p>
              </div>
            )}
            {request.engineer_special_instruction && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Engineer Special Instruction</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{request.engineer_special_instruction}</p>
              </div>
            )}
          </div>
        )}

        {/* Process steps */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Process Steps</h3>
            {legs.length > 1 && (
              <div className="flex gap-1">
                {legs.map(leg => (
                  <button key={leg}
                    onClick={() => { setSelectedLeg(leg); setSelectedStep(null); }}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      selectedLeg === leg
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}>
                    Leg {leg}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Timeline */}
          {legSteps.length > 0 && (
            <div className="mb-4">
              <ProcessTimeline steps={legSteps} currentStep={request.current_step} />
            </div>
          )}

          {/* Step list */}
          <div className="space-y-1">
            {legSteps.map(step => (
              <div key={`${step.leg}-${step.step_number}`}>
                <button
                  onClick={() => setSelectedStep(selectedStep?.step_number === step.step_number && selectedStep?.leg === step.leg ? null : step)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
                    selectedStep?.step_number === step.step_number && selectedStep?.leg === step.leg
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold
                      ${step.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        step.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        step.status === 'failed'      ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-500'}`}>
                      {step.step_number}
                    </div>
                    <span className="text-sm font-medium text-slate-700">{step.step_name}</span>
                    {step.step_name?.toUpperCase() === 'SAT' && (
                      <span className="text-xs bg-teal-50 text-teal-600 border border-teal-200 rounded px-1.5 py-0.5">Images</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={step.status} />
                    {selectedStep?.step_number === step.step_number && selectedStep?.leg === step.leg
                      ? <ChevronDown className="w-4 h-4 text-slate-400" />
                      : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>

                {/* Expanded step detail */}
                {selectedStep?.step_number === step.step_number && selectedStep?.leg === step.leg && (
                  <div className="mt-1 mb-2 p-4 rounded-lg bg-slate-50 border border-slate-200">
                    <StepPanel step={step} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main BackupViewer page ──────────────────────────────────────────────────
export default function BackupViewer() {
  const [backups, setBackups] = useState([]);
  const [loadingBackups, setLoadingBackups] = useState(true);
  const [backupsError, setBackupsError] = useState('');

  const [selectedBackup, setSelectedBackup] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState('');
  const [requests, setRequests] = useState([]);

  const [search, setSearch] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Load backup list
  useEffect(() => {
    api.getBackups()
      .then(data => { setBackups(data); setBackupsError(''); })
      .catch(e => setBackupsError(e.message))
      .finally(() => setLoadingBackups(false));
  }, []);

  const fileInputRef = useRef(null);
  const [importedEntries, setImportedEntries] = useState([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;
    setImportLoading(true);
    setImportError('');
    try {
      const data = await api.importBackupFile(file);
      const entry = {
        filename: `__imported__${file.name}`,
        label: file.name,
        _imported: true,
        _requests: data.requests || [],
        type: 'Local',
        size_mb: (file.size / (1024 * 1024)).toFixed(2),
        created_at: new Date().toISOString(),
      };
      setImportedEntries(prev => [entry, ...prev.filter(x => x.label !== file.name)]);
      setSelectedBackup(entry);
      setRequests(data.requests || []);
      setSelectedRequest(null);
      setSearch('');
    } catch (err) {
      setImportError(err.message);
    } finally {
      setImportLoading(false);
    }
  };

  const removeImportedEntry = (filename) => {
    setImportedEntries(prev => prev.filter(e => e.filename !== filename));
    if (selectedBackup?.filename === filename) {
      setSelectedBackup(null);
      setRequests([]);
      setSelectedRequest(null);
    }
  };

  const loadBackupData = async (backup) => {
    if (selectedBackup?.filename === backup.filename) {
      setSelectedBackup(null);
      setRequests([]);
      setSelectedRequest(null);
      return;
    }
    setSelectedBackup(backup);
    setSelectedRequest(null);
    setSearch('');
    // Imported (local) entries already carry their data — skip server call
    if (backup._imported) {
      setRequests(backup._requests || []);
      return;
    }
    setLoadingData(true);
    setDataError('');
    try {
      const data = await api.previewBackup(backup.filename);
      setRequests(data.requests || []);
    } catch (e) {
      setDataError(e.message);
      setRequests([]);
    } finally {
      setLoadingData(false);
    }
  };

  const filteredRequests = useMemo(() => {
    if (!search.trim()) return requests;
    const q = search.toLowerCase();
    return requests.filter(r =>
      (r.request_number || '').toLowerCase().includes(q) ||
      (r.device_name || '').toLowerCase().includes(q) ||
      (r.customer || '').toLowerCase().includes(q) ||
      (r.lot_no || '').toLowerCase().includes(q) ||
      (r.originator || '').toLowerCase().includes(q)
    );
  }, [requests, search]);

  const backupTypeColor = (type) => type === 'Manual'
    ? 'bg-blue-50 text-blue-600 border-blue-200'
    : 'bg-amber-50 text-amber-600 border-amber-200';

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left panel: backup list ── */}
      <div className="w-72 shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-y-auto">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Archive className="w-4.5 h-4.5 text-slate-600 dark:text-slate-400" />
              <h1 className="font-heading font-bold text-slate-900 dark:text-white text-base">Backup Viewer</h1>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importLoading}
              title="Import a local backup file (.zip or .xlsx)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {importLoading
                ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                : <FolderOpen className="w-3.5 h-3.5" />}
              Import
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,.xlsx"
              className="hidden"
              onChange={handleImportFile}
            />
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">Select a backup or import a local file</p>
          {importError && (
            <div className="mt-2 flex items-start gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
              <span>{importError}</span>
            </div>
          )}
        </div>

        {loadingBackups && (
          <div className="flex items-center justify-center flex-1 p-8">
            <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        )}

        {backupsError && (
          <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {backupsError}
          </div>
        )}

        {!loadingBackups && backups.length === 0 && !backupsError && (
          <div className="p-6 text-center text-slate-400">
            <Database className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No backups found</p>
          </div>
        )}

        {/* Imported (local) entries */}
        {importedEntries.length > 0 && (
          <div className="border-b border-slate-200">
            <div className="px-4 py-1.5 bg-indigo-50 border-b border-indigo-100">
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-500">Local Files</p>
            </div>
            <div className="divide-y divide-slate-100">
              {importedEntries.map(b => {
                const isSelected = selectedBackup?.filename === b.filename;
                return (
                  <div key={b.filename}
                    className={`flex items-center group transition-colors ${
                      isSelected ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : 'border-l-2 border-l-transparent hover:bg-slate-50'
                    }`}
                  >
                    <button onClick={() => loadBackupData(b)} className="flex-1 text-left px-4 py-3 min-w-0">
                      <p className={`text-xs font-bold mb-1 truncate ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>
                        {b.label}
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex text-xs px-1.5 py-0.5 rounded border font-medium bg-indigo-50 text-indigo-600 border-indigo-200">
                          📂 Local
                        </span>
                        <span className="text-xs text-slate-400">{b.size_mb} MB</span>
                        <span className="text-xs text-slate-400">{b._requests?.length || 0} req</span>
                      </div>
                    </button>
                    <button
                      onClick={() => removeImportedEntry(b.filename)}
                      title="Remove"
                      className="mr-3 p-1 rounded text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {backups.map(b => {
            const isSelected = selectedBackup?.filename === b.filename;
            return (
              <button
                key={b.filename}
                onClick={() => loadBackupData(b)}
                className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                  isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500' : 'border-l-2 border-l-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`text-xs font-bold mb-0.5 ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                      {b.filename.replace('rel_database_backup_', '').replace('.zip', '').replace('.xlsx', '')}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`inline-flex text-xs px-1.5 py-0.5 rounded border font-medium ${backupTypeColor(b.type)}`}>
                        {b.type}
                      </span>
                      {b.filename.endsWith('.zip') && (
                        <span className="inline-flex text-xs px-1.5 py-0.5 rounded border font-medium bg-teal-50 text-teal-600 border-teal-200">
                          🗜️ ZIP
                        </span>
                      )}
                      <span className="text-xs text-slate-400">{b.size_mb} MB</span>
                    </div>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isSelected ? 'text-blue-500' : 'text-slate-300'}`} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Center panel: request list or request detail ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900">
        {/* No backup selected */}
        {!selectedBackup && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
            <Archive className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-base font-medium text-slate-500">Select or import a backup to view</p>
            <p className="text-sm mt-2">Choose a backup from the left panel, or click the <span className="font-semibold text-indigo-500">Import</span> button to open a local <code className="text-xs bg-slate-100 px-1 rounded">.zip</code> or <code className="text-xs bg-slate-100 px-1 rounded">.xlsx</code> file from your computer.</p>
          </div>
        )}

        {/* Loading */}
        {selectedBackup && loadingData && (
          <div className="flex items-center justify-center flex-1">
            <div className="text-center">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Parsing backup…</p>
            </div>
          </div>
        )}

        {/* Error */}
        {selectedBackup && dataError && !loadingData && (
          <div className="m-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-700 text-sm">Failed to parse backup</p>
              <p className="text-xs text-red-500 mt-0.5">{dataError}</p>
            </div>
          </div>
        )}

        {/* Request detail (full panel) */}
        {selectedBackup && !loadingData && !dataError && selectedRequest && (
          <div className="flex-1 overflow-y-auto">
            <RequestDetail
              request={selectedRequest}
              onClose={() => setSelectedRequest(null)}
            />
          </div>
        )}

        {/* Request list */}
        {selectedBackup && !loadingData && !dataError && !selectedRequest && requests.length >= 0 && (
          <>
            {/* Toolbar */}
            <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search requests…"
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-slate-50 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400 focus:bg-white dark:focus:bg-slate-600 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
                />
                {search && (
                  <button onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-400 shrink-0">
                {filteredRequests.length} of {requests.length} request{requests.length !== 1 ? 's' : ''}
              </p>
            </div>

            {requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 p-8 text-slate-400">
                <Package className="w-10 h-10 mb-2 opacity-40" />
                <p className="text-sm">No requests found in this backup</p>
                <p className="text-xs mt-1 text-slate-300">Only completed requests are included in backups</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-5">
                <div className="space-y-2">
                  {filteredRequests.map(req => {
                    const steps = req.steps || [];
                    const completed = steps.filter(s => s.status === 'completed').length;
                    const total = steps.length;
                    const satSteps = steps.filter(s => s.step_name?.toUpperCase() === 'SAT');
                    const hasSATImages = satSteps.some(s =>
                      typeof s.attachments === 'object' && !Array.isArray(s.attachments) &&
                      Object.values(s.attachments || {}).some(arr => Array.isArray(arr) && arr.length > 0)
                    );

                    return (
                      <button
                        key={req.id || req.request_number}
                        onClick={() => setSelectedRequest(req)}
                        className="w-full text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all group"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-heading font-bold text-slate-800 dark:text-slate-200 text-sm">
                                {req.request_number}
                              </span>
                              <StatusBadge status={req.status} />
                              {hasSATImages && (
                                <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border bg-teal-50 text-teal-600 border-teal-200">
                                  <ImageIcon className="w-3 h-3" /> Images
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                              {req.device_name && <span className="font-medium text-slate-600 dark:text-slate-300">{req.device_name}</span>}
                              {req.customer && <span>{req.customer}</span>}
                              {req.lot_no && <span>Lot: {req.lot_no}</span>}
                              {req.plant && <span>{req.plant}</span>}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                              <Layers className="w-3.5 h-3.5" />
                              <span>{completed}/{total} steps</span>
                            </div>
                            {req.deadline && (
                              <div className="flex items-center gap-1 text-xs text-slate-400">
                                <Calendar className="w-3 h-3" />
                                <span>{fmtDate(req.deadline)}</span>
                              </div>
                            )}
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
                          </div>
                        </div>

                        {/* Mini timeline */}
                        {steps.length > 0 && (
                          <div className="mt-3 flex items-center gap-1 overflow-hidden">
                            {steps.slice(0, 14).map(s => (
                              <div key={`${s.leg}-${s.step_number}`}
                                title={s.step_name}
                                className={`h-1.5 flex-1 rounded-full ${
                                  s.status === 'completed'  ? 'bg-emerald-400' :
                                  s.status === 'in_progress'? 'bg-blue-400' :
                                  s.status === 'failed'     ? 'bg-red-400' :
                                  'bg-slate-200 dark:bg-slate-600'
                                }`} />
                            ))}
                            {steps.length > 14 && (
                              <span className="text-xs text-slate-300 dark:text-slate-500 ml-1">+{steps.length - 14}</span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
