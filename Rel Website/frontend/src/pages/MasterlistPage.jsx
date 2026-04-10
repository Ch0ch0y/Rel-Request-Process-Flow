import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import {
  ShieldCheck, RefreshCw, TableProperties, ExternalLink, Maximize2, Minimize2,
  Search, X, Filter,
} from 'lucide-react';

const ML_COLS = [
  { key: 'ww',              label: 'WW' },
  { key: 'date_received',   label: 'Date Received at RelLab' },
  { key: 'rrs_no',          label: 'RRS No.' },
  { key: 'purpose',         label: 'Purpose' },
  { key: 'qual_type',       label: 'Qual Type' },
  { key: 'customer',        label: 'Customer' },
  { key: 'pkg_type',        label: 'Pkg. Type' },
  { key: 'lc_bc',           label: 'L/C B/C' },
  { key: 'rr_agile_no',     label: 'RR/Agile No.' },
  { key: 'test_level',      label: 'Test Level' },
  { key: 'qty',             label: 'Qty' },
  { key: 'num_days',        label: '# of Days' },
  { key: 'num_legs',        label: '# of Legs' },
  { key: 'est_start',       label: 'Est. Date/Time of Start' },
  { key: 'est_completion',  label: 'Est. Date of Completion' },
  { key: 'recommit',        label: 'Re-Commit' },
  { key: 'planner_remarks', label: 'Planner Remarks' },
];

const EDITABLE_KEYS = new Set(['test_level','qty','num_days','num_legs','est_start','est_completion','recommit','planner_remarks']);
const CELL_FIELD_MAP = { qty: 'ml_qty', est_start: 'planner_est_start', est_completion: 'planner_est_end', planner_remarks: 'planner_note', test_level: 'test_level' };
const DATE_KEYS = new Set(['est_start', 'est_completion']);

