import { useState, useRef, useEffect } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle, Loader2, Trash2, Copy } from 'lucide-react';
import api from '../api';

const STEPS = {
  UPLOAD: 'upload',
  PROCESSING: 'processing',
  DUPLICATE: 'duplicate',
  RESULTS: 'results',
};

export default function ImportWordModal({ open, onClose, onImported }) {
  const [step, setStep] = useState(STEPS.UPLOAD);
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [pendingDuplicates, setPendingDuplicates] = useState([]);
  const [duplicateActions, setDuplicateActions] = useState({});
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
    setFiles([]);
    setError('');
    setResult(null);
    setPendingDuplicates([]);
    setDuplicateActions({});
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const addFiles = (newFiles) => {
    const valid = Array.from(newFiles).filter(f => f.name.toLowerCase().endsWith('.docx'));
    if (valid.length === 0) {
      setError('Only Word files (.docx) are supported');
      return;
    }
    setFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name));
      const unique = valid.filter(f => !existingNames.has(f.name));
      return [...prev, ...unique];
    });
    setError('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const handleFileSelect = (e) => {
    if (e.target.files?.length) {
      addFiles(e.target.files);
      e.target.value = '';
    }
  };

  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const setDupAction = (filename, action) => {
    setDuplicateActions(prev => ({ ...prev, [filename]: action }));
  };

  const handleImport = async () => {
    if (files.length === 0) return;
    setStep(STEPS.PROCESSING);
    setError('');
    try {
      const res = await api.importWord(files);
      if (res.duplicates?.length > 0) {
        setResult(res);
        setPendingDuplicates(res.duplicates);
        setDuplicateActions({});
        setStep(STEPS.DUPLICATE);
        if (res.created > 0) onImported();
      } else {
        setResult(res);
        setStep(STEPS.RESULTS);
        if (res.created > 0) onImported();
      }
    } catch (err) {
      setError(err.message);
      setStep(STEPS.UPLOAD);
    }
  };

  const handleResolveDuplicates = async () => {
    const actionsToSend = {};
    const filesToProcess = [];

    for (const dup of pendingDuplicates) {
      const action = duplicateActions[dup.file];
      if (action && action !== 'cancel') {
        actionsToSend[dup.file] = action;
        const f = files.find(file => file.name === dup.file);
        if (f) filesToProcess.push(f);
      }
    }

    if (filesToProcess.length === 0) {
      setStep(STEPS.RESULTS);
      return;
    }

    setStep(STEPS.PROCESSING);
    try {
      const res = await api.importWord(filesToProcess, actionsToSend);
      setResult(prev => ({
        total_files: (prev?.total_files || 0) + res.total_files,
        created: (prev?.created || 0) + res.created,
        failed: (prev?.failed || 0) + res.failed,
        created_requests: [...(prev?.created_requests || []), ...(res.created_requests || [])],
        errors: [...(prev?.errors || []), ...(res.errors || [])],
      }));
      setStep(STEPS.RESULTS);
      if (res.created > 0) onImported();
    } catch (err) {
      setError(err.message);
      setStep(STEPS.DUPLICATE);
    }
  };

  const allDuplicatesResolved = pendingDuplicates.every(dup => duplicateActions[dup.file]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold text-slate-900">Import Word Travellers</h2>
              <p className="text-slate-500 text-sm">Reliability Test Traveller (.docx)</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ── UPLOAD STEP ── */}
          {step === STEPS.UPLOAD && (
            <div className="space-y-4">
              {/* Drop zone */}
              <div
                onDragEnter={handleDrag} onDragOver={handleDrag}
                onDragLeave={handleDrag} onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                  ${dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'}`}
              >
                <input
                  ref={fileInputRef} type="file" multiple accept=".docx"
                  className="hidden" onChange={handleFileSelect}
                />
                <Upload className="w-8 h-8 mx-auto mb-3 text-slate-400" />
                <p className="font-medium text-slate-700">Drop .docx files here</p>
                <p className="text-sm text-slate-400 mt-1">or click to browse</p>
                <p className="text-xs text-slate-400 mt-2">One request per file · Multiple files allowed</p>
              </div>

              {/* File list */}
              {files.length > 0 && (
                <ul className="space-y-2">
                  {files.map((f, i) => (
                    <li key={i}
                      className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
                      <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span className="text-sm text-slate-700 truncate flex-1">{f.name}</span>
                      <span className="text-xs text-slate-400 flex-shrink-0">
                        {(f.size / 1024).toFixed(0)} KB
                      </span>
                      <button onClick={() => removeFile(i)}
                        className="p-1 hover:bg-slate-200 rounded transition-colors flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* ── PROCESSING STEP ── */}
          {step === STEPS.PROCESSING && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              <p className="text-slate-600 font-medium">Processing {files.length} file{files.length > 1 ? 's' : ''}…</p>
              <p className="text-slate-400 text-sm">Parsing Word document tables</p>
            </div>
          )}

          {/* ── DUPLICATE STEP ── */}
          {step === STEPS.DUPLICATE && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  {pendingDuplicates.length} request{pendingDuplicates.length !== 1 ? 's' : ''} already exist{pendingDuplicates.length === 1 ? 's' : ''} in the system. Choose what to do for each:
                </p>
              </div>
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {pendingDuplicates.map((dup) => {
                  const selected = duplicateActions[dup.file];
                  return (
                    <div key={dup.file} className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
                        <p className="font-mono text-sm font-bold text-blue-700">{dup.request_number}</p>
                        <p className="text-xs text-slate-500 truncate">{dup.file}{dup.device_name ? ` — ${dup.device_name}` : ''}</p>
                      </div>
                      <div className="flex divide-x divide-slate-200">
                        <button
                          onClick={() => setDupAction(dup.file, 'duplicate')}
                          className={`flex-1 flex flex-col items-center gap-1 px-3 py-2.5 text-xs font-medium transition-all ${
                            selected === 'duplicate'
                              ? 'bg-amber-500 text-white'
                              : 'hover:bg-amber-50 text-slate-600'
                          }`}
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Duplicate
                          <span className={`text-[10px] font-normal ${selected === 'duplicate' ? 'text-amber-100' : 'text-slate-400'}`}>
                            saves as {dup.request_number}-DUP
                          </span>
                        </button>
                        <button
                          onClick={() => setDupAction(dup.file, 'new_number')}
                          className={`flex-1 flex flex-col items-center gap-1 px-3 py-2.5 text-xs font-medium transition-all ${
                            selected === 'new_number'
                              ? 'bg-blue-600 text-white'
                              : 'hover:bg-blue-50 text-slate-600'
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          New Number
                          <span className={`text-[10px] font-normal ${selected === 'new_number' ? 'text-blue-100' : 'text-slate-400'}`}>
                            auto assigns RMS#
                          </span>
                        </button>
                        <button
                          onClick={() => setDupAction(dup.file, 'cancel')}
                          className={`flex-1 flex flex-col items-center gap-1 px-3 py-2.5 text-xs font-medium transition-all ${
                            selected === 'cancel'
                              ? 'bg-slate-600 text-white'
                              : 'hover:bg-slate-100 text-slate-600'
                          }`}
                        >
                          <X className="w-3.5 h-3.5" />
                          Cancel
                          <span className={`text-[10px] font-normal ${selected === 'cancel' ? 'text-slate-300' : 'text-slate-400'}`}>
                            skip this file
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── RESULTS STEP ── */}
          {step === STEPS.RESULTS && result && (
            <div className="space-y-4">
              {/* Summary bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-2xl font-bold text-slate-900">{result.total_files}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Total Files</p>
                </div>
                <div className="text-center p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                  <p className="text-2xl font-bold text-emerald-700">{result.created}</p>
                  <p className="text-xs text-emerald-600 mt-0.5">Imported</p>
                </div>
                <div className={`text-center p-3 rounded-lg border ${result.failed > 0 ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                  <p className={`text-2xl font-bold ${result.failed > 0 ? 'text-red-700' : 'text-slate-400'}`}>{result.failed}</p>
                  <p className={`text-xs mt-0.5 ${result.failed > 0 ? 'text-red-600' : 'text-slate-400'}`}>Failed</p>
                </div>
              </div>

              {/* Created list */}
              {result.created_requests?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">Successfully imported</p>
                  <ul className="space-y-1.5">
                    {result.created_requests.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 p-2.5 bg-emerald-50 rounded-lg border border-emerald-100">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="font-mono text-base font-bold text-blue-700">{r.request_number}</p>
                          <p className="text-xs text-slate-500 truncate">{r.device_name}{r.customer ? ` · ${r.customer}` : ''}</p>
                          {r.warnings?.map((w, j) => (
                            <p key={j} className="text-xs text-amber-600 mt-0.5">⚠ {w}</p>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Error list */}
              {result.errors?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">Failed files</p>
                  <ul className="space-y-1.5">
                    {result.errors.map((e, i) => (
                      <li key={i} className="flex items-start gap-2 p-2.5 bg-red-50 rounded-lg border border-red-100">
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{e.file}</p>
                          {e.errors?.map((msg, j) => (
                            <p key={j} className="text-xs text-red-600 mt-0.5">{msg}</p>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 flex-shrink-0">
          {step === STEPS.RESULTS ? (
            <button onClick={handleClose}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium text-sm transition-colors">
              Done
            </button>
          ) : step === STEPS.DUPLICATE ? (
            <>
              <button onClick={handleClose}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium text-sm transition-colors">
                Cancel All
              </button>
              <button
                onClick={handleResolveDuplicates}
                disabled={!allDuplicatesResolved}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-colors">
                Confirm
              </button>
            </>
          ) : (
            <>
              <button onClick={handleClose}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium text-sm transition-colors">
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={files.length === 0 || step === STEPS.PROCESSING}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                  text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2">
                {step === STEPS.PROCESSING
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</>
                  : <><Upload className="w-4 h-4" /> Import {files.length > 0 ? `${files.length} File${files.length > 1 ? 's' : ''}` : ''}</>
                }
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
