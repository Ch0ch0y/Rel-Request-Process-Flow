import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api';
import {
  Database, RefreshCw, Loader2, AlertTriangle, ChevronRight,
  ChevronDown, Search, Download, Save, Plus, X, List
} from 'lucide-react';

const HEADER_ROWS = 4;

const GROUP_COLORS = {
  Package:      { bg: 'bg-sky-600', text: 'text-white' },
  Factory:      { bg: 'bg-cyan-600', text: 'text-white' },
  Materials:    { bg: 'bg-violet-600', text: 'text-white' },
  Precond:      { bg: 'bg-amber-500', text: 'text-white' },
  DelamBefore:  { bg: 'bg-red-600', text: 'text-white' },
  DelamAfter:   { bg: 'bg-rose-500', text: 'text-white' },
  MRT:          { bg: 'bg-emerald-600', text: 'text-white' },
  Reliability:  { bg: 'bg-indigo-600', text: 'text-white' },
  Default:      { bg: 'bg-slate-500', text: 'text-white' },
};

const RELMON_TABS = [
  { id: 'pkg_lot', label: 'Pkg and Lot Description' },
  { id: 'materials', label: 'Materials' },
  { id: 'rel_test', label: 'REL Test Requirements' },
  { id: 'long_term', label: 'Long Term Test Requirements' },
  { id: 'result', label: 'Result' },
  { id: 'summary', label: 'Delam Summary / Special Instructions' },
];

const RELMON_FORM_SCHEMA = {
  common: [
    { key: 'type', label: 'Type', type: 'type-radio' },
    { key: 'date_received', label: 'Date Received', type: 'date' },
    { key: 'date_enrolled', label: 'Date Enrolled', type: 'date' },
    { key: 'enrolled_by', label: 'Enrolled By' },
    { key: 'rms_no', label: 'RMS No.' },
    { key: 'ww', label: 'WW' },
    { key: 'date_reported', label: 'Date Reported', type: 'date' },
  ],
  pkg_lot: [
    { key: 'package_code', label: 'Package Code' },
    { key: 'package_type', label: 'Package Type' },
    { key: 'lead_ball_count', label: 'Lead/Ball Count' },
    { key: 'package_size', label: 'Package Size' },
    { key: 'package_thickness', label: 'Package Thickness' },
    { key: 'lead_pitch', label: 'Lead Pitch' },
    { key: 'assembly_site', label: 'Assembly Site' },
    { key: 'customer_no', label: 'Customer No.' },
    { key: 'customer', label: 'Customer' },
    { key: 'device_number', label: 'Device Number' },
    { key: 'lot_number', label: 'Lot Number' },
    { key: 'date_code', label: 'Date Code' },
    { key: 'unit_quantity', label: 'Unit Quantity' },
  ],
  materials: [
    { key: 'die_size_mils', label: 'Die Size (mils)' },
    { key: 'passivation', label: 'Passivation' },
    { key: 'metallization', label: 'Metallization' },
    { key: 'die_pad_size_mils', label: 'Die Pad Size (mils)' },
    { key: 'lf_type', label: 'LF Type' },
    { key: 'lf_subs_material', label: 'LF/Subs Material' },
    { key: 'lf_subs_supplier', label: 'LF/Subs Supplier' },
    { key: 'lf_subs_sid', label: 'LF/Subs SID #' },
    { key: 'die_attach_material', label: 'Die Attach Material' },
    { key: 'wire_size_type', label: 'Wire Size/Type' },
    { key: 'die_coat', label: 'Die Coat' },
    { key: 'emc_encap_fill_material', label: 'EMC/Encap/Fill Matl' },
    { key: 'hs', label: 'HS' },
  ],
  rel_test: [
    { key: 'mrt_level', label: 'MRT Level' },
    { key: 'process', label: 'Process' },
    { key: 'condition', label: 'Condition' },
    { key: 'read_point', label: 'Read Point' },
    { key: 'qty', label: 'Qty' },
    { key: 'date_in', label: 'Date-In', type: 'date' },
    { key: 'date_out', label: 'Date-Out', type: 'date' },
    { key: 'ma', label: 'MA' },
  ],
  long_term: [
    { key: 'longterm_processcode', label: 'PROCESSCODE' },
    { key: 'longterm_condition', label: 'Condition' },
    { key: 'longterm_read_point', label: 'Read Point' },
    { key: 'longterm_ss', label: 'SS' },
    { key: 'longterm_date_test_start', label: 'Date Test Start', type: 'date' },
    { key: 'longterm_date_test_end', label: 'Date Test End', type: 'date' },
    { key: 'longterm_mach_no', label: 'Mach No' },
    { key: 'longterm_optr_load', label: 'OPTR (Load)' },
    { key: 'longterm_optr_unload', label: 'OPTR (Unload)' },
  ],
  result: [
    { key: 'unit_no', label: 'Unit No' },
    { key: 'prior_mrt_t1', label: 'Prior MRT T1' },
    { key: 'prior_mrt_t2', label: 'Prior MRT T2' },
    { key: 'prior_mrt_t3', label: 'Prior MRT T3' },
    { key: 'prior_mrt_t4', label: 'Prior MRT T4' },
    { key: 'prior_mrt_t5', label: 'Prior MRT T5' },
    { key: 'post_mrt_t1', label: 'Post MRT T1' },
    { key: 'post_mrt_t2', label: 'Post MRT T2' },
    { key: 'post_mrt_t3', label: 'Post MRT T3' },
    { key: 'post_mrt_t4', label: 'Post MRT T4' },
    { key: 'post_mrt_t5', label: 'Post MRT T5' },
    { key: 'unit_qty', label: 'Unit Qty' },
    { key: 'et_rej', label: 'ET Rej' },
    { key: 'ie_crack', label: 'I/E Crack' },
    { key: 'lt_rej', label: 'LT Rej' },
  ],
  summary: [
    { key: 'delamination_summary', label: 'Delamination Summary', type: 'textarea' },
    { key: 'remarks_special_instruction', label: 'Remarks / Special Instruction', type: 'textarea' },
    { key: 'mrt_lt_remarks', label: 'MRT/LT Remarks', type: 'textarea' },
  ],
};

function buildDefaultFormData() {
  const out = { type: 'Standard' };
  Object.values(RELMON_FORM_SCHEMA).forEach((fields) => {
    fields.forEach((f) => {
      if (f.key !== 'type' && out[f.key] === undefined) {
        out[f.key] = '';
      }
    });
  });
  return out;
}

function parseSheetFamily(sheetName) {
  const m = sheetName.match(/^(.+?)\s*\((.+)\)$/);
  if (m) return { family: m[1].trim(), variant: m[2].trim() };
  return { family: sheetName, variant: '' };
}

function groupSheets(sheets) {
  const groups = {};
  for (const s of sheets) {
    const { family } = parseSheetFamily(s);
    if (!groups[family]) groups[family] = [];
    groups[family].push(s);
  }
  return groups;
}

function getGroupColor(cellValue) {
  if (!cellValue) return GROUP_COLORS.Default;
  const v = String(cellValue).toLowerCase();
  if (v.includes('package')) return GROUP_COLORS.Package;
  if (v.includes('factory')) return GROUP_COLORS.Factory;
  if (v.includes('material')) return GROUP_COLORS.Materials;
  if (v.includes('preconditioning') && v.includes('condition')) return GROUP_COLORS.Precond;
  if (v.includes('before')) return GROUP_COLORS.DelamBefore;
  if (v.includes('after')) return GROUP_COLORS.DelamAfter;
  if (v.includes('mrt')) return GROUP_COLORS.MRT;
  if (v.includes('reliability')) return GROUP_COLORS.Reliability;
  return GROUP_COLORS.Default;
}

function buildColorMap(rows, merges, headerRows = HEADER_ROWS) {
  const map = {};
  if (!rows || !merges) return map;

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

  for (let r = 0; r < headerRows; r++) {
    const numCols = rows[0]?.length ?? 0;
    for (let c = 0; c < numCols; c++) {
      const key = `${r}_${c}`;
      if (!map[key]) {
        const above = map[`${r - 1}_${c}`];
        if (above) {
          map[key] = above;
        } else {
          for (let sc = c; sc >= 0; sc--) {
            const found = map[`0_${sc}`];
            if (found) {
              map[key] = found;
              break;
            }
          }
        }
      }
    }
  }

  return map;
}

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

function normalizeRows(rows) {
  if (!Array.isArray(rows)) return [];
  const cloned = rows.map((row) => (Array.isArray(row) ? [...row] : [row]));
  const maxCols = cloned.reduce((m, row) => Math.max(m, row.length), 0);
  return cloned.map((row) => {
    if (row.length < maxCols) {
      return [...row, ...new Array(maxCols - row.length).fill(null)];
    }
    return row;
  });
}

function RelMonFormField({ field, value, onChange }) {
  if (field.type === 'type-radio') {
    return (
      <div className="col-span-2 rounded-lg border border-slate-200 dark:border-slate-700 p-2">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">{field.label}</p>
        <div className="flex items-center gap-4 text-sm">
          <label className="inline-flex items-center gap-2 text-slate-700 dark:text-slate-200">
            <input
              type="radio"
              checked={value === 'Standard'}
              onChange={() => onChange('type', 'Standard')}
            />
            Standard
          </label>
          <label className="inline-flex items-center gap-2 text-slate-700 dark:text-slate-200">
            <input
              type="radio"
              checked={value === 'Customer Specific'}
              onChange={() => onChange('type', 'Customer Specific')}
            />
            Customer Specific
          </label>
        </div>
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <label className="flex flex-col gap-1 col-span-2 lg:col-span-1">
        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{field.label}</span>
        <textarea
          rows={4}
          value={value ?? ''}
          onChange={(e) => onChange(field.key, e.target.value)}
          className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </label>
    );
  }

  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{field.label}</span>
      <input
        type={field.type === 'date' ? 'date' : 'text'}
        value={value ?? ''}
        onChange={(e) => onChange(field.key, e.target.value)}
        className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
    </label>
  );
}

function EditableRelMonTable({ rows, merges, onCellChange, onAddRow, onAddColumn }) {
  if (!rows || rows.length === 0) return null;

  const safeRows = normalizeRows(rows);
  const covered = buildCoveredSet(merges || []);
  const spanMap = buildSpanMap(merges || []);
  const colorMap = buildColorMap(safeRows, merges || []);
  const numCols = safeRows[0]?.length ?? 0;

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-xs">
        <button
          onClick={onAddRow}
          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <Plus className="w-3.5 h-3.5" /> Add Row
        </button>
        <button
          onClick={onAddColumn}
          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <Plus className="w-3.5 h-3.5" /> Add Column
        </button>
      </div>

      <div className="overflow-auto max-h-[calc(100vh-25rem)] border border-slate-300 dark:border-slate-600 rounded-lg shadow-inner bg-white dark:bg-slate-900">
        <table className="border-collapse text-xs" style={{ minWidth: `${numCols * 88}px` }}>
          <tbody>
            {safeRows.map((row, r) => {
              const cells = [];
              for (let c = 0; c < numCols; c++) {
                const key = `${r}_${c}`;
                if (covered.has(key)) continue;

                const span = spanMap[key] ?? {};
                const isHeader = r < HEADER_ROWS;
                const color = colorMap[key] ?? GROUP_COLORS.Default;
                const val = row[c];

                if (isHeader) {
                  cells.push(
                    <th
                      key={key}
                      rowSpan={span.rowSpan ?? 1}
                      colSpan={span.colSpan ?? 1}
                      className={`border border-slate-600 min-w-[80px] px-1 py-1 align-middle ${color.bg} ${color.text}`}
                    >
                      <textarea
                        rows={1}
                        value={val ?? ''}
                        onChange={(e) => onCellChange(r, c, e.target.value)}
                        className="w-full resize-y bg-transparent text-center text-[10px] font-semibold leading-tight outline-none"
                      />
                    </th>
                  );
                } else {
                  cells.push(
                    <td
                      key={key}
                      rowSpan={span.rowSpan ?? 1}
                      colSpan={span.colSpan ?? 1}
                      className="border border-slate-200 dark:border-slate-700 min-w-[80px] px-1 py-1 bg-white dark:bg-slate-800"
                    >
                      <input
                        value={val ?? ''}
                        onChange={(e) => onCellChange(r, c, e.target.value)}
                        className="w-full bg-transparent text-center text-xs text-slate-700 dark:text-slate-100 outline-none"
                      />
                    </td>
                  );
                }
              }

              return <tr key={`row-${r}`} className="even:bg-slate-50/50 dark:even:bg-slate-900/30">{cells}</tr>;
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function RelMon() {
  const [sites, setSites] = useState({});
  const [activeSite, setActiveSite] = useState('ATP1');
  const [activeSheet, setActiveSheet] = useState(null);
  const [activeTab, setActiveTab] = useState('pkg_lot');
  const [rows, setRows] = useState([]);
  const [merges, setMerges] = useState([]);
  const [formData, setFormData] = useState(buildDefaultFormData());
  const [meta, setMeta] = useState({ num_rows: 0, num_cols: 0, updated_at: null, updated_by: null });
  const [loadingSheets, setLoadingSheets] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [expandedFamilies, setExpandedFamilies] = useState({});
  const [reloadTick, setReloadTick] = useState(0);
  const [showDeviceTypeModal, setShowDeviceTypeModal] = useState(false);
  const [deviceTypeLoading, setDeviceTypeLoading] = useState(false);
  const [deviceTypeError, setDeviceTypeError] = useState(null);
  const [deviceTypeOrder, setDeviceTypeOrder] = useState('asc');
  const [deviceTypeData, setDeviceTypeData] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    setLoadingSheets(true);
    setError(null);
    api.get('/relmon/sheets')
      .then((res) => {
        setSites(res);
        const firstSite = Object.keys(res)[0] ?? 'ATP1';
        setActiveSite(firstSite);
        const firstSheet = res[firstSite]?.[0] ?? null;
        setActiveSheet(firstSheet);
        if (firstSheet) {
          const { family } = parseSheetFamily(firstSheet);
          setExpandedFamilies({ [family]: true });
        }
      })
      .catch((e) => setError(`Failed to load sheet list: ${e?.message ?? 'Unknown error'}`))
      .finally(() => setLoadingSheets(false));
  }, []);

  useEffect(() => {
    if (!activeSheet) return;
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoadingData(true);
    setError(null);

    api.get(`/relmon/data?site=${encodeURIComponent(activeSite)}&sheet=${encodeURIComponent(activeSheet)}`)
      .then((res) => {
        setRows(normalizeRows(res.rows ?? []));
        setMerges(Array.isArray(res.merges) ? res.merges : []);
        setFormData({ ...buildDefaultFormData(), ...(res.form_data ?? {}) });
        setMeta({
          num_rows: res.num_rows ?? 0,
          num_cols: res.num_cols ?? 0,
          updated_at: res.updated_at ?? null,
          updated_by: res.updated_by ?? null,
        });
        setDirty(false);
      })
      .catch((e) => {
        if (e.name !== 'CanceledError' && e.code !== 'ERR_CANCELED') {
          setError(`Failed to load sheet data: ${e?.message ?? 'Unknown error'}`);
        }
      })
      .finally(() => setLoadingData(false));

    return () => ctrl.abort();
  }, [activeSite, activeSheet, reloadTick]);

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

  const handleFormChange = useCallback((key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }, []);

  const handleCellChange = useCallback((r, c, value) => {
    setRows((prev) => {
      const next = normalizeRows(prev);
      while (next.length <= r) {
        next.push(new Array(next[0]?.length ?? c + 1).fill(null));
      }

      const currentCols = next[0]?.length ?? 0;
      if (c >= currentCols) {
        const targetCols = c + 1;
        for (let i = 0; i < next.length; i++) {
          const row = [...next[i]];
          if (row.length < targetCols) {
            row.push(...new Array(targetCols - row.length).fill(null));
          }
          next[i] = row;
        }
      }

      next[r] = [...next[r]];
      next[r][c] = value;
      return next;
    });
    setDirty(true);
  }, []);

  const handleAddRow = useCallback(() => {
    setRows((prev) => {
      const normalized = normalizeRows(prev);
      const cols = normalized[0]?.length ?? 1;
      return [...normalized, new Array(cols).fill(null)];
    });
    setDirty(true);
  }, []);

  const handleAddColumn = useCallback(() => {
    setRows((prev) => {
      const normalized = normalizeRows(prev);
      if (normalized.length === 0) return [[null]];
      return normalized.map((row) => [...row, null]);
    });
    setDirty(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!activeSheet || saving) return;
    setSaving(true);
    setError(null);

    api.put('/relmon/data', {
      site: activeSite,
      sheet: activeSheet,
      rows,
      merges,
      form_data: formData,
    })
      .then((res) => {
        setMeta((prev) => ({
          ...prev,
          updated_at: res.updated_at ?? prev.updated_at,
          updated_by: res.updated_by ?? prev.updated_by,
          num_rows: res.num_rows ?? rows.length,
          num_cols: res.num_cols ?? (rows[0]?.length ?? 0),
        }));
        setDirty(false);
      })
      .catch((e) => {
        setError(`Failed to save RELMON data: ${e?.message ?? 'Unknown error'}`);
      })
      .finally(() => setSaving(false));
  }, [activeSheet, activeSite, formData, merges, rows, saving]);

  const currentSheets = sites[activeSite] ?? [];
  const filteredSheets = search
    ? currentSheets.filter((s) => s.toLowerCase().includes(search.toLowerCase()))
    : currentSheets;
  const grouped = groupSheets(filteredSheets);
  const families = Object.keys(grouped).sort();

  const toggleFamily = (fam) => {
    setExpandedFamilies((prev) => ({ ...prev, [fam]: !prev[fam] }));
  };

  const handleExportCSV = () => {
    if (!rows?.length) return;
    const csvRows = rows
      .map((r) => r.map((v) => {
        if (v === null || v === undefined) return '';
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

  const loadDeviceTypes = useCallback((order = 'asc') => {
    setDeviceTypeLoading(true);
    setDeviceTypeError(null);
    api.get(`/relmon/device-types?site=${encodeURIComponent(activeSite)}&order=${encodeURIComponent(order)}`)
      .then((res) => {
        setDeviceTypeData(res);
        setDeviceTypeOrder(order);
      })
      .catch((e) => {
        setDeviceTypeError(`Failed to load device types: ${e?.message ?? 'Unknown error'}`);
      })
      .finally(() => setDeviceTypeLoading(false));
  }, [activeSite]);

  const openDeviceTypeModal = useCallback(() => {
    setShowDeviceTypeModal(true);
    loadDeviceTypes(deviceTypeOrder);
  }, [deviceTypeOrder, loadDeviceTypes]);

  const closeDeviceTypeModal = useCallback(() => {
    setShowDeviceTypeModal(false);
  }, []);

  const handleSelectSheetFromModal = useCallback((sheetName, familyName) => {
    setSearch('');
    setExpandedFamilies({ [familyName]: true });
    setActiveSheet(sheetName);
    setShowDeviceTypeModal(false);
  }, []);

  const { family, variant } = parseSheetFamily(activeSheet || '');
  const activeTabFields = RELMON_FORM_SCHEMA[activeTab] ?? [];
  const siteDeviceTypeInfo = deviceTypeData?.sites?.[activeSite];

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-50 dark:bg-slate-900">
      <div
        className="flex-shrink-0 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 30%, #38bdf8 70%, #7dd3fc 100%)',
          minHeight: '76px',
        }}
      >
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
                Editable Mode · {activeSite}{activeSheet ? ` · ${activeSheet}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {Object.keys(sites).map((site) => (
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

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <aside className="w-56 flex-shrink-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
          <div className="p-2 border-b border-slate-200 dark:border-slate-700">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search package..."
                className="w-full pl-7 pr-6 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              onClick={openDeviceTypeModal}
              className="w-full mt-2 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-blue-300 dark:border-blue-500/50 bg-blue-50 dark:bg-blue-900/20 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/35 transition-colors"
            >
              <List className="w-3.5 h-3.5" />
              View All Device Type
            </button>
          </div>

          {loadingSheets ? (
            <div className="flex items-center justify-center flex-1">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            </div>
          ) : (
            <nav className="flex-1 overflow-y-auto py-1">
              {families.length === 0 ? (
                <p className="text-xs text-slate-400 text-center mt-4">No packages found</p>
              ) : families.map((fam) => {
                const sheets = grouped[fam] ?? [];
                const isExpanded = expandedFamilies[fam] ?? false;
                const hasActive = sheets.includes(activeSheet);
                return (
                  <div key={fam}>
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

                    {isExpanded && sheets.map((s) => {
                      const parsed = parseSheetFamily(s);
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
                          <span className="truncate">{parsed.variant || s}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </nav>
          )}

          <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-700 text-[10px] text-slate-400 dark:text-slate-500">
            {currentSheets.length} sheets available
          </div>
        </aside>

        <main className="flex-1 min-w-0 flex flex-col p-4 gap-3 overflow-hidden">
          <div className="flex items-center justify-between flex-wrap gap-2 flex-shrink-0">
            <div>
              {activeSheet ? (
                <div>
                  <h2 className="text-base font-bold text-slate-800 dark:text-white leading-tight">
                    {family}{variant ? ` (${variant})` : ''}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Rows: {rows.length} · Columns: {rows[0]?.length ?? 0}
                    {meta.updated_at ? ` · Last save: ${new Date(meta.updated_at).toLocaleString()}${meta.updated_by ? ` by ${meta.updated_by}` : ''}` : ''}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">Select a package type from the sidebar</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                disabled={!rows.length || loadingData}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>

              <button
                onClick={() => setReloadTick((v) => v + 1)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reload
              </button>

              <button
                onClick={handleSave}
                disabled={!activeSheet || loadingData || saving}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                  dirty
                    ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
                    : 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700'
                } disabled:opacity-50`}
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {saving ? 'Saving...' : dirty ? 'Save Changes' : 'Saved'}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-300 flex-shrink-0">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loadingData && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-sm">Loading editable RELMON data...</p>
            </div>
          )}

          {!loadingData && activeSheet && (
            <>
              <section className="flex-shrink-0 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
                  {RELMON_FORM_SCHEMA.common.map((field) => (
                    <RelMonFormField
                      key={field.key}
                      field={field}
                      value={formData[field.key]}
                      onChange={handleFormChange}
                    />
                  ))}
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {RELMON_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-100 dark:bg-slate-700/70 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {activeTabFields.map((field) => (
                    <RelMonFormField
                      key={field.key}
                      field={field}
                      value={formData[field.key]}
                      onChange={handleFormChange}
                    />
                  ))}
                </div>
              </section>

              <EditableRelMonTable
                rows={rows}
                merges={merges}
                onCellChange={handleCellChange}
                onAddRow={handleAddRow}
                onAddColumn={handleAddColumn}
              />
            </>
          )}

          {!loadingData && !activeSheet && !error && !loadingSheets && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400 dark:text-slate-500">
              <Database className="w-12 h-12 opacity-30" />
              <p className="text-sm">Select a package type from the sidebar to start editing RELMON</p>
            </div>
          )}
        </main>
      </div>

      {showDeviceTypeModal && (
        <div className="fixed inset-0 z-40 bg-slate-900/55 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">All Device Type · {activeSite}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {siteDeviceTypeInfo?.source === 'workbook' ? 'Source: Workbook' : siteDeviceTypeInfo?.source ? 'Source: Saved data' : 'Load device types for this site'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadDeviceTypes('asc')}
                  className={`px-2 py-1 rounded text-xs border ${deviceTypeOrder === 'asc'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600'}`}
                >
                  Sort A-Z
                </button>
                <button
                  onClick={() => loadDeviceTypes('desc')}
                  className={`px-2 py-1 rounded text-xs border ${deviceTypeOrder === 'desc'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600'}`}
                >
                  Sort Z-A
                </button>
                <button
                  onClick={closeDeviceTypeModal}
                  className="p-1.5 rounded border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 max-h-[70vh] overflow-y-auto">
              {deviceTypeLoading && (
                <div className="flex items-center justify-center py-10 text-slate-500 dark:text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Loading device types...
                </div>
              )}

              {!deviceTypeLoading && deviceTypeError && (
                <div className="rounded-lg border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300 px-3 py-2">
                  {deviceTypeError}
                </div>
              )}

              {!deviceTypeLoading && !deviceTypeError && !siteDeviceTypeInfo && (
                <p className="text-sm text-slate-500 dark:text-slate-400">No device type data found for this site.</p>
              )}

              {!deviceTypeLoading && !deviceTypeError && siteDeviceTypeInfo && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {siteDeviceTypeInfo.count} device types available
                  </p>

                  {(siteDeviceTypeInfo.grouped_sheets || []).map((group) => (
                    <div key={group.device_type} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/30 p-3">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">{group.device_type}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(group.sheets || []).map((sheet) => (
                          <button
                            key={sheet}
                            onClick={() => handleSelectSheetFromModal(sheet, group.device_type)}
                            className="px-2 py-1 rounded-md text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                            title={`Open ${sheet}`}
                          >
                            {sheet}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