// Parse any date string into a Date object; returns null on failure
function parseAnyDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}
// Format a Date for display in the cell (e.g. "Apr 15, 2026 09:16 AM")
function formatDateDisplay(str) {
  const d = parseAnyDate(str);
  if (!d) return str || '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
// Convert any date string to the "YYYY-MM-DDTHH:mm" format needed by datetime-local input
function toDatetimeLocal(str) {
  const d = parseAnyDate(str);
  if (!d) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
// Compute completion ISO string from a start string + integer days
function addDaysToDate(startStr, days) {
  const d = parseAnyDate(startStr);
  if (!d || isNaN(days) || days <= 0) return null;
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// Returns CSS classes for Est. Date of Completion cell based on how close/past it is
function completionCellClass(dateStr) {
  const d = parseAnyDate(dateStr);
  if (!d) return '';
  const now = new Date();
  const diffDays = (d - now) / 86_400_000;
  if (diffDays < 0) return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';      // overdue
  if (diffDays <= 3) return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'; // due soon (≤3 days)
  return '';
}

const ML_STATUS_COLORS = {
  approval:     'bg-violet-100 text-violet-700 border-violet-200',
  review:       'bg-blue-100 text-blue-700 border-blue-200',
  testing:      'bg-orange-100 text-orange-700 border-orange-200',
  analysis:     'bg-teal-100 text-teal-700 border-teal-200',
  completed:    'bg-emerald-100 text-emerald-700 border-emerald-200',
  discontinued: 'bg-slate-100 text-slate-500 border-slate-200',
};

export default function MasterlistPage() {
  const { hasRole } = useAuth();

  const [masterlist, setMasterlist] = useState([]);
  const [mlLoading, setMlLoading] = useState(true);
  const [mlError, setMlError] = useState('');
  const [testItems, setTestItems] = useState([]);

  // Filter / search state
  const [searchQ, setSearchQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [testLevelFilter, setTestLevelFilter] = useState('all');

  const [editingCell, setEditingCell] = useState({ rowId: null, colKey: null, value: '', original: '' });
  const skipBlurRef = useRef(false);
  const [fullView, setFullView] = useState(false);

  const canEdit = hasRole('Admin', 'Planner');

  // Derived dropdown options
  const uniqueStatuses = useMemo(
    () => [...new Set(masterlist.filter(r => r.is_first_leg !== false).map(r => r.status).filter(Boolean))].sort(),
    [masterlist]
  );
  const uniqueTestLevels = useMemo(
    () => [...new Set(masterlist.map(r => r.test_level).filter(Boolean))].sort(),
    [masterlist]
  );

  const filteredList = useMemo(() => {
    return masterlist.filter(row => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      if (testLevelFilter !== 'all' && row.test_level !== testLevelFilter) return false;
      if (searchQ) {
        const q = searchQ.toLowerCase();
        return (
          (row.rrs_no || '').toLowerCase().includes(q) ||
          (row.customer || '').toLowerCase().includes(q) ||
          (row.purpose || '').toLowerCase().includes(q) ||
          (row.test_level || '').toLowerCase().includes(q) ||
          (row.rr_agile_no || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [masterlist, searchQ, statusFilter, testLevelFilter]);

  const loadMasterlist = () => {
    setMlLoading(true);
    setMlError('');
    api.getMasterlistRequests()
      .then(data => setMasterlist(Array.isArray(data) ? data : []))
      .catch(e => setMlError(e.message))
      .finally(() => setMlLoading(false));
  };

  useEffect(() => {
    loadMasterlist();
    api.get('/test-items').then(data => { if (Array.isArray(data)) setTestItems(data); }).catch(() => {});
  }, []);

  const startCellEdit = (rowId, colKey, val) => {
    if (!canEdit || !EDITABLE_KEYS.has(colKey)) return;
    // For date columns use the datetime-local format so the browser picker works
    const v = DATE_KEYS.has(colKey) ? toDatetimeLocal(val) : String(val || '');
    setEditingCell({ rowId, colKey, value: v, original: v });
  };

  const cancelCellEdit = () => {
    skipBlurRef.current = true;
    setEditingCell({ rowId: null, colKey: null, value: '', original: '' });
  };

  const commitCell = async (rowId, colKey, value, original) => {
    if (skipBlurRef.current) { skipBlurRef.current = false; return; }
    setEditingCell({ rowId: null, colKey: null, value: '', original: '' });
    if (value === original) return;
    const backendKey = CELL_FIELD_MAP[colKey] || colKey;
    // Capture row before state update so we can read related fields for computation
    const currentRow = masterlist.find(r => r.id === rowId);
    setMasterlist(prev => prev.map(r => r.id === rowId ? { ...r, [colKey]: value } : r));
    try {
      await api.updateRequestMasterlistFields(rowId, { [backendKey]: value });

      // Auto-compute Est. Date of Completion when num_days OR est_start changes
      if (colKey === 'num_days' || colKey === 'est_start') {
        const numDays = colKey === 'num_days'
          ? parseInt(value, 10)
          : parseInt(currentRow && (currentRow.num_days || ''), 10);
        const estStartRaw = colKey === 'est_start'
          ? value   // datetime-local value just committed
          : (currentRow && currentRow.est_start);
        const completionStr = addDaysToDate(estStartRaw, numDays);
        if (completionStr) {
          setMasterlist(prev => prev.map(r => r.id === rowId ? { ...r, est_completion: completionStr } : r));
          await api.updateRequestMasterlistFields(rowId, { planner_est_end: completionStr });
        }
      }
    } catch {
      setMasterlist(prev => prev.map(r => r.id === rowId ? { ...r, [colKey]: original } : r));
    }
  };

  if (!canEdit) {
    return (
      <div className="p-8 text-center">
        <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">Access restricted to Admin and Planner.</p>
      </div>
    );
  }

  return (
    <div className={fullView ? 'fixed inset-0 z-[9999] flex flex-col bg-white dark:bg-slate-900' : 'space-y-6 stagger-children'}>
      <div className={fullView ? 'flex flex-col flex-1 min-h-0 overflow-hidden' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden'}>
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex flex-wrap items-center gap-3 bg-white dark:bg-slate-800 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <TableProperties className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-heading font-bold text-slate-900 dark:text-white text-xl leading-tight">Masterlist</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {filteredList.length > 0 ? filteredList.length + ' RELDMS request(s)' + (filteredList.length < masterlist.length ? ' (filtered)' : '') : 'No requests found'}
              {canEdit && masterlist.length > 0 && <span className="ml-2 text-blue-500">· Click a cell to edit</span>}
            </p>
          </div>
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search RRS#, customer…"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              className="pl-7 pr-6 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white w-48 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            {searchQ && (
              <button onClick={() => setSearchQ('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="all">All Statuses</option>
            {uniqueStatuses.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          {/* Test Level filter */}
          <select
            value={testLevelFilter}
            onChange={e => setTestLevelFilter(e.target.value)}
            className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="all">All Test Levels</option>
            {uniqueTestLevels.map(tl => (
              <option key={tl} value={tl}>{tl}</option>
            ))}
          </select>
          <button
            onClick={() => setFullView(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            {fullView ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            {fullView ? 'Exit Full View' : 'Full View'}
          </button>
          <button onClick={loadMasterlist} title="Refresh"
            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <RefreshCw className={'w-4 h-4 ' + (mlLoading ? 'animate-spin' : '')} />
          </button>
        </div>
        <div className={fullView ? 'flex-1 min-h-0 overflow-auto' : ''}>

        {mlLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
          </div>
        ) : mlError ? (
          <div className="m-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 text-sm">{mlError}</div>
        ) : masterlist.length === 0 ? (
          <div className="py-14 text-center">
            <TableProperties className="w-10 h-10 text-slate-200 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">No RELDMS requests found</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">All existing RELDMS requests will appear here automatically.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-blue-600">
                  <th className="border border-blue-500 px-2 py-2 text-left text-[10px] font-bold text-white uppercase tracking-wide whitespace-nowrap">Status</th>
                  {ML_COLS.map(col => (
                    <th key={col.key} className="border border-blue-500 px-2 py-2 text-left text-[10px] font-bold text-white uppercase tracking-wide whitespace-nowrap">
                      {col.label}{canEdit && EDITABLE_KEYS.has(col.key) && <span className="ml-1 opacity-60 font-normal normal-case">✎</span>}
                    </th>
                  ))}
                  <th className="border border-blue-500 px-2 py-2 text-center text-[10px] font-bold text-white uppercase tracking-wide whitespace-nowrap">Link</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((row, ri) => {
                  // Each leg of a request gets its own row; use id+leg_number as unique key
                  const rowKey = row.leg_number != null ? `${row.id}_leg${row.leg_number}` : row.id;
                  const isFirst = row.is_first_leg !== false;
                  return (
                  <tr key={rowKey} className={[
                    ri % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/80 dark:bg-slate-800/50',
                    !isFirst ? 'border-t-0' : '',
                  ].join(' ')}>
                    <td className="border border-slate-200 dark:border-slate-700 px-2 py-1 whitespace-nowrap">
                      {isFirst && row.status && (
                        <span className={'inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ' + (ML_STATUS_COLORS[row.status] || 'bg-slate-100 text-slate-500 border-slate-200')}>
                          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                        </span>
                      )}
                    </td>
                    {ML_COLS.map(col => {
                      const isEditing = editingCell.rowId === row.id && editingCell.colKey === col.key;
                      const isEditable = canEdit && EDITABLE_KEYS.has(col.key);
                      const rawVal = row[col.key] || '';
                      // For non-first leg rows the identity columns are already blanked by backend
                      const displayVal = DATE_KEYS.has(col.key) && rawVal
                        ? formatDateDisplay(rawVal)
                        : col.key === 'date_received' && rawVal
                          ? (() => { try { return new Date(rawVal).toLocaleDateString(); } catch { return rawVal; } })()
                          : rawVal;
                      return (
                        <td
                          key={col.key}
                          onClick={() => { if (!isEditing) startCellEdit(row.id, col.key, rawVal); }}
                          className={[
                            'border border-slate-200 dark:border-slate-700',
                            isEditing
                              ? 'p-0 outline outline-2 outline-blue-500 bg-white dark:bg-slate-900 relative z-10'
                              : isEditable
                                ? 'px-2 py-1 cursor-text hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                : 'px-2 py-1',
                            !isEditing && col.key === 'est_completion' ? completionCellClass(rawVal) : '',
                          ].join(' ')}
                        >
                          {isEditing ? (
                            col.key === 'planner_remarks' ? (
                              <textarea
                                autoFocus
                                rows={2}
                                value={editingCell.value}
                                onChange={e => setEditingCell(prev => ({ ...prev, value: e.target.value }))}
                                onBlur={() => commitCell(row.id, col.key, editingCell.value, editingCell.original)}
                                onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); cancelCellEdit(); } }}
                                className="w-full px-2 py-1 border-none outline-none bg-transparent text-[11px] text-slate-900 dark:text-white resize-none min-w-[150px]"
                              />
                            ) : col.key === 'test_level' ? (
                              <>
                                <datalist id="ml-test-level-list">
                                  {testItems.map(item => <option key={item} value={item} />)}
                                </datalist>
                                <input
                                  autoFocus
                                  type="search"
                                  list="ml-test-level-list"
                                  autoComplete="off"
                                  placeholder="Type to search…"
                                  value={editingCell.value}
                                  onChange={e => setEditingCell(prev => ({ ...prev, value: e.target.value }))}
                                  onBlur={() => commitCell(row.id, col.key, editingCell.value, editingCell.original)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
                                    if (e.key === 'Escape') { e.preventDefault(); cancelCellEdit(); }
                                  }}
                                  className="w-full px-2 py-1 border-none outline-none bg-transparent text-[11px] text-slate-900 dark:text-white min-w-[160px]"
                                />
                              </>
                            ) : DATE_KEYS.has(col.key) ? (
                              <input
                                autoFocus
                                type="datetime-local"
                                value={editingCell.value}
                                onChange={e => setEditingCell(prev => ({ ...prev, value: e.target.value }))}
                                onBlur={() => commitCell(row.id, col.key, editingCell.value, editingCell.original)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
                                  if (e.key === 'Escape') { e.preventDefault(); cancelCellEdit(); }
                                }}
                                className="w-full px-2 py-1 border-none outline-none bg-transparent text-[11px] text-slate-900 dark:text-white min-w-[160px]"
                              />
                            ) : (
                              <input
                                autoFocus
                                type="text"
                                value={editingCell.value}
                                onChange={e => setEditingCell(prev => ({ ...prev, value: e.target.value }))}
                                onBlur={() => commitCell(row.id, col.key, editingCell.value, editingCell.original)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
                                  if (e.key === 'Escape') { e.preventDefault(); cancelCellEdit(); }
                                }}
                                className="w-full px-2 py-1 border-none outline-none bg-transparent text-[11px] text-slate-900 dark:text-white min-w-[60px]"
                              />
                            )
                          ) : (
                            <span className={'block text-slate-700 dark:text-slate-300 ' + (col.key !== 'planner_remarks' ? 'truncate max-w-[130px]' : 'max-w-[160px]')}>
                              {displayVal || (isEditable ? <span className="text-slate-300 dark:text-slate-600 select-none">—</span> : '')}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="border border-slate-200 dark:border-slate-700 px-2 py-1 whitespace-nowrap text-center">
                      {isFirst && (
                        <Link to={'/requests/' + row.id} title="View request"
                          className="inline-flex items-center justify-center text-blue-500 hover:text-blue-700 dark:hover:text-blue-300">
                          <ExternalLink className="w-3 h-3" />
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
      </div>
    </div>
  );
}
