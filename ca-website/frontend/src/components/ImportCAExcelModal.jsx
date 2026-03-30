import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, X, Loader2, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import api from '../api';

// Maps normalized (trimmed lowercase) Excel label → EMPTY_FORM key
// Labels are taken from the actual CA Request Sheet file (col B = left label, col K = right label)
const FIELD_MAP = {
  // General Information — exact labels from the sheet (trimmed + lowercased)
  'request number': 'title',
  'classification': 'classification',
  'originator': 'originator',
  'plant': 'plant',
  'device name': 'device_name',
  'lot no': 'lot_no',
  'customer': 'customer',
  'pkg info': 'pkg_info',
  'automotive': 'automotive',
  'date': 'sample_description',
  'purpose': 'purpose',
  'reference project': 'reference_project',
  'product hierarchy': 'product_hierarchy',
  'pdl': 'pdl',
  'body size x (mm)': 'body_size_x',
  'body size y (mm)': 'body_size_y',
  'package thickness (mm)': 'package_thickness',
  'ball pitch (mm)': 'ball_pitch',
  'ball count': 'ball_count',
  'lead pitch (mm)': 'lead_pitch',
  'lead count': 'lead_count',
  'total s/s': 'total_ss',
  // Material Information — exact labels (µ and special chars preserved after normalize)
  'bcb material': 'bcb_material',
  'bump height': 'bump_height',
  'bump material': 'bump_material',
  'bump pitch': 'bump_pitch',
  'bump size': 'bump_size',
  'bumping house': 'bumping_house',
  'chip attach flux cleaning method': 'chip_attach_flux_cleaning_method',
  'chip attach flux': 'chip_attach_flux',
  'die attach material': 'die_attach_material',
  'die coat after w/b': 'die_coat_after_wb',
  'die pad config': 'die_pad_config',
  'die pad metal': 'die_pad_metal',
  'die pad pitch(µm)': 'die_pad_pitch',
  'die passivation': 'die_passivation',
  'die size (mm)': 'die_size',
  'die thick (µm)': 'die_thick',
  'down bond': 'down_bond',
  'emc/encap material': 'emc_encap_material',
  "heat dissipation mat'l": 'heat_dissipation_matl',
  'lf ag option': 'lf_ag_option',
  'lf etch/stamp': 'lf_etch_stamp',
  'lf inner lead pitch(µm)': 'lf_inner_lead_pitch',
  'lf/sub material': 'lf_sub_material',
  'lf/sub pad size(µm)': 'lf_sub_pad_size',
  'lf/sub supplier': 'lf_sub_supplier',
  'lf/sub thickness(µm)': 'lf_sub_thickness',
  'lid attach epoxy': 'lid_attach_epoxy',
  'line width': 'line_width',
  'mfg site': 'mfg_site',
  'masking material': 'masking_material',
  'others1': 'others1',
  'others2': 'others2',
  'others3': 'others3',
  'others4': 'others4',
  'others5': 'others5',
  'passive component': 'passive_component',
  'pcb finish': 'pcb_finish',
  'plating option': 'plating_option',
  'rel site': 'rel_site',
  'solder ball attach paste': 'solder_ball_attach_paste',
  'solder ball material': 'solder_ball_material',
  'solder ball size(mm)': 'solder_ball_size',
  'solder mask material': 'solder_mask_material',
  'solder paste material': 'solder_paste_material',
  'sub layer': 'sub_layer',
  'sub pad design': 'sub_pad_design',
  'sub pad opening size': 'sub_pad_opening_size',
  'sub surface treatment': 'sub_surface_treatment',
  'ubm material': 'ubm_material',
  'ubm opening size (µm)': 'ubm_opening_size',
  'underfill material': 'underfill_material',
  'wafer type': 'wafer_type',
  'wire length max (mm)': 'wire_length_max',
  'wire material': 'wire_material',
  'wire size(µm)': 'wire_size',
  'wire supplier': 'wire_supplier',
  'wire type': 'wire_type',
};

// Human-readable labels for the preview
const FIELD_LABELS = {
  title: 'Request Number',
  classification: 'Classification',
  originator: 'Originator',
  plant: 'Plant',
  device_name: 'Device Name',
  lot_no: 'Lot No',
  customer: 'Customer',
  pkg_info: 'PKG Info',
  automotive: 'Automotive',
  sample_description: 'Date',
  reference_project: 'Reference Project',
  product_hierarchy: 'Product Hierarchy',
  pdl: 'PDL',
  body_size_x: 'Body Size X (mm)',
  body_size_y: 'Body Size Y (mm)',
  package_thickness: 'Package Thickness (mm)',
  ball_pitch: 'Ball Pitch (mm)',
  ball_count: 'Ball Count',
  lead_pitch: 'Lead Pitch (mm)',
  lead_count: 'Lead Count',
  total_ss: 'Total S/S',
  purpose: 'Purpose',
};

// Format a cell value to a readable string, handling JS Date objects from SheetJS
function cellStr(val) {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) {
    // Format as YYYY-MM-DD
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(val).trim();
}

function normalizeLabel(val) {
  return String(val ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function parseCAExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        // cellDates:true converts date serial numbers to JS Date objects
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        // ── Parse first sheet (CA LTC) for general/material information ───
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
        const fields = {};
        for (const row of rows) {
          const leftLabel = normalizeLabel(row[1]);
          const leftValue = cellStr(row[4]);
          if (leftLabel && leftValue && FIELD_MAP[leftLabel]) {
            fields[FIELD_MAP[leftLabel]] = leftValue;
          }
          const rightLabel = normalizeLabel(row[10]);
          const rightValue = cellStr(row[13]);
          if (rightLabel && rightValue && FIELD_MAP[rightLabel]) {
            fields[FIELD_MAP[rightLabel]] = rightValue;
          }
        }

        // ── Parse remaining sheets as CA Steps (one sheet = one leg) ─────
        const steps = [];
        const stepsSheets = workbook.SheetNames.slice(1); // skip CA LTC sheet
        for (const sheetName of stepsSheets) {
          const ws = workbook.Sheets[sheetName];
          const sheetRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
          // Row index 5 (Excel row 6) contains the leg title in col 4
          const legTitle = cellStr((sheetRows[5] || [])[4]);
          let currentActivity = '';
          // Data rows start at index 8 (Excel row 9, after headers at row 8)
          for (let i = 8; i < sheetRows.length; i++) {
            const row = sheetRows[i];
            if (!row) continue;
            const activity = cellStr(row[1]);   // col B
            const checkItem = cellStr(row[4]);  // col E
            if (activity) currentActivity = activity;
            if (!currentActivity) continue;
            const requirements = cellStr(row[7]);  // col H
            const qty = cellStr(row[14]);           // col O
            const remarks = cellStr(row[15]);        // col P
            if (checkItem) {
              // Sub-item under current activity group
              steps.push({ leg_name: sheetName, leg_title: legTitle, step_name: currentActivity, item_name: checkItem, requirements, qty, remarks });
            } else if (activity) {
              // Standalone activity row (no check item, e.g. "Chemical Decapsulation")
              steps.push({ leg_name: sheetName, leg_title: legTitle, step_name: currentActivity, item_name: '', requirements, qty, remarks });
            }
          }
        }

        resolve({ fields, steps });
      } catch (err) {
        reject(new Error('Failed to parse Excel file: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

const STEPS = { UPLOAD: 'upload', PARSING: 'parsing', PREVIEW: 'preview', SUBMITTING: 'submitting', SUCCESS: 'success' };

export default function ImportCAExcelModal({ onClose, onImported, currentUser }) {
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [step, setStep] = useState(STEPS.UPLOAD);
  const [parsed, setParsed] = useState(null);
  const [createdId, setCreatedId] = useState(null);
  const [error, setError] = useState('');

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) selectFile(dropped);
  };

  const handleFileSelect = (e) => {
    const selected = e.target.files[0];
    if (selected) selectFile(selected);
  };

  const selectFile = (f) => {
    if (!f.name.match(/\.(xlsx|xls)$/i)) {
      setError('Please select an Excel file (.xlsx or .xls)');
      return;
    }
    setError('');
    setFile(f);
  };

  const handleParse = async () => {
    if (!file) return;
    setStep(STEPS.PARSING);
    setError('');
    try {
      const data = await parseCAExcel(file);
      if (!data.fields.title) {
        setError('Could not find "Request Number" in the Excel file. Please ensure the sheet matches the CA Request Sheet format.');
        setStep(STEPS.UPLOAD);
        return;
      }
      setParsed(data);
      setStep(STEPS.PREVIEW);
    } catch (err) {
      setError(err.message);
      setStep(STEPS.UPLOAD);
    }
  };

  const handleSubmit = async () => {
    setStep(STEPS.SUBMITTING);
    setError('');
    try {
      const payload = {
        ...parsed.fields,
        lot_number: parsed.fields.lot_no || '',
        device: parsed.fields.device_name || '',
        submitter_name: currentUser || '',
        priority: 'Normal',
      };
      console.log('[ImportCAExcelModal] Submitting payload:', payload);
      const res = await api.post('/api/requests', payload);
      const reqId = res.data.id;
      console.log('[ImportCAExcelModal] Created request:', res.data);
      // Import CA Steps checklist from all legs
      if (parsed.steps && parsed.steps.length > 0) {
        await api.post(`/api/requests/${reqId}/checklist/bulk`, parsed.steps);
        console.log(`[ImportCAExcelModal] Imported ${parsed.steps.length} checklist items`);
      }
      setCreatedId(reqId);
      setStep(STEPS.SUCCESS);
      onImported(); // refresh list in background
    } catch (err) {
      console.error('[ImportCAExcelModal] Submit error:', err);
      const detail = err.response?.data?.detail;
      const message = Array.isArray(detail)
        ? detail.map(e => e.msg || JSON.stringify(e)).join('; ')
        : (detail || err.message || 'Failed to create request');
      setError(message);
      setStep(STEPS.PREVIEW);
    }
  };

  const filledFields = parsed ? Object.entries(parsed.fields).filter(([, v]) => v).length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">Import CA Request from Excel</h2>
              <p className="text-xs text-slate-400 mt-0.5">Upload a CA Request Sheet (.xlsx) to auto-fill all fields</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {/* UPLOAD step */}
          {(step === STEPS.UPLOAD || step === STEPS.PARSING) && (
            <div className="space-y-4">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center p-10 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                  dragActive
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10'
                    : file
                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" />
                {file ? (
                  <>
                    <FileSpreadsheet className="w-10 h-10 mb-2 text-emerald-500" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{file.name}</p>
                    <p className="text-xs text-slate-400 mt-1">{(file.size / 1024).toFixed(1)} KB — click to change</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-10 h-10 mb-3 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      Drop your <span className="text-violet-600 dark:text-violet-400">CA Request Sheet</span> here
                    </p>
                    <p className="text-xs text-slate-400 mt-1">or click to browse — .xlsx, .xls</p>
                  </>
                )}
              </div>

              {file && (
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); setError(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove file
                </button>
              )}

              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                <p className="font-medium text-slate-600 dark:text-slate-300">How it works:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Upload a standard CA Request Sheet (.xlsx)</li>
                  <li>All fields (General + Material Information) are parsed automatically</li>
                  <li>The <strong>Request Number</strong> from the sheet becomes the CA request title</li>
                  <li>Review the parsed data before submitting</li>
                </ul>
              </div>
            </div>
          )}

          {/* PARSING step */}
          {step === STEPS.PARSING && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Parsing Excel file…</p>
            </div>
          )}

          {/* PREVIEW step */}
          {step === STEPS.PREVIEW && parsed && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Parsed <strong className="text-slate-900 dark:text-white">{filledFields}</strong> fields from <span className="font-medium">{file?.name}</span></span>
              </div>

              {/* CA Steps summary */}
              {parsed.steps?.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                  <span className="text-violet-700 dark:text-violet-300">
                    Found <strong>{parsed.steps.length}</strong> checklist items across <strong>{new Set(parsed.steps.map(s => s.leg_name)).size}</strong> leg(s):{' '}
                    {[...new Set(parsed.steps.map(s => s.leg_name))].join(', ')}
                  </span>
                </div>
              )}

              {/* General Information preview */}
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-200 dark:border-slate-700 mb-2">General Information</div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                  {Object.entries(FIELD_LABELS).map(([key, label]) => (
                    parsed.fields[key] ? (
                      <div key={key} className="flex gap-2">
                        <span className="text-slate-500 dark:text-slate-400 shrink-0 min-w-[110px] text-xs">{label}:</span>
                        <span className="text-slate-900 dark:text-white font-medium text-xs truncate" title={parsed.fields[key]}>{parsed.fields[key]}</span>
                      </div>
                    ) : null
                  ))}
                </div>
              </div>

              {/* Material Information preview — show count only */}
              {(() => {
                const matKeys = Object.keys(parsed.fields).filter(k => !Object.keys(FIELD_LABELS).includes(k) && parsed.fields[k]);
                return matKeys.length > 0 ? (
                  <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-200 dark:border-slate-700 mb-2">Material Information</div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                      {matKeys.map(k => (
                        <div key={k} className="flex gap-2">
                          <span className="text-slate-500 dark:text-slate-400 shrink-0 min-w-[140px] text-xs capitalize">{k.replace(/_/g, ' ')}:</span>
                          <span className="text-slate-900 dark:text-white font-medium text-xs truncate" title={parsed.fields[k]}>{parsed.fields[k]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          )}

          {/* SUBMITTING step */}
          {step === STEPS.SUBMITTING && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Creating CA request…</p>
            </div>
          )}

          {/* SUCCESS step */}
          {step === STEPS.SUCCESS && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              <p className="text-base font-semibold text-slate-900 dark:text-white">Request created successfully!</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">CA request <strong>{parsed?.fields?.title}</strong> has been imported.</p>
              {parsed?.steps?.length > 0 && (
                <p className="text-xs text-violet-400">{parsed.steps.length} checklist items imported across {new Set(parsed.steps.map(s => s.leg_name)).size} leg(s)</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-900/60">
          {step === STEPS.SUCCESS ? (
            <button onClick={() => { onClose(); if (createdId) navigate(`/requests/${createdId}`); }}
              className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors">
              View Request →
            </button>
          ) : step === STEPS.PREVIEW ? (
            <>
              <button onClick={() => { setStep(STEPS.UPLOAD); setParsed(null); }}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                ← Back
              </button>
              <button onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                Cancel
              </button>
              <button onClick={handleSubmit}
                className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors">
                Create Request
              </button>
            </>
          ) : (
            <>
              <button onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                Cancel
              </button>
              <button onClick={handleParse} disabled={!file || step === STEPS.PARSING}
                className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium transition-colors">
                {step === STEPS.PARSING ? 'Parsing…' : 'Parse & Preview'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
