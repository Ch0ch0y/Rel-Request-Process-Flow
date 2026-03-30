import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import {
  Search, Archive, ChevronRight, Pencil, Save, X, ClipboardList
} from 'lucide-react';
import { parseRetentionDetails } from '../constants/retentionConstants';

const CLASSIFICATIONS = ['All', 'RR', 'RRS', 'RMS'];

/**
 * Extract box locations from all retention records
 */
function extractBoxLocationsFromRequests(requests) {
  const locations = new Set();
  requests.forEach(req => {
    if (req.retention_details) {
      try {
        const data = parseRetentionDetails(req.retention_details);
        if (data.retentionData) {
          const rt = data.retentionData.reliabilityTested?.boxLocation;
          const eu = data.retentionData.excessUnits?.boxLocation;
          const st = data.retentionData.sentToTanyag?.tanyagRetentionBoxNum;
          if (rt) locations.add(rt);
          if (eu) locations.add(eu);
          if (st) locations.add(st);
        }
      } catch {}
    }
  });
  return Array.from(locations).sort();
}

/**
 * Get retention type from retention data
 */
function getRetentionType(retentionData) {
  if (!retentionData) return null;
  const types = [];
  if (Object.values(retentionData.retentionData?.reliabilityTested || {}).some(v => v)) {
    types.push('Reliability Tested');
  }
  if (Object.values(retentionData.retentionData?.excessUnits || {}).some(v => v)) {
    types.push('Excess');
  }
  if (Object.values(retentionData.retentionData?.sentToTanyag || {}).some(v => v)) {
    types.push('Sent to Tanyag');
  }
  return types.length > 0 ? types.join(' / ') : null;
}

/**
 * Extract retention summary information
 */
function extractRetentionSummary(retentionDetails) {
  try {
    const data = parseRetentionDetails(retentionDetails);
    return {
      retentionData: data,
      type: getRetentionType(data),
      quantity:
        (data.retentionData?.reliabilityTested?.quantity || 0) +
        (data.retentionData?.excessUnits?.quantity || 0) +
        (data.retentionData?.sentToTanyag?.quantity || 0),
      boxLocation:
        data.retentionData?.reliabilityTested?.boxLocation ||
        data.retentionData?.excessUnits?.boxLocation ||
        data.retentionData?.sentToTanyag?.tanyagRetentionBoxNum,
    };
  } catch {
    return { type: null, quantity: 0, boxLocation: null };
  }
}

function ClassificationBadge({ value }) {
  const colors = {
    RR:  'bg-blue-100 text-blue-700 border-blue-200',
    RRS: 'bg-purple-100 text-purple-700 border-purple-200',
    RMS: 'bg-teal-100 text-teal-700 border-teal-200',
  };
  const cls = colors[value] || 'bg-slate-100 text-slate-600 border-slate-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {value || '—'}
    </span>
  );
}

function RetentionCell({ request, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(request.retention_details || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.updateRequest(request.id, { retention_details: value.trim() || null });
      setEditing(false);
      onSaved();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  if (editing) {
    return (
      <div className="flex items-start gap-2 min-w-0">
        <textarea
          autoFocus
          rows={2}
          value={value}
          onChange={e => setValue(e.target.value)}
          className="flex-1 border border-emerald-300 dark:border-emerald-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 rounded px-2 py-1 text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 resize-none min-w-0"
          placeholder="Enter retention details…"
        />
        <div className="flex flex-col gap-1 flex-shrink-0">
          <button onClick={save} disabled={saving}
            className="p-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50">
            <Save className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => { setEditing(false); setValue(request.retention_details || ''); }}
            className="p-1 rounded bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-600 dark:text-slate-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-1 group">
      <span className={`text-xs leading-relaxed flex-1 ${request.retention_details ? 'text-emerald-900 dark:text-emerald-300 whitespace-pre-wrap' : 'text-slate-400 dark:text-slate-500 italic'}`}>
        {request.retention_details || 'Not recorded'}
      </span>
      <button onClick={() => { setValue(request.retention_details || ''); setEditing(true); }}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all">
        <Pencil className="w-3 h-3" />
      </button>
    </div>
  );
}

export default function RetentionMonitor() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('All');
  const [boxLocationFilter, setBoxLocationFilter] = useState('');
  const [boxLocations, setBoxLocations] = useState([]);

  const loadRequests = () => {
    setLoading(true);
    api.getRequests({ status: 'completed' })
      .then(reqs => {
        setRequests(reqs);
        setBoxLocations(extractBoxLocationsFromRequests(reqs));
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadRequests(); }, []);

  const filtered = requests.filter(r => {
    // Classification filter
    const matchClass = classFilter === 'All' || (r.classification || '').toUpperCase() === classFilter;
    
    // General text search
    const q = search.toLowerCase();
    const matchSearch = !q || [r.request_number, r.device_name, r.customer, r.lot_no, r.originator]
      .some(v => (v || '').toLowerCase().includes(q));
    
    // Box Location filter
    let matchBoxLocation = true;
    if (boxLocationFilter) {
      const summary = extractRetentionSummary(r.retention_details);
      matchBoxLocation = summary.boxLocation === boxLocationFilter;
    }

    return matchClass && matchSearch && matchBoxLocation;
  });

  const withRetention = filtered.filter(r => r.retention_details).length;
  const withoutRetention = filtered.filter(r => !r.retention_details).length;

  return (
    <div className="space-y-6 stagger-children">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 dark:text-white tracking-tight">Retention Monitor</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Track retention details for completed reliability requests.</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-700/50">
            {withRetention} recorded
          </span>
          <span className="px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-semibold border border-amber-200 dark:border-amber-700/50">
            {withoutRetention} pending
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        {/* Primary search and classification filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by request number, device, customer, lot…"
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 transition-all"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {CLASSIFICATIONS.map(c => (
              <button key={c} onClick={() => setClassFilter(c)}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  classFilter === c
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-300'
                }`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Box Location search filter */}
        {boxLocations.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
              Search Box Location:
            </label>
            <div className="relative flex-1 max-w-xs">
              <select
                value={boxLocationFilter}
                onChange={e => setBoxLocationFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              >
                <option value="">All Locations</option>
                {boxLocations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full" />
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg p-4 text-sm">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
          <Archive className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">No results found{boxLocationFilter ? ` for location "${boxLocationFilter}"` : ''}</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Request #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Class</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Device</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Lot No.</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Box Location</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Qty</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.map(req => {
                  const summary = extractRetentionSummary(req.retention_details);
                  return (
                    <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">{req.request_number}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <ClassificationBadge value={req.classification} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-slate-700 dark:text-slate-300 text-xs font-medium">{req.device_name || '—'}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-slate-600 dark:text-slate-400 text-xs">{req.customer || '—'}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-slate-600 dark:text-slate-400 text-xs">{req.lot_no || '—'}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          {summary.boxLocation || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          {summary.type || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {summary.quantity > 0 ? summary.quantity : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link to={`/requests/${req.id}`}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 inline-flex items-center transition-colors"
                          title="Open request">
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500">
            Showing {filtered.length} of {requests.length} completed requests
          </div>
        </div>
      )}
    </div>
  );
}

