import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CriticalBackupModal({ requestCount }) {
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, []);

  const handleGoToBackup = () => {
    navigate('/settings', { state: { focusBackup: true } });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border-4 border-red-500 animate-pulse-slow">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-red-900 mb-2">
              🚨 Critical Database Backup Required
            </h2>
            <p className="text-sm text-red-800 mb-3">
              Your database has reached <strong>{requestCount} reliability requests</strong>, 
              exceeding the 1000-request safety threshold.
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
              <p className="text-xs text-red-900 font-medium mb-2">
                ⚠️ Required Actions:
              </p>
              <ol className="text-xs text-red-800 space-y-1 list-decimal list-inside">
                <li>Navigate to the Backup page</li>
                <li>Create a new backup (completed requests will be archived)</li>
                <li>Download the backup file</li>
              </ol>
            </div>
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-2.5 mb-2">
              <p className="text-xs text-amber-900">
                <strong>📋 Note:</strong> When you create the backup, all <strong>completed</strong> requests 
                will be archived to the Excel file and removed from the active database. 
                Active and pending requests will remain.
              </p>
            </div>
            <p className="text-xs text-red-700">
              <strong>Why this matters:</strong> Large databases can cause performance issues 
              and increase the risk of data loss. Creating a backup now protects your data.
            </p>
          </div>
        </div>
        
        <div className="flex justify-end mt-6">
          <button
            onClick={handleGoToBackup}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Go to Backup Settings →
          </button>
        </div>
        
        <p className="text-xs text-center text-red-600 mt-4 font-medium">
          This modal will remain until you complete the backup and download.
        </p>
      </div>
    </div>
  );
}
