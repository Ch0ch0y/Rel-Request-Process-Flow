import { useState, useRef, useEffect } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import api from '../api';

const STEPS = { UPLOAD: 'upload', PROCESSING: 'processing', RESULTS: 'results' };

export default function ImportWhiskerModal({ open, onClose, onImported }) {
  const [step, setStep]             = useState(STEPS.UPLOAD);
  const [file, setFile]             = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError]           = useState('');
  const [result, setResult]         = useState(null);
  const fileInputRef                = useRef(null);

  useEffect(() => {
    if (open) {
      document.body.classList.add('modal-open');
      return () => document.body.classList.remove('modal-open');
    }
  }, [open]);

  if (!open) return null;

  const reset = () => { setStep(STEPS.UPLOAD); setFile(null); setError(''); setResult(null); };
  const handleClose = () => { reset(); onClose(); };

  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else setDragActive(false);
  };

  const pickFile = (f) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.docx')) {
      setError('Only Word files (.docx) are supported'); return;
    }
    setFile(f); setError('');
  };

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer.files?.[0]) pickFile(e.dataTransfer.files[0]);
  };

  const handleFileSelect = (e) => {
    if (e.target.files?.[0]) { pickFile(e.target.files[0]); e.target.value = ''; }
  };

  const handleImport = async () => {
    if (!file) return;
    setStep(STEPS.PROCESSING); setError('');
    try {
      const res = await api.importWhisker(file);
      setResult(res);
      setStep(STEPS.RESULTS);
      onImported();
    } catch (err) {
      setError(err.message || 'Import failed');
      setStep(STEPS.UPLOAD);
    }
  };

  const PreconBadge = ({ precon }) =>
    precon && precon.toLowerCase() !== 'no precon'
      ? <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5 font-medium">{precon}</span>
      : <span className="text-xs text-slate-400">—</span>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[88vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-50 rounded-lg">
              <FileText className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold text-slate-900">Import Whisker Test</h2>
              <p className="text-slate-500 text-sm">Whisker Test Request Form (.docx) — auto-creates legs per test matrix</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── UPLOAD ── */}
          {step === STEPS.UPLOAD && (
            <div className="space-y-4">
              <div
                onDragEnter={handleDrag} onDragOver={handleDrag}
                onDragLeave={handleDrag} onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                  ${dragActive ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-teal-400 hover:bg-slate-50'}`}
              >
                <input ref={fileInputRef} type="file" accept=".docx" className="hidden" onChange={handleFileSelect} />
                <Upload className="w-8 h-8 mx-auto mb-3 text-slate-400" />
                {file ? (
                  <>
                    <p className="font-medium text-teal-700">{file.name}</p>
                    <p className="text-sm text-slate-400 mt-1">{(file.size / 1024).toFixed(0)} KB · click to change</p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-slate-700">Drop a Whisker Test Request Form here</p>
                    <p className="text-sm text-slate-400 mt-1">or click to browse · .docx only</p>
                  </>
                )}
              </div>

              {/* What gets auto-filled */}
              <div className="rounded-lg bg-teal-50 border border-teal-200 p-4">
                <p className="text-sm font-semibold text-teal-800 mb-2">What is auto-imported</p>
                <ul className="text-sm text-teal-700 space-y-1 list-disc list-inside">
                  <li>Device name, package info, factory, plating from Package &amp; Process tables</li>
                  <li>One <strong>leg per row</strong> in the test matrix</li>
                  <li>Step 6 = <strong>Whisker Test</strong> with Test Item, Condition and Read Points auto-filled</li>
                  <li><strong>Preconditioning (Precon)</strong> step inserted only when specified (not "No Precon")</li>
                  <li>Sample size (SS) set as qty_in on the Whisker Test step</li>
                  <li>REL number auto-assigned following the last existing number</li>
                </ul>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* ── PROCESSING ── */}
          {step === STEPS.PROCESSING && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
              <p className="text-slate-600 font-medium">Parsing Whisker Test document…</p>
              <p className="text-slate-400 text-sm">Extracting test matrix and building legs</p>
            </div>
          )}

          {/* ── RESULTS ── */}
          {step === STEPS.RESULTS && result && (
            <div className="space-y-5">
              {/* Success banner */}
              <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-800">Request created successfully</p>
                  <p className="text-sm text-emerald-700 mt-0.5">
                    <span className="font-mono font-bold">{result.request_number}</span>
                    {' · '}{result.num_legs} leg{result.num_legs !== 1 ? 's' : ''} imported
                  </p>
                </div>
              </div>

              {/* Package summary */}
              <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
                <div className="px-4 py-2.5 bg-slate-50 rounded-t-lg">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Request Summary</p>
                </div>
                {[
                  ['REL Number', result.request_number],
                  ['Device',     result.device_name],
                  ['Package',    result.pkg_info],
                  ['Factory',    result.factory],
                  ['Legs',       result.num_legs],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center px-4 py-2 text-sm">
                    <span className="text-slate-500 w-28 flex-shrink-0">{label}</span>
                    <span className="font-medium text-slate-800">{value}</span>
                  </div>
                ))}
              </div>

              {/* Leg table */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Test Legs</p>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                        <th className="px-3 py-2 text-left font-semibold">Leg</th>
                        <th className="px-3 py-2 text-left font-semibold">Test Item</th>
                        <th className="px-3 py-2 text-left font-semibold">Condition</th>
                        <th className="px-3 py-2 text-left font-semibold">Precon</th>
                        <th className="px-3 py-2 text-left font-semibold">SS</th>
                        <th className="px-3 py-2 text-left font-semibold">Read Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {result.legs.map((leg) => (
                        <tr key={leg.leg} className="even:bg-slate-50 hover:bg-teal-50 transition-colors">
                          <td className="px-3 py-2 font-semibold text-teal-700">Leg {leg.leg}</td>
                          <td className="px-3 py-2 font-medium text-slate-800">{leg.test_item}</td>
                          <td className="px-3 py-2 text-slate-600">{leg.condition}</td>
                          <td className="px-3 py-2"><PreconBadge precon={leg.precon} /></td>
                          <td className="px-3 py-2 text-slate-600">{leg.ss}</td>
                          <td className="px-3 py-2 text-slate-600 text-xs">{leg.read_points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Warnings */}
              {result.warnings?.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm font-semibold text-amber-800 mb-1">Warnings</p>
                  {result.warnings.map((w, i) => (
                    <p key={i} className="text-sm text-amber-700">• {w}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 flex-shrink-0 bg-slate-50 rounded-b-xl">
          {step === STEPS.RESULTS ? (
            <>
              <button onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                Close
              </button>
              <a href={`/requests/${result?.request_id}`}
                onClick={handleClose}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors">
                <ExternalLink className="w-4 h-4" /> View Request
              </a>
            </>
          ) : (
            <>
              <button onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                Cancel
              </button>
              <button onClick={handleImport} disabled={!file || step === STEPS.PROCESSING}
                className="flex items-center gap-2 px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors">
                {step === STEPS.PROCESSING
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</>
                  : <><Upload className="w-4 h-4" /> Import Whisker Test</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
