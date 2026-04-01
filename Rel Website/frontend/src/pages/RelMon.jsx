import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api';
import {
  Database, RefreshCw, Loader2, AlertTriangle, ChevronRight,
  ChevronDown, Search, Download, TableProperties, X, Info
} from 'lucide-react';

// ─── Column-group colour tokens (matches original RELMON colour coding) ────────
const GROUP_COLORS = {
  Package:      { bg: 'bg-sky-600',    text: 'text-white', border: 'border-sky-700' },
  Factory:      { bg: 'bg-cyan-600',   text: 'text-white', border: 'border-cyan-700' },
  Materials:    { bg: 'bg-violet-600', text: 'text-white', border: 'border-violet-700' },
  Precond:      { bg: 'bg-amber-500',  text: 'text-white', border: 'border-amber-600' },
  DelamBefore:  { bg: 'bg-red-600',    text: 'text-white', border: 'border-red-700' },
  DelamAfter:   { bg: 'bg-rose-500',   text: 'text-white', border: 'border-rose-600' },
  MRT:          { bg: 'bg-emerald-600',text: 'text-white', border: 'border-emerald-700' },
  Reliability:  { bg: 'bg-indigo-600', text: 'text-white', border: 'border-indigo-700' },
  Default:      { bg: 'bg-slate-500',  text: 'text-white', border: 'border-slate-600' },
};

// Map Excel row-1 cell values to colour tokens
function getGroupColor(cellValue) {
  if (!cellValue) return GROUP_COLORS.Default;
  const v = String(cellValue).toLowerCase();
  if (v.includes('package'))           return GROUP_COLORS.Package;
  if (v.includes('factory'))           return GROUP_COLORS.Factory;
  if (v.includes('material'))          return GROUP_COLORS.Materials;
  if (v.includes('preconditioning') && v.includes('condition')) return GROUP_COLORS.Precond;
  if (v.includes('before'))            return GROUP_COLORS.DelamBefore;
  if (v.includes('after'))             return GROUP_COLORS.DelamAfter;
  if (v.includes('mrt'))               return GROUP_COLORS.MRT;
  if (v.includes('reliability'))       return GROUP_COLORS.Reliability;
  return GROUP_COLORS.Default;
}

// ─── Build a 2-D color map from merge info & row-1 values ─────────────────────
function buildColorMap(rows, merges, headerRows = 4) {
  const map = {};           // map[row][col] = colorKey
  if (!rows || !merges) return map;

  // For each merge that touches row 0 (first header row), propagate the color
  for (const m of merges) {
    if (m.min_row < headerRows) {
      const color = getGroupColor(rows[m.min_row]?.[m.min_col]);
      for (let r = m.min_row; r <= m.max_row; r++) {
        for (let c = m.min_col; c <= m.max_col; c++) {
          map[`${r}_${c}`] = color;
        }
      }
    }
  }
  // Fill remaining header cells by inheriting from the cell above or row-0 color
  for (let r = 0; r < headerRows; r++) {
    const numCols = rows[0]?.length ?? 0;
    for (let c = 0; c < numCols; c++) {
      const key = `${r}_${c}`;
      if (!map[key]) {
        // try to inherit from row above in same column
        const above = map[`${r - 1}_${c}`];
        if (above) {
          map[key] = above;
        } else {
          // derive from row-0 scan leftward
          for (let sc = c; sc >= 0; sc--) {
            const found = map[`0_${sc}`];
            if (found) { map[key] = found; break; }
          }
        }
      }
    }
  }
  return map;
}

// ─── Build the set of cells that are "covered" by a merge (not the top-left) ──
function buildCoveredSet(merges) {
  const covered = new Set();
  for (const m of merges) {
    for (let r = m.min_row; r <= m.max_row; r++) {
      for (let c = m.min_col; c <= m.max_col; c++) {
        if (r !== m.min_row || c !== m.min_col) {
          covered.add(`${r}_${c}`);
        }
      }
    }
  }
  return covered;
}

// ─── Build a lookup from "top-left key" → {rowspan, colspan} ─────────────────
function buildSpanMap(merges) {
  const spans = {};
  for (const m of merges) {
    spans[`${m.min_row}_${m.min_col}`] = {
      rowSpan: m.max_row - m.min_row + 1,
      colSpan: m.max_col - m.min_col + 1,
    };
  }
  return spans;
}

// ─── Parse package family from sheet name ─────────────────────────────────────
function parseSheetFamily(sheetName) {
  // Extract the base package name (before the parenthetical plating type)
  const m = sheetName.match(/^(.+?)\s*\((.+)\)$/);
  if (m) return { family: m[1].trim(), variant: m[2].trim() };
  return { family: sheetName, variant: '' };
}

// Group sheets by family
function groupSheets(sheets) {
  const groups = {};
  for (const s of sheets) {
    const { family } = parseSheetFamily(s);
    if (!groups[family]) groups[family] = [];
    groups[family].push(s);
  }
  return groups;
}

// ─── Header Table Component ───────────────────────────────────────────────────
const HEADER_ROWS = 4; // rows 0-3 are headers, rows 4+ are data

function RelMonTable({ sheetData }) {
  const { rows, merges } = sheetData;
  if (!rows || rows.length === 0) return null;

  const covered = buildCoveredSet(merges);
  const spanMap = buildSpanMap(merges);
  const colorMap = buildColorMap(rows, merges, HEADER_ROWS);

  const numCols = rows[0]?.length ?? 0;

  // ── render header rows (0..HEADER_ROWS-1) ────────────────────────────────
  const headerRowEls = [];
  for (let r = 0; r < HEADER_ROWS; r++) {
    if (!rows[r] || rows[r].every(v => v === null)) continue; // skip fully-empty rows
    const cells = [];
    for (let c = 0; c < numCols; c++) {
      const key = `${r}_${c}`;
      if (covered.has(key)) continue;
      const span = spanMap[key] ?? {};
      const color = colorMap[key] ?? GROUP_COLORS.Default;
      const val = rows[r][c];
      cells.push(
        <th
          key={key}
          rowSpan={span.rowSpan ?? 1}
          colSpan={span.colSpan ?? 1}
          className={`px-2 py-1 text-center text-[10px] font-semibold border border-slate-600 whitespace-pre-wrap leading-tight min-w-[60px] ${color.bg} ${color.text}`}
        >
          {val !== null ? String(val) : ''}
        </th>
      );
    }
    headerRowEls.push(<tr key={`hr-${r}`}>{cells}</tr>);
  }

  // ── render data rows (HEADER_ROWS..) ─────────────────────────────────────
  const dataRowEls = [];
  for (let r = HEADER_ROWS; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every(v => v === null)) continue; // skip blank rows
    const cells = row.map((val, c) => (
      <td
        key={`${r}_${c}`}
        className="px-2 py-[3px] text-center text-xs border border-slate-200 dark:border-slate-600 whitespace-nowrap text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700"
      >
        {val !== null ? String(val) : ''}
      </td>
    ));
    dataRowEls.push(
      <tr key={`dr-${r}`} className="even:bg-slate-50 dark:even:bg-slate-900/40">
        {cells}
      </tr>
    );
  }

  if (dataRowEls.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400 dark:text-slate-500 text-sm">
        No data rows available for this sheet.
      </div>
    );
  }

  return (
    <div className="overflow-auto max-h-[calc(100vh-18rem)] border border-slate-300 dark:border-slate-600 rounded-lg shadow-inner">
      <table className="border-collapse text-xs" style={{ minWidth: `${numCols * 60}px` }}>
        <thead className="sticky top-0 z-10">{headerRowEls}</thead>
        <tbody>{dataRowEls}</tbody>
      </table>
    </div>
  );
}

// ─── Sheet Info Banner ────────────────────────────────────────────────────────
function SheetInfoBanner({ site, sheetName, sheetData }) {
  if (!sheetData) return null;
  const dataRows = (sheetData.rows?.slice(HEADER_ROWS) ?? []).filter(r => r?.some(v => v !== null));
  const { family, variant } = parseSheetFamily(sheetName);
  return (
    <div className="flex items-center gap-4 flex-wrap text-xs text-slate-500 dark:text-slate-400 mb-2 px-1">
      <span className="flex items-center gap-1">
        <TableProperties className="w-3.5 h-3.5" />
        <span className="font-medium text-slate-700 dark:text-slate-200">{family}</span>
        {variant && (
          <span className="ml-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium">
            {variant}
          </span>
        )}
      </span>
      <span>Factory: <strong>{site}</strong></span>
      <span>Data rows: <strong>{dataRows.length}</strong></span>
      <span>Columns: <strong>{sheetData.num_cols}</strong></span>
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────
export default function RelMon() {
  const [sites, setSites] = useState({});          // { ATP1: [...sheetNames], ATP3: [...] }
  const [activeSite, setActiveSite] = useState('ATP1');
  const [activeSheet, setActiveSheet] = useState(null);
  const [sheetData, setSheetData] = useState(null);
  const [loadingSheets, setLoadingSheets] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [expandedFamilies, setExpandedFamilies] = useState({});
  const abortRef = useRef(null);

  // ── Fetch available sites / sheets ─────────────────────────────────────
  useEffect(() => {
    setLoadingSheets(true);
    setError(null);
    api.get('/api/relmon/sheets')
      .then(res => {
        setSites(res.data);
        // Auto-select first available sheet
        const firstSite = Object.keys(res.data)[0] ?? 'ATP1';
        setActiveSite(firstSite);
        const firstSheet = res.data[firstSite]?.[0] ?? null;
        setActiveSheet(firstSheet);
        // Expand the first family by default
        if (firstSheet) {
          const { family } = parseSheetFamily(firstSheet);
          setExpandedFamilies({ [family]: true });
        }
      })
      .catch(e => setError('Failed to load sheet list: ' + (e?.response?.data?.detail ?? e.message)))
      .finally(() => setLoadingSheets(false));
  }, []);

  // ── Fetch sheet data whenever site/sheet changes ────────────────────────
  useEffect(() => {
    if (!activeSheet) return;
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoadingData(true);
    setSheetData(null);
    setError(null);

    api.get('/api/relmon/data', { params: { site: activeSite, sheet: activeSheet }, signal: ctrl.signal })
      .then(res => setSheetData(res.data))
      .catch(e => {
        if (e.name !== 'CanceledError' && e.code !== 'ERR_CANCELED') {
          setError('Failed to load sheet data: ' + (e?.response?.data?.detail ?? e.message));
        }
      })
      .finally(() => setLoadingData(false));

    return () => ctrl.abort();
  }, [activeSite, activeSheet]);

  const handleSiteChange = useCallback((site) => {
    setActiveSite(site);
    const firstSheet = sites[site]?.[0] ?? null;
    setActiveSheet(firstSheet);
    setExpandedFamilies({});
    if (firstSheet) {
      const { family } = parseSheetFamily(firstSheet);
      setExpandedFamilies({ [family]: true });
    }
  }, [sites]);

  const currentSheets = sites[activeSite] ?? [];
  const filteredSheets = search
    ? currentSheets.filter(s => s.toLowerCase().includes(search.toLowerCase()))
    : currentSheets;

  const grouped = groupSheets(filteredSheets);
  const families = Object.keys(grouped).sort();

  const toggleFamily = (fam) =>
    setExpandedFamilies(prev => ({ ...prev, [fam]: !prev[fam] }));

  // Export visible sheet as CSV
  const handleExportCSV = () => {
    if (!sheetData?.rows) return;
    const csvRows = sheetData.rows
      .filter(r => r?.some(v => v !== null))
      .map(r => r.map(v => {
        if (v === null) return '';
        const s = String(v).replace(/\n/g, ' ');
        return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(','));
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RELMON_${activeSite}_${activeSheet?.replace(/[^\w]/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-50 dark:bg-slate-900">

      {/* ── Masthead (replicates "ATP RELIABILITY MONITOR DATABASE" header) ── */}
      <div
        className="flex-shrink-0 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 30%, #38bdf8 70%, #7dd3fc 100%)',
          minHeight: '72px',
        }}
      >
        {/* Cloud decoration */}
        <div className="absolute inset-0 pointer-events-none select-none">
          {[
            { top: '10%', left: '5%',  w: 120, h: 40, op: 0.12 },
            { top: '30%', left: '18%', w: 90,  h: 30, op: 0.10 },
            { top: '15%', left: '55%', w: 140, h: 45, op: 0.10 },
            { top: '40%', left: '70%', w: 100, h: 35, op: 0.12 },
            { top: '5%',  left: '80%', w: 80,  h: 28, op: 0.08 },
          ].map((c, i) => (
            <div
              key={i}
              style={{
                position: 'absolute', top: c.top, left: c.left,
                width: c.w, height: c.h,
                background: 'white',
                borderRadius: '50%',
                opacity: c.op,
                filter: 'blur(8px)',
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex items-center justify-between px-6 h-full py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-wide drop-shadow font-heading uppercase">
                ATP Reliability Monitor Database
              </h1>
              <p className="text-sky-100 text-xs font-medium mt-0.5">
                Q4 2025 Summary Report &nbsp;·&nbsp; {activeSite}
              </p>
            </div>
          </div>

          {/* Site selector */}
          <div className="flex items-center gap-2">
            {Object.keys(sites).map(site => (
              <button
                key={site}
                onClick={() => handleSiteChange(site)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                  activeSite === site
                    ? 'bg-white text-blue-700 border-white shadow-md'
                    : 'bg-white/15 text-white border-white/30 hover:bg-white/25'
                }`}
              >
                {site}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body: sidebar + main content ─────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Left Sidebar: Package Type Navigator ────────────────────── */}
        <aside className="w-56 flex-shrink-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
          {/* Search */}
          <div className="p-2 border-b border-slate-200 dark:border-slate-700">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search package…"
                className="w-full pl-7 pr-6 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {loadingSheets ? (
            <div className="flex items-center justify-center flex-1">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            </div>
          ) : (
            <nav className="flex-1 overflow-y-auto py-1">
              {families.length === 0 ? (
                <p className="text-xs text-slate-400 text-center mt-4">No packages found</p>
              ) : families.map(fam => {
                const sheets = grouped[fam] ?? [];
                const isExpanded = expandedFamilies[fam] ?? false;
                const hasActive = sheets.includes(activeSheet);
                return (
                  <div key={fam}>
                    {/* Family header */}
                    <button
                      onClick={() => toggleFamily(fam)}
                      className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-xs font-semibold transition-colors ${
                        hasActive
                          ? 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      <span className="truncate">{fam}</span>
                      {isExpanded
                        ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
                        : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />}
                    </button>

                    {/* Variant items */}
                    {isExpanded && sheets.map(s => {
                      const { variant } = parseSheetFamily(s);
                      const isActive = s === activeSheet;
                      return (
                        <button
                          key={s}
                          onClick={() => setActiveSheet(s)}
                          className={`w-full flex items-center gap-2 pl-6 pr-3 py-1 text-left text-xs transition-colors ${
                            isActive
                              ? 'bg-blue-600 text-white font-semibold'
                              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0 opacity-60" />
                          <span className="truncate">{variant || s}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </nav>
          )}

          {/* Footer stats */}
          <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-700 text-[10px] text-slate-400 dark:text-slate-500">
            {currentSheets.length} sheets available
          </div>
        </aside>

        {/* ── Main Content ────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 flex flex-col p-4 gap-3 overflow-hidden">

          {/* Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-2 flex-shrink-0">
            <div>
              {activeSheet ? (
                <div>
                  <h2 className="text-base font-bold text-slate-800 dark:text-white leading-tight">
                    {activeSheet}
                  </h2>
                  <SheetInfoBanner site={activeSite} sheetName={activeSheet} sheetData={sheetData} />
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">Select a package type from the sidebar</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {sheetData && (
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </button>
              )}
              {activeSheet && (
                <button
                  onClick={() => {
                    const k = `${activeSite}__${activeSheet}`;
                    delete (window.__relmon_cache ?? {})[k];
                    setSheetData(null);
                    // re-trigger effect via dummy state
                    setActiveSheet(s => s);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh
                </button>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-300 flex-shrink-0">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Loading spinner */}
          {loadingData && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-sm">Loading {activeSheet}…</p>
            </div>
          )}

          {/* Empty state */}
          {!loadingData && !sheetData && !error && !loadingSheets && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400 dark:text-slate-500">
              <Database className="w-12 h-12 opacity-30" />
              <p className="text-sm">Select a package type from the sidebar to view data</p>
            </div>
          )}

          {/* Data Table */}
          {!loadingData && sheetData && (
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              {/* Column group legend */}
              <div className="flex flex-wrap gap-1.5 mb-2 flex-shrink-0">
                {[
                  { label: 'Package',               ...GROUP_COLORS.Package },
                  { label: 'Factory',                ...GROUP_COLORS.Factory },
                  { label: 'Materials',              ...GROUP_COLORS.Materials },
                  { label: 'Preconditioning',        ...GROUP_COLORS.Precond },
                  { label: 'Delamination (Before)',  ...GROUP_COLORS.DelamBefore },
                  { label: 'Delamination (After)',   ...GROUP_COLORS.DelamAfter },
                  { label: 'MRT Results',            ...GROUP_COLORS.MRT },
                  { label: 'Reliability Results',    ...GROUP_COLORS.Reliability },
                ].map(g => (
                  <span key={g.label} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${g.bg} ${g.text}`}>
                    {g.label}
                  </span>
                ))}
              </div>

              <RelMonTable sheetData={sheetData} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
