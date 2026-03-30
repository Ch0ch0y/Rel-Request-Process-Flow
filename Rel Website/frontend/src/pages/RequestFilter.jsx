import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import {
  Search, Filter, ChevronRight, CalendarRange, User2, Tag,
  RefreshCw, Clock, CheckCircle2, AlertCircle,
  Pause, XCircle, FileDown, Database, Archive,
  ChevronDown, ChevronUp, Package, Loader2, Upload
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'incoming', label: 'Incoming' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'hold', label: 'Hold' },
];

const STATUS_STYLES = {
  incoming:    { bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-200',   icon: Clock },
  pending:     { bg: 'bg-slate-100',   text: 'text-slate-600',   border: 'border-slate-200',   icon: Pause },
  in_progress: { bg: 'bg-blue-100',    text: 'text-blue-700',    border: 'border-blue-200',    icon: RefreshCw },
  completed:   { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2 },
  failed:      { bg: 'bg-red-100',     text: 'text-red-700',     border: 'border-red-200',     icon: XCircle },
  hold:        { bg: 'bg-yellow-100',  text: 'text-yellow-700',  border: 'border-yellow-200',  icon: AlertCircle },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${s.bg} ${s.text} ${s.border}`}>
      <Icon className="w-3 h-3" />
      {status?.replace('_', ' ')}
    </span>
  );
}

function FilterInput({ label, icon: Icon, children }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <label className="text-xs font-medium uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
        <Icon className="w-3 h-3" /> {label}
      </label>
      {children}
    </div>
  );
}

function groupBackups(backups) {
  const groups = {};
  for (const b of backups) {
    const d = new Date(b.created_at);
    const year = d.getFullYear();
    const month = d.toLocaleString('en-US', { month: 'long' });
    const key = `${year}_${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!groups[key]) groups[key] = { year, month, label: `${month} ${year}`, items: [] };
    groups[key].items.push(b);
  }
  return Object.values(groups).sort((a, b) => (b.label > a.label ? 1 : -1));
}

