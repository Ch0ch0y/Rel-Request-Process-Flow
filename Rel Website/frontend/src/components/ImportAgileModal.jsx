import { useState, useRef, useEffect } from 'react';
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Trash2, Eye, Copy } from 'lucide-react';
import api from '../api';

const STEPS = {
  UPLOAD: 'upload',
  PREVIEW: 'preview',
  PROCESSING: 'processing',
  DUPLICATE: 'duplicate',
  RESULTS: 'results',
};

export default function ImportAgileModal({ open, onClose, onImported }) {
  const [step, setStep] = useState(STEPS.UPLOAD);
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [duplicateRR, setDuplicateRR] = useState('');
  const [duplicateAction, setDuplicateAction] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      document.body.classList.add('modal-open');
      return () => document.body.classList.remove('modal-open');
    }
  }, [open]);

  if (!open) return null;

  const reset = () => {
    setStep(STEPS.UPLOAD);
    setFile(null);
    setError('');
    setPreview(null);
    setResult(null);
    setDuplicateRR('');
    setDuplicateAction(null);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const setValidFile = (f) => {
    if (!f) return;
    const name = f.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      setError('Only Excel files (.xlsx / .xls) are supported.');
      return;
    }
    setFile(f);
    setError('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) setValidFile(e.dataTransfer.files[0]);
  };

  const handleFileSelect = (e) => {
    if (e.target.files?.[0]) {
      setValidFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  // ── Step 1: Preview (scan the file, show what was extracted) ────────────────
  const handlePreview = async () => {
    if (!file) return;
    setStep(STEPS.PROCESSING);
    setError('');
    try {
      const data = await api.previewAgileExcel(file);
      setPreview(data);
      setStep(STEPS.PREVIEW);
    } catch (err) {
      setError(err.message || 'Failed to parse the Agile Excel file.');
      setStep(STEPS.UPLOAD);
    }
  };

  // ── Step 2: Confirm & import ─────────────────────────────────────────────────
  const handleImport = async (action = null) => {
    if (!file) return;
    setStep(STEPS.PROCESSING);
    setError('');
    try {
      const res = await api.importAgileExcel(file, action);
      setResult(res);
      setStep(STEPS.RESULTS);
      if (res.request_number) onImported();
    } catch (err) {
      if (err.status === 409) {
        // Extract the RR# from the error message: "Request 'XXXX' already exists"
        const m = err.message.match(/'([^']+)'/);
        setDuplicateRR(m ? m[1] : preview?.request_number || '');
        setDuplicateAction(null);
        setStep(STEPS.DUPLICATE);
      } else {
        setError(err.message || 'Import failed.');
        setStep(STEPS.PREVIEW);
      }
    }
  };

  const handleResolveDuplicate = () => {
    if (!duplicateAction) return;
    if (duplicateAction === 'cancel') { setStep(STEPS.PREVIEW); return; }
    handleImport(duplicateAction);
  };

  // ── Preview table helper ─────────────────────────────────────────────────────
  const previewField = (label, value) => {
    if (!value && value !== 0) return null;
    return (
      <div key={label} className="flex gap-2 text-sm">
        <span className="w-44 flex-shrink-0 text-slate-500">{label}</span>
        <span className="font-medium text-slate-800 break-all">{String(value)}</span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-50 rounded-lg">
              <FileSpreadsheet className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold text-slate-900">Import From Agile</h2>
              <p className="text-xs text-slate-400">Scan an Agile Excel file and auto-fill the request</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto flex-1">

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* ── UPLOAD ── */}
          {step === STEPS.UPLOAD && (
            <div className="space-y-4">
              <div
                onDragEnter={handleDrag} onDragLeave={handleDrag}
                onDragOver={handleDrag} onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center p-10 rounded-lg border-2 border-dashed cursor-pointer transition-all ${
                  dragActive
                    ? 'border-violet-500 bg-violet-50'
                    : file
                    ? 'border-violet-300 bg-violet-50/50'
                    : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef} type="file" accept=".xlsx,.xls"
                  onChange={handleFileSelect} className="hidden"
                />
                <Upload className={`w-10 h-10 mb-3 ${file ? 'text-violet-400' : 'text-slate-300'}`} />
                <p className="text-sm font-medium text-slate-600">
                  Drop your <span className="text-violet-600">Agile Excel file</span> here
                </p>
                <p className="text-xs text-slate-400 mt-1">Supports .xlsx and .xls files</p>
              </div>

              {file && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <FileSpreadsheet className="w-5 h-5 text-violet-500 flex-shrink-0" />
                  <span className="flex-1 text-sm font-medium text-slate-700 truncate">{file.name}</span>
                  <span className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</span>
                  <button onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── PROCESSING ── */}
          {step === STEPS.PROCESSING && (
            <div className="flex flex-col items-center justify-center py-14 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-violet-600" />
              <p className="text-slate-600 font-medium">Scanning Agile file…</p>
              <p className="text-xs text-slate-400">Extracting request fields and detecting process steps per leg</p>
            </div>
          )}

          {/* ── PREVIEW ── */}
          {step === STEPS.PREVIEW && preview && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-sm font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
                <Eye className="w-4 h-4" />
                Review the extracted data before importing
              </div>

              {/* Request fields */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Request Fields</h3>
                <div className="bg-slate-50 rounded-lg border border-slate-200 px-4 py-3 space-y-1.5">
                  {[
                    ['Request Number',   preview.request_number],
                    ['Classification',   preview.classification],
                    ['Originator',       preview.originator],
                    ['Plant',            preview.plant],
                    ['Device Name',      preview.device_name],
                    ['Lot No.',          preview.lot_no],
                    ['Customer',         preview.customer],
                    ['Package Info',     preview.pkg_info],
                    ['Product Hierarchy',preview.product_hierarchy],
                    ['PDL',              preview.pdl],
                    ['Body Size X',      preview.body_size_x],
                    ['Body Size Y',      preview.body_size_y],
                    ['Package Thickness',preview.package_thickness],
                    ['Ball Pitch',       preview.ball_pitch],
                    ['Ball Count',       preview.ball_count],
                    ['Lead Count',       preview.lead_count],
                    ['Total SS',         preview.total_ss],
                    ['Purpose',          preview.purpose],
                  ].map(([label, val]) => previewField(label, val)).filter(Boolean)}
                </div>
              </div>

              {/* Process steps per leg */}
              {preview.legs && preview.legs.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Process Steps ({preview.legs.length} leg{preview.legs.length > 1 ? 's' : ''} detected)
                  </h3>
                  <div className="space-y-3">
                    {preview.legs.map((leg) => (
                      <div key={leg.leg_num} className="bg-slate-50 rounded-lg border border-slate-200 px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold text-violet-700">LEG {leg.leg_num}</p>
                          {leg.process_type && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                              {leg.process_type}
                            </span>
                          )}
                        </div>
                        {leg.steps.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No steps detected</p>
                        ) : (
                          <ol className="text-xs text-slate-600 space-y-0.5 list-decimal list-inside">
                            {leg.steps.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ol>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── DUPLICATE ── */}
          {step === STEPS.DUPLICATE && (
            <div className="space-y-5">
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Request already exists</p>
                  <p className="text-sm text-amber-700 mt-0.5">
                    <span className="font-mono font-bold">{duplicateRR}</span> is already in the system.
                    How would you like to proceed?
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Duplicate */}
                <button
                  onClick={() => setDuplicateAction('duplicate')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                    duplicateAction === 'duplicate'
                      ? 'border-violet-500 bg-violet-50 text-violet-800'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Copy className="w-5 h-5" />
                  <span className="text-sm font-semibold">Duplicate</span>
                  <span className="text-xs text-slate-500 leading-tight">Save as {duplicateRR}-DUP</span>
                </button>

                {/* New Number */}
                <button
                  onClick={() => setDuplicateAction('new_number')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                    duplicateAction === 'new_number'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <FileSpreadsheet className="w-5 h-5" />
                  <span className="text-sm font-semibold">New Number</span>
                  <span className="text-xs text-slate-500 leading-tight">Auto-assign new REL#</span>
                </button>

                {/* Cancel */}
                <button
                  onClick={() => setDuplicateAction('cancel')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                    duplicateAction === 'cancel'
                      ? 'border-red-400 bg-red-50 text-red-700'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <X className="w-5 h-5" />
                  <span className="text-sm font-semibold">Cancel</span>
                  <span className="text-xs text-slate-500 leading-tight">Go back to preview</span>
                </button>
              </div>
            </div>
          )}

          {/* ── RESULTS ── */}
          {step === STEPS.RESULTS && result && (
            <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
              {result.request_number ? (
                <>
                  <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                  <div>
                    <p className="text-lg font-semibold !text-black">Import Successful</p>
                    <p className="text-sm !text-black mt-1">
                      Request created with {result.num_legs} leg{result.num_legs !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {result.request_number && (
                    <p className="text-sm font-mono bg-slate-100 !text-black px-3 py-1 rounded">{result.request_number}</p>
                  )}
                </>
              ) : (
                <>
                  <AlertCircle className="w-12 h-12 text-amber-500" />
                  <div>
                    <p className="text-lg font-semibold !text-black">Nothing Imported</p>
                    <p className="text-sm !text-black mt-1">{result.message || 'No new requests were created.'}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex-shrink-0">
          <button onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors">
            {step === STEPS.RESULTS ? 'Close' : 'Cancel'}
          </button>

          {step === STEPS.UPLOAD && (
            <button onClick={handlePreview} disabled={!file}
              className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors">
              <Eye className="w-4 h-4" /> Preview
            </button>
          )}

          {step === STEPS.PREVIEW && (
            <>
              <button onClick={() => setStep(STEPS.UPLOAD)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors">
                Back
              </button>
              <button onClick={() => handleImport(null)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors">
                <Upload className="w-4 h-4" /> Import Request
              </button>
            </>
          )}

          {step === STEPS.DUPLICATE && (
            <>
              <button onClick={() => setStep(STEPS.PREVIEW)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors">
                Back
              </button>
              <button
                onClick={handleResolveDuplicate}
                disabled={!duplicateAction}
                className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors">
                Confirm
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
