import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Search, Archive, ChevronRight } from 'lucide-react';
import { parseRetentionDetails } from '../constants/retentionConstants';

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

function getRetentionType(retentionData) {
  if (!retentionData) return null;
  const types = [];
  if (Object.values(retentionData.retentionData?.reliabilityTested || {}).some(v => v)) types.push('Reliability Tested');
  if (Object.values(retentionData.retentionData?.excessUnits || {}).some(v => v)) types.push('Excess');
  if (Object.values(retentionData.retentionData?.sentToTanyag || {}).some(v => v)) types.push('Sent to Tanyag');
  return types.length > 0 ? types.join(' / ') : null;
}

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

export default function RetentionMonitor() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [boxLocationFilter, setBoxLocationFilter] = useState('');
  const [boxLocations, setBoxLocations] = useState([]);

  const loadRequests = () => {
    setLoading(true);
    api.getRequests()
      .then(reqs => {
        const completed = reqs.filter(r => r.status === 'completed');
        setRequests(completed);
        setBoxLocations(extractBoxLocationsFromRequests(completed));
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadRequests(); }, []);

  const filtered = requests.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || [r.ca_number, r.device_name, r.customer, r.lot_no, r.originator, r.title]
      .some(v => (v || '').toLowerCase().includes(q));
    let matchBoxLocation = true;
    if (boxLocationFilter) {
      const summary = extractRetentionSummary(r.retention_details);
      matchBoxLocation = summary.boxLocation === boxLocationFilter;
    }
    return matchSearch && matchBoxLocation;
  });

  const withRetention = filtered.filter(r => r.retention_details).length;
  const withoutRetention = filtered.filter(r => !r.retention_details).length;

  return (
    <div className="space-y-6 stagger-children">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 dark:text-white tracking-tight">Retention Monitor</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Track retention details for completed CA requests.</p>
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
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by CA number, device, customer, lot…"
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition-all" />
          </div>
        </div>
        {boxLocations.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">Search Box Location:</label>
            <div className="relative flex-1 max-w-xs">
              <select value={boxLocationFilter} onChange={e => setBoxLocationFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-300">
                <option value="">All Locations</option>
                {boxLocations.map(loc => (<option key={loc} value={loc}>{loc}</option>))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full" />
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg p-4 text-sm">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
          <Archive className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">No completed requests found{boxLocationFilter ? ` for location "${boxLocationFilter}"` : ''}</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">CA #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Title</th>
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
                        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">{req.ca_number}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium max-w-[200px] truncate block">{req.title || '—'}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-slate-700 dark:text-slate-300 text-xs font-medium">{req.device_name || req.device || '—'}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-slate-600 dark:text-slate-400 text-xs">{req.customer || '—'}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-slate-600 dark:text-slate-400 text-xs">{req.lot_no || req.lot_number || '—'}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{summary.boxLocation || '—'}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-slate-600 dark:text-slate-400">{summary.type || '—'}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{summary.quantity > 0 ? summary.quantity : '—'}</span>
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