export default function RequestFilter() {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const canAccess = hasRole('Admin', 'Reliability Engineer');

  const [source, setSource] = useState('live');

  const [dateFrom,  setDateFrom]  = useState('');
  const [dateTo,    setDateTo]    = useState('');
  const [rrSearch,  setRrSearch]  = useState('');
  const [status,    setStatus]    = useState('');
  const [createdBy, setCreatedBy] = useState('');

  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [fetched,  setFetched]  = useState(false);

  const [backupList,        setBackupList]        = useState([]);
  const [backupListLoading, setBackupListLoading] = useState(false);
  const [backupListError,   setBackupListError]   = useState('');
  const [selectedBackup,    setSelectedBackup]    = useState(null);
  const [backupData,        setBackupData]        = useState([]);
  const [backupLoading,     setBackupLoading]     = useState(false);
  const [backupError,       setBackupError]       = useState('');
  const [expandedGroups,    setExpandedGroups]    = useState({});

  // Import file state
  const [importFile,        setImportFile]        = useState(null);
  const [importLoading,     setImportLoading]     = useState(false);
  const [importError,       setImportError]       = useState('');
  const [importedFilename,  setImportedFilename]  = useState('');

  useEffect(() => { if (!canAccess) navigate('/', { replace: true }); }, [canAccess, navigate]);

  useEffect(() => {
    if (source !== 'backup' || backupList.length > 0) return;
    setBackupListLoading(true);
    setBackupListError('');
    api.getFilterBackups()
      .then(data => {
        setBackupList(data);
        const groups = groupBackups(data);
        if (groups.length > 0) setExpandedGroups({ [groups[0].label]: true });
      })
      .catch(e => setBackupListError(e.message))
      .finally(() => setBackupListLoading(false));
  }, [source]);

  const handleSelectBackup = useCallback(async (backup) => {
    if (selectedBackup?.filename === backup.filename) return;
    setSelectedBackup(backup);
    setBackupData([]);
    setBackupError('');
    setFetched(false);
    setBackupLoading(true);
    try {
      const res = await api.getFilterBackupData(backup.filename);
      setBackupData(res.requests || []);
      setFetched(true);
    } catch (e) {
      setBackupError(e.message);
    } finally {
      setBackupLoading(false);
    }
  }, [selectedBackup]);

  const handleSearch = useCallback(async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (rrSearch.trim())  params.search     = rrSearch.trim();
      if (status)           params.status     = status;
      if (dateFrom)         params.date_from  = dateFrom;
      if (dateTo)           params.date_to    = dateTo;
      if (createdBy.trim()) params.created_by = createdBy.trim();
      const data = await api.getRequests(params);
      setRequests(data);
      setFetched(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [rrSearch, status, dateFrom, dateTo, createdBy]);

  const filteredBackupRows = useMemo(() => {
    if (source !== 'backup' || !backupData.length) return [];
    return backupData.filter(req => {
      if (rrSearch.trim()) {
        const q = rrSearch.trim().toLowerCase();
        const hay = [req.request_number, req.device_name, req.customer, req.lot_no, req.created_by_username]
          .map(v => (v || '').toLowerCase()).join(' ');
        if (!hay.includes(q)) return false;
      }
      if (status && req.status !== status) return false;
      if (createdBy.trim() && !(req.created_by_username || '').toLowerCase().includes(createdBy.trim().toLowerCase())) return false;
      if (dateFrom && req.created_at && new Date(req.created_at).toISOString().slice(0,10) < dateFrom) return false;
      if (dateTo   && req.created_at && new Date(req.created_at).toISOString().slice(0,10) > dateTo)   return false;
      return true;
    });
  }, [backupData, rrSearch, status, createdBy, dateFrom, dateTo, source]);

  const filteredImportRows = useMemo(() => {
    if (source !== 'import' || !backupData.length) return [];
    return backupData.filter(req => {
      if (rrSearch.trim()) {
        const q = rrSearch.trim().toLowerCase();
        const hay = [req.request_number, req.device_name, req.customer, req.lot_no, req.created_by_username]
          .map(v => (v || '').toLowerCase()).join(' ');
        if (!hay.includes(q)) return false;
      }
      if (status && req.status !== status) return false;
      if (createdBy.trim() && !(req.created_by_username || '').toLowerCase().includes(createdBy.trim().toLowerCase())) return false;
      if (dateFrom && req.created_at && new Date(req.created_at).toISOString().slice(0,10) < dateFrom) return false;
      if (dateTo   && req.created_at && new Date(req.created_at).toISOString().slice(0,10) > dateTo)   return false;
      return true;
    });
  }, [backupData, rrSearch, status, createdBy, dateFrom, dateTo, source]);

  const displayRows = source === 'backup' ? filteredBackupRows : source === 'import' ? filteredImportRows : requests;

  const handleImportFile = useCallback(async (file) => {
    if (!file) return;
    setImportFile(file);
    setImportError('');
    setBackupData([]);
    setSelectedBackup(null);
    setFetched(false);
    setImportLoading(true);
    try {
      const res = await api.importFilterBackupFile(file);
      setBackupData(res.requests || []);
      setImportedFilename(res.filename || file.name);
      setFetched(true);
    } catch (e) {
      setImportError(e.message);
    } finally {
      setImportLoading(false);
    }
  }, []);

  const handleReset = () => {
    setDateFrom(''); setDateTo(''); setRrSearch(''); setStatus(''); setCreatedBy('');
    if (source === 'live') { setRequests([]); setFetched(false); }
    if (source === 'import') { setBackupData([]); setImportFile(null); setImportedFilename(''); setFetched(false); }
  };

  const handleSourceSwitch = (s) => {
    setSource(s); setFetched(false); setError(''); setRequests([]);
    if (s !== 'import') { setImportFile(null); setImportedFilename(''); setImportError(''); }
    if (s !== 'backup') { setBackupData([]); setSelectedBackup(null); setBackupError(''); }
  };

  const handleExportCSV = () => {
    if (!displayRows.length) return;
    const src = source === 'backup' && selectedBackup
      ? `_${selectedBackup.filename.replace(/\.(zip|xlsx)$/i, '')}`
      : source === 'import' && importedFilename
      ? `_${importedFilename.replace(/\.(zip|xlsx)$/i, '')}` : '';
    const headers = ['REL#','Status','Device','Lot No.','Customer','Steps','Created By','Created At','Deadline'];
    const rows = displayRows.map(r => [
      r.request_number, r.status, r.device_name||'', r.lot_no||'', r.customer||'',
      `${(r.steps||[]).filter(s=>s.status==='completed').length}/${(r.steps||[]).length}`,
      r.created_by_username||'',
      r.created_at ? new Date(r.created_at).toLocaleDateString() : '',
      r.deadline||'',
    ]);
    const csv = [headers,...rows].map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RR_Filter${src}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const backupGroups = useMemo(() => groupBackups(backupList), [backupList]);

  if (!canAccess) return null;

  return (
    <div className="space-y-6 stagger-children">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900 tracking-tight">RELDMS</h1>
          <p className="text-sm text-slate-400 mt-0.5">Filter and browse RELDMS requests &mdash; Admin &amp; Rel Engineer only</p>
        </div>
        {fetched && displayRows.length > 0 && (
          <button onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors">
            <FileDown className="w-4 h-4" /> Export CSV
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100">
          <button onClick={() => handleSourceSwitch('live')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              source==='live' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Database className="w-4 h-4" /> Live Database
          </button>
          <button onClick={() => handleSourceSwitch('backup')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              source==='backup' ? 'bg-amber-50 text-amber-700 border-b-2 border-amber-500' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Archive className="w-4 h-4" /> From Backup
          </button>
          <button onClick={() => handleSourceSwitch('import')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              source==='import' ? 'bg-violet-50 text-violet-700 border-b-2 border-violet-500' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Upload className="w-4 h-4" /> Import File
          </button>
        </div>

        {source === 'import' && (
          <div className="p-5 bg-violet-50/50">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-700 mb-3">Import Backup File</p>
            <label
              className={`flex flex-col items-center justify-center gap-3 w-full border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${
                importLoading ? 'border-violet-300 bg-violet-50' : 'border-violet-300 hover:border-violet-400 hover:bg-violet-50 bg-white'
              }`}
            >
              <input
                type="file"
                accept=".zip,.xlsx"
                className="hidden"
                disabled={importLoading}
                onChange={e => { if (e.target.files?.[0]) handleImportFile(e.target.files[0]); e.target.value = ''; }}
              />
              {importLoading ? (
                <><Loader2 className="w-8 h-8 text-violet-400 animate-spin" /><span className="text-sm text-violet-600">Parsing file…</span></>
              ) : importedFilename && fetched ? (
                <><CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  <div className="text-center">
                    <p className="text-sm font-semibold text-emerald-700">{importedFilename}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{backupData.length} records loaded · click to replace</p>
                  </div></>
              ) : (
                <><Upload className="w-8 h-8 text-violet-300" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-600">Click to choose a backup file</p>
                    <p className="text-xs text-slate-400 mt-0.5">Accepts .zip or .xlsx (same format as database backup)</p>
                  </div></>
              )}
            </label>
            {importError && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {importError}
              </div>
            )}
            {importedFilename && fetched && !importLoading && (
              <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                Loaded <strong>{backupData.length}</strong> records from <strong>{importedFilename}</strong>. Use filters below to narrow results.
              </div>
            )}
          </div>
        )}

        {source === 'backup' && (
          <div className="p-4 bg-amber-50/50">
            {backupListLoading && (
              <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading backups
              </div>
            )}
            {backupListError && (
              <div className="text-sm text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {backupListError}
              </div>
            )}
            {!backupListLoading && !backupListError && backupList.length === 0 && (
              <div className="text-sm text-slate-400 flex items-center gap-2 py-2">
                <Package className="w-4 h-4" /> No backups found.
              </div>
            )}
            {backupGroups.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-2">Select a Backup File</p>
                {backupGroups.map(group => (
                  <div key={group.label} className="rounded-lg border border-amber-200 bg-white overflow-hidden">
                    <button type="button"
                      onClick={() => setExpandedGroups(prev => ({ ...prev, [group.label]: !prev[group.label] }))}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-amber-50 transition-colors">
                      <span className="flex items-center gap-2">
                        <CalendarRange className="w-3.5 h-3.5 text-amber-500" />
                        {group.label}
                        <span className="text-xs font-normal text-slate-400">({group.items.length} file{group.items.length !== 1 ? 's' : ''})</span>
                      </span>
                      {expandedGroups[group.label] ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                    </button>
                    {expandedGroups[group.label] && (
                      <div className="divide-y divide-slate-100">
                        {group.items.map(b => {
                          const isSel = selectedBackup?.filename === b.filename;
                          return (
                            <button key={b.filename} type="button" onClick={() => handleSelectBackup(b)}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                                isSel ? 'bg-amber-100 border-l-2 border-amber-500' : 'hover:bg-slate-50 border-l-2 border-transparent'}`}>
                              <Archive className={`w-4 h-4 shrink-0 ${isSel ? 'text-amber-600' : 'text-slate-400'}`} />
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-medium truncate ${isSel ? 'text-amber-800' : 'text-slate-700'}`}>{b.filename}</p>
                                <p className="text-[10px] text-slate-400">{b.type}  {b.size_mb} MB  {new Date(b.created_at).toLocaleString()}</p>
                              </div>
                              {isSel && backupLoading && <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin shrink-0" />}
                              {isSel && !backupLoading && fetched && (
                                <span className="text-[10px] font-semibold text-amber-600 shrink-0">{backupData.length} records</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {backupError && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {backupError}
              </div>
            )}
            {selectedBackup && fetched && !backupLoading && (
              <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                Loaded <strong>{backupData.length}</strong> records from <strong>{selectedBackup.filename}</strong>. Use filters below to narrow results.
              </div>
            )}
          </div>
        )}
      </div>

      <form onSubmit={source === 'live' ? handleSearch : e => e.preventDefault()}
        className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-semibold text-slate-700">Filter Options</span>
          {(source === 'backup' || source === 'import') && (
            <span className="ml-auto text-xs text-slate-400 italic">Filters applied in real-time</span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <FilterInput label="Date From" icon={CalendarRange}>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} max={dateTo||undefined}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" />
          </FilterInput>
          <FilterInput label="Date To" icon={CalendarRange}>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} min={dateFrom||undefined}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" />
          </FilterInput>
          <FilterInput label="REL# / Device" icon={Search}>
            <input type="text" value={rrSearch} onChange={e => setRrSearch(e.target.value)} placeholder="Search"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" />
          </FilterInput>
          <FilterInput label="Status" icon={Tag}>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all">
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </FilterInput>
          <FilterInput label="Created By" icon={User2}>
            <input type="text" value={createdBy} onChange={e => setCreatedBy(e.target.value)} placeholder="Username"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" />
          </FilterInput>
        </div>
        <div className="flex items-center gap-3 mt-5">
          {source === 'live' && (
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
              {loading ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? 'Searching' : 'Search'}
            </button>
          )}
          <button type="button" onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4" /> Reset Filters
          </button>
        </div>
      </form>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {(fetched || (source === 'backup' && selectedBackup && !backupLoading)) && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50 flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-700">Results</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{displayRows.length}</span>
              {source === 'backup' && selectedBackup && (
                <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Archive className="w-3 h-3" /> {selectedBackup.filename}
                  {backupData.length !== displayRows.length && `  filtered from ${backupData.length}`}
                </span>              )}
              {source === 'import' && importedFilename && (
                <span className="text-xs text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Upload className="w-3 h-3" /> {importedFilename}
                  {backupData.length !== displayRows.length && ` · filtered from ${backupData.length}`}
                </span>              )}
            </div>
          </div>
          {displayRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
              <Search className="w-8 h-8" />
              <span className="text-sm">No requests match the selected filters.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">
                    <th className="text-left px-5 py-3 font-semibold">REL#</th>
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                    <th className="text-left px-4 py-3 font-semibold">Device</th>
                    <th className="text-left px-4 py-3 font-semibold">Lot No.</th>
                    <th className="text-left px-4 py-3 font-semibold">Customer</th>
                    <th className="text-left px-4 py-3 font-semibold">Progress</th>
                    <th className="text-left px-4 py-3 font-semibold">Created By</th>
                    <th className="text-left px-4 py-3 font-semibold">Created At</th>
                    <th className="text-left px-4 py-3 font-semibold">Deadline</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {displayRows.map((req, idx) => {
                    const done  = (req.steps||[]).filter(s => s.status==='completed').length;
                    const total = (req.steps||[]).length;
                    const pct   = total > 0 ? Math.round((done/total)*100) : 0;
                    const isOverdue = req.deadline && req.status !== 'completed' && new Date(req.deadline) < new Date();
                    const hasId = !!req.id;
                    return (
                      <tr key={req.id||idx} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-5 py-3">
                          {hasId && source==='live' ? (
                            <Link to={`/requests/${req.id}`} className="font-mono font-semibold text-blue-600 hover:underline text-sm">{req.request_number}</Link>
                          ) : (
                            <span className="font-mono font-semibold text-slate-700 text-sm">{req.request_number}</span>
                          )}
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={req.status} /></td>
                        <td className="px-4 py-3 text-slate-700 max-w-[150px] truncate" title={req.device_name}>{req.device_name||''}</td>
                        <td className="px-4 py-3 text-slate-500">{req.lot_no||''}</td>
                        <td className="px-4 py-3 text-slate-500 max-w-[120px] truncate" title={req.customer}>{req.customer||''}</td>
                        <td className="px-4 py-3 min-w-[100px]">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${pct===100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-slate-400 shrink-0">{done}/{total}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-slate-600"><User2 className="w-3 h-3 text-slate-400" />{req.created_by_username||''}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{req.created_at ? new Date(req.created_at).toLocaleDateString() : ''}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {req.deadline ? (
                            <span className={`text-xs font-medium ${isOverdue ? 'text-red-600' : 'text-slate-500'}`}>
                              {isOverdue && <AlertCircle className="w-3 h-3 inline mr-1" />}{req.deadline}
                            </span>
                          ) : <span className="text-slate-300"></span>}
                        </td>
                        <td className="px-4 py-3">
                          {hasId && source==='live' && (
                            <Link to={`/requests/${req.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-blue-50 text-blue-500">
                              <ChevronRight className="w-4 h-4" />
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!fetched && !loading && !(source === 'backup' && selectedBackup) && !(source === 'import' && importLoading) && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-300 gap-3">
          {source === 'live' ? <Database className="w-10 h-10" /> : source === 'import' ? <Upload className="w-10 h-10" /> : <Archive className="w-10 h-10" />}
          <p className="text-sm text-slate-400">
            {source === 'live'
              ? <span>Set filters above and click <strong>Search</strong>.</span>
              : source === 'import'
              ? <span>Import a .zip or .xlsx backup file above to load its records.</span>
              : <span>Select a backup file above to load its records.</span>}
          </p>
        </div>
      )}

      {backupLoading && (
        <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Parsing backup file</span>
        </div>
      )}
    </div>
  );
}