import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel, danger = true, confirmClassName }) {
  useEffect(() => {
    if (open) {
      document.body.classList.add('modal-open');
      return () => document.body.classList.remove('modal-open');
    }
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm animate-in fade-in">
        <div className="p-6 text-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${danger ? 'bg-red-100' : 'bg-blue-100'}`}>
            <AlertTriangle className={`w-6 h-6 ${danger ? 'text-red-600' : 'text-blue-600'}`} />
          </div>
          <h3 className="font-heading text-lg font-bold text-slate-900 mb-2">{title || 'Confirm Action'}</h3>
          <div className="text-sm text-slate-500 text-left">{message || 'Are you sure you want to proceed? This action cannot be undone.'}</div>
        </div>
        <div className="px-6 pb-6 flex gap-3 justify-center">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm}
            className={confirmClassName || `flex-1 px-4 py-2.5 text-white rounded-lg text-sm font-medium shadow-sm transition-colors ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}>
            {confirmLabel || 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
