import { useState, useRef } from 'react';
import { Archive, Upload, Download, ChevronDown, ChevronRight, Search, X, FileSpreadsheet, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import api from '../api';
import ConfirmDialog from '../components/ConfirmDialog';

const STATUS_COLORS = {
  completed:     'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  discontinued:  'bg-red-500/15 text-red-400 border-red-500/30',
  in_progress:   'bg-blue-500/15 text-blue-400 border-blue-500/30',
  pending:       'bg-amber-500/15 text-amber-400 border-amber-500/30',
};

function StatusBadge({ status }) {
  const cls = STATUS_COLORS[status] || 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${cls}`}>
      {(status || '').replace(/_/g, ' ')}
    </span>
  );
}

function DetailPanel({ detail }) {
  const [openLeg, setOpenLeg] = useState(null);
  if (!detail) return <p className="text-slate-500 text-sm py-3 px-4">No detail sheet found for this request.</p>;

  const { info, steps = [], checklist_legs = {}, checklist_order = [] } = detail;

  const infoRows = Object.entries(info || {}).filter(([, v]) => v);

  return (
    <div className="p-4 space-y-5">
      {/* Info */}
      {infoRows.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-violet-400 mb-2">Request Info</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 text-sm">
            {infoRows.map(([k, v]) => (
              <div key={k} className="flex flex-col">
                <span className="text-slate-500 text-[11px]">{k}</span>
                <span className="text-slate-200 break-words">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Steps */}
      {steps.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-violet-400 mb-2">Steps</p>
          <div className="overflow-x-auto rounded-lg border border-slate-700">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-800">
                <tr>
                  {['Step','Status','Started At','Completed At'].map(h => (
                    <th key={h} className="px-3 py-1.5 text-left text-slate-400 text-xs font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {steps.map((s, i) => (
                  <tr key={i} className="border-t border-slate-700 hover:bg-slate-800/40">
                    <td className="px-3 py-1.5 text-slate-200">{s.Step || s['Step Name'] || ''}</td>
                    <td className="px-3 py-1.5">
                      <StatusBadge status={(s.Status||'').toLowerCase().replace(' ','_')} />
                    </td>
                    <td className="px-3 py-1.5 text-slate-400 text-xs">{s['Started At'] || ''}</td>
                    <td className="px-3 py-1.5 text-slate-400 text-xs">{s['Completed At'] || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Checklist */}
      {checklist_order.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-violet-400 mb-2">Checklist</p>
          <div className="space-y-2">
            {checklist_order.map(legKey => {
              const items = checklist_legs[legKey] || [];
              const isOpen = openLeg === legKey;
              return (
                <div key={legKey} className="border border-slate-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setOpenLeg(isOpen ? null : legKey)}
                    className="w-full flex items-center justify-between px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sm font-medium text-slate-200 transition-colors"
                  >
                    <span className="text-violet-300">{legKey || '(No Leg)'}</span>
                    <span className="flex items-center gap-2 text-slate-500 text-xs">
                      {items.length} item{items.length !== 1 && 's'}
                      {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead className="bg-slate-900">
                          <tr>
                            {['Step','Item','Requirements','Qty','Time In','Time Out','Technician','Remarks'].map(h => (
                              <th key={h} className="px-3 py-1.5 text-left text-slate-400 font-semibold whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((it, i) => (
                            <tr key={i} className="border-t border-slate-800 hover:bg-slate-800/40">
                              <td className="px-3 py-1.5 text-slate-300 whitespace-nowrap">{it.Step || ''}</td>
                              <td className="px-3 py-1.5 text-slate-200">{it.Item || ''}</td>
                              <td className="px-3 py-1.5 text-slate-400 max-w-[220px]">{it.Requirements || ''}</td>
                              <td className="px-3 py-1.5 text-slate-400">{it.Qty || ''}</td>
                              <td className="px-3 py-1.5 text-slate-400 whitespace-nowrap">{it['Time In'] || ''}</td>
                              <td className="px-3 py-1.5 text-slate-400 whitespace-nowrap">{it['Time Out'] || ''}</td>
                              <td className="px-3 py-1.5 text-slate-300 whitespace-nowrap">{it.Technician || ''}</td>
                              <td className="px-3 py-1.5 text-slate-400 max-w-[200px]">{it.Remarks || ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CABackup() {
  // Export state
  const [exporting, setExporting] = useState(false);
  const [exportErr, setExportErr] = useState('');
  const [exportSuccess, setExportSuccess] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Import state
  const fileRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [importErr, setImportErr] = useState('');
  const [importData, setImportData] = useState(null); // { requests, file_name }

  // View state
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  /* ── Export ─────────────────────────────────────────────────── */
  const handleExport = async () => {
    setConfirmOpen(false);
    setExporting(true);
    setExportErr('');
    setExportSuccess('');
    try {
      const resp = await api.exportBackup();
      const url = URL.createObjectURL(new Blob([resp.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }));
      const a = document.createElement('a');
      const cd = resp.headers['content-disposition'] || '';
      const match = cd.match(/filename="?([^"]+)"?/);
      a.download = match ? match[1] : 'CA_Backup.xlsx';
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);
      const count = resp.headers['x-exported-count'];
      setExportSuccess(`${count || '?'} completed request${count === '1' ? '' : 's'} exported and removed from the system.`);
    } catch (e) {
      setExportErr(e.response?.data?.detail || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  /* ── Import ─────────────────────────────────────────────────── */
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportErr('');
    setImportData(null);
    setExpandedId(null);
    try {
      const result = await api.importBackup(file);
      setImportData(result.data);
    } catch (e) {
      setImportErr(e.response?.data?.detail || 'Import failed');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const clearImport = () => { setImportData(null); setExpandedId(null); setSearch(''); };

  /* ── Filter ──────────────────────────────────────────────────── */
  const filtered = (importData?.requests || []).filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (r.ca_number || '').toLowerCase().includes(q) ||
      (r.title || '').toLowerCase().includes(q) ||
      (r.submitter_name || '').toLowerCase().includes(q) ||
      (r.status || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-violet-600/20 rounded-xl flex items-center justify-center">
          <Archive className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-100">CA Backup</h1>
          <p className="text-slate-500 text-sm">Export all CA requests to Excel or import a backup file for viewing.</p>
        </div>
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Export card */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-emerald-400" />
            <h2 className="text-slate-100 font-semibold">Export &amp; Archive</h2>
          </div>
          <p className="text-slate-400 text-sm">
            Exports all <span className="text-emerald-400 font-medium">Completed</span> requests to an Excel file,
            then <span className="text-red-400 font-medium">permanently removes</span> them from the system.
            Sheet 1 is a summary; each subsequent sheet contains the full request detail and checklist.
          </p>
          <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2 text-xs text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            This action is irreversible. Save the Excel file — it is the only copy.
          </div>
          {exportErr && (
            <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-sm">
              <X className="w-4 h-4 flex-shrink-0" />{exportErr}
            </div>
          )}
          {exportSuccess && (
            <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 text-sm">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />{exportSuccess}
            </div>
          )}
          <button
            onClick={() => { setExportErr(''); setExportSuccess(''); setConfirmOpen(true); }}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {exporting
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Exporting…</>
              : <><Download className="w-4 h-4" />Export &amp; Archive</>}
          </button>
        </div>

        {/* Import card */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-violet-400" />
            <h2 className="text-slate-100 font-semibold">Import for Viewing</h2>
          </div>
          <p className="text-slate-400 text-sm">
            Load a previously exported backup file to browse its contents.
            <span className="text-amber-400"> Read-only — does not modify the database.</span>
          </p>
          {importErr && (
            <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-sm">
              <X className="w-4 h-4 flex-shrink-0" />{importErr}
            </div>
          )}
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {importing
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Reading…</>
              : <><Upload className="w-4 h-4" />Open Backup File</>}
          </button>
        </div>
      </div>

      {/* Imported data viewer */}
      {importData && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
          {/* Viewer header */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-violet-400" />
              <span className="text-slate-200 font-medium text-sm">{importData.file_name}</span>
              <span className="text-slate-500 text-xs">&mdash; {importData.requests.length} requests</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500 w-44"
                />
              </div>
              <button
                onClick={clearImport}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
                title="Clear"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Table */}
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
              <Info className="w-4 h-4" />
              <span className="text-sm">No matching requests.</span>
            </div>
          ) : (
            <div>
              {/* Column headers */}
              <div className="grid grid-cols-[1fr_2fr_1fr_1fr_1fr] gap-3 px-4 py-2 bg-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <span>CA Number</span>
                <span>Title</span>
                <span>Status</span>
                <span>Submitter</span>
                <span>Created At</span>
              </div>

              {filtered.map((req) => {
                const isOpen = expandedId === req.ca_number;
                return (
                  <div key={req.ca_number} className="border-t border-slate-800">
                    {/* Row */}
                    <button
                      onClick={() => setExpandedId(isOpen ? null : req.ca_number)}
                      className="w-full grid grid-cols-[1fr_2fr_1fr_1fr_1fr] gap-3 px-4 py-3 items-center text-left hover:bg-slate-800/50 transition-colors"
                    >
                      <span className="font-mono text-violet-400 text-sm font-semibold">{req.ca_number}</span>
                      <span className="text-slate-200 text-sm truncate">{req.title}</span>
                      <span><StatusBadge status={(req.status||'').toLowerCase().replace(' ','_')} /></span>
                      <span className="text-slate-400 text-sm">{req.submitter_name}</span>
                      <span className="flex items-center justify-between">
                        <span className="text-slate-500 text-xs">{req.created_at ? req.created_at.slice(0, 10) : ''}</span>
                        {isOpen
                          ? <ChevronDown className="w-4 h-4 text-violet-400 flex-shrink-0" />
                          : <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />}
                      </span>
                    </button>

                    {/* Expanded detail */}
                    {isOpen && (
                      <div className="bg-slate-950 border-t border-slate-700">
                        <DetailPanel detail={req.detail} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Confirm export+delete dialog */}
      <ConfirmDialog
        open={confirmOpen}
        danger
        title="Export & Archive Completed Requests"
        message="This will export ALL Completed requests to an Excel file and permanently delete them from the system. This cannot be undone — make sure to save the downloaded file."
        confirmLabel="Export & Delete"
        onConfirm={handleExport}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
