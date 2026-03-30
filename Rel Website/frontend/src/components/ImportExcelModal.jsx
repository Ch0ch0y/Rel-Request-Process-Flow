import { useState, useRef, useEffect } from 'react';
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import api from '../api';

const STEPS = {
  UPLOAD: 'upload',
  PROCESSING: 'processing',
  RESULTS: 'results',
};

export default function ImportExcelModal({ open, onClose, onImported }) {
  const [step, setStep] = useState(STEPS.UPLOAD);
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
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
    const valid = Array.from(newFiles).filter(
      f => f.name.toLowerCase().endsWith('.xlsx') || f.name.toLowerCase().endsWith('.xls')
    );
    if (valid.length === 0) {
      setError('Only Excel files (.xlsx) are supported');
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

  const handleImport = async () => {
    if (files.length === 0) return;
    setStep(STEPS.PROCESSING);
    setError('');
    try {
      const res = await api.importExcel(files);
      setResult(res);
      setStep(STEPS.RESULTS);
      if (res.created > 0) onImported();
    } catch (err) {
      setError(err.message);
      setStep(STEPS.UPLOAD);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold text-slate-900">Import Request Sheets</h2>
              <p className="text-xs text-slate-400">Upload Reliability Test Request Sheet files (.xlsx)</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {step === STEPS.UPLOAD && (
            <div className="space-y-4">
              {/* Drop zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed cursor-pointer transition-all ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : files.length > 0
                    ? 'border-emerald-300 bg-emerald-50/50'
                    : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Upload className={`w-10 h-10 mb-2 ${files.length > 0 ? 'text-emerald-400' : 'text-slate-300'}`} />
                <p className="text-sm font-medium text-slate-600">
                  Drop your <span className="text-blue-600">Reliability Test Request Sheets</span> here
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Select one or multiple .xlsx files — each file creates one request
                </p>
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">
                    {files.length} file{files.length !== 1 ? 's' : ''} selected
                  </p>
                  <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 group">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span className="text-sm text-slate-700 truncate flex-1" title={f.name}>
                          {f.name}
                        </span>
                        <span className="text-xs text-slate-400 flex-shrink-0">
                          {(f.size / 1024).toFixed(0)} KB
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                          className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tips */}
              <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500 space-y-1">
                <p className="font-medium text-slate-600">How it works:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Each .xlsx file should be a standard Reliability Test Request Sheet</li>
                  <li>General info is read from fixed cells (D8–D18, O8–O17)</li>
                  <li>The original REL# from the sheet is used as the request number</li>
                  <li>Leg traveller sections (LEG 1, LEG 2 …) are imported as process steps with pre-filled Test Item, Condition, Qty, Operator, Machine, and Tray data</li>
                  <li>Files without traveller sections use the 16 default process steps</li>
                </ul>
              </div>
            </div>
          )}

          {step === STEPS.PROCESSING && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
              <p className="text-sm font-medium text-slate-700">
                Processing {files.length} file{files.length !== 1 ? 's' : ''}...
              </p>
              <p className="text-xs text-slate-400 mt-1">Reading request sheets and creating entries</p>
            </div>
          )}

          {step === STEPS.RESULTS && result && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-slate-800">{result.total_files}</p>
                  <p className="text-xs text-slate-500">Files</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{result.created}</p>
                  <p className="text-xs text-emerald-600">Created</p>
                </div>
                <div className={`rounded-lg p-3 text-center ${result.failed > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
                  <p className={`text-2xl font-bold ${result.failed > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                    {result.failed}
                  </p>
                  <p className={`text-xs ${result.failed > 0 ? 'text-red-500' : 'text-slate-400'}`}>Failed</p>
                </div>
              </div>

              {/* Created list */}
              {result.created_requests?.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">
                    Created Requests
                  </p>
                  <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                    {result.created_requests.map((req, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span className="font-mono font-bold text-blue-700">{req.request_number}</span>
                        {req.device_name && (
                          <span className="text-slate-400 text-xs truncate">— {req.device_name}</span>
                        )}
                        {req.legs != null && (
                          <span className="ml-auto text-xs text-blue-500 flex-shrink-0">
                            {req.legs} leg{req.legs !== 1 ? 's' : ''}, {req.leg_items} step{req.leg_items !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Errors */}
              {result.errors?.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-red-500 mb-2">
                    Errors
                  </p>
                  <div className="max-h-32 overflow-y-auto border border-red-200 rounded-lg divide-y divide-red-100 bg-red-50/50">
                    {result.errors.map((err, i) => (
                      <div key={i} className="px-3 py-2 text-sm">
                        <span className="font-medium text-red-700">{err.file}:</span>{' '}
                        <span className="text-red-600">{err.errors.join('; ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex gap-3 justify-end flex-shrink-0">
          {step === STEPS.UPLOAD && (
            <>
              <button onClick={handleClose}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium">
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={files.length === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 shadow-sm inline-flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Import {files.length > 0 ? `${files.length} File${files.length !== 1 ? 's' : ''}` : ''}
              </button>
            </>
          )}
          {step === STEPS.RESULTS && (
            <>
              <button onClick={reset}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium">
                Import More
              </button>
              <button onClick={handleClose}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium shadow-sm">
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
