import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import ProcessTimeline from '../components/ProcessTimeline';
import {
  Search, CheckCircle2, ChevronRight, Printer, Clock, Download, MessageSquarePlus
} from 'lucide-react';

function StatusBadge({ status }) {
  const map = {
    incoming:      'bg-amber-100 text-amber-700 border-amber-200',
    pending:       'bg-amber-100 text-amber-700 border-amber-200',
    review:        'bg-blue-100 text-blue-700 border-blue-200',
    approval:      'bg-violet-100 text-violet-700 border-violet-200',
    testing:       'bg-orange-100 text-orange-700 border-orange-200',
    in_progress:   'bg-orange-100 text-orange-700 border-orange-200',
    analysis:      'bg-teal-100 text-teal-700 border-teal-200',
    completed:     'bg-emerald-100 text-emerald-700 border-emerald-200',
    discontinued:  'bg-rose-100 text-rose-700 border-rose-200',
  };
  const labels = {
    incoming: 'Request', pending: 'Request', review: 'Review',
    approval: 'Approval', testing: 'Testing', in_progress: 'Testing',
    analysis: 'Analysis', completed: 'Completed', discontinued: 'Discontinued',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${map[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {labels[status] || status?.replace('_', ' ')}
    </span>
  );
}

export default function CompletedRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const printRef = useRef();

  const loadRequests = () => {
    setLoading(true);
    const params = { status: 'completed' };
    if (search) params.search = search;
    api.getRequests(params)
      .then(setRequests)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadRequests(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    loadRequests();
  };

  const generateReportHTML = (req) => {
    const steps = req.steps || [];
    const legNumbers = [...new Set(steps.map(s => s.leg || 1))].sort((a, b) => a - b);
    const stepsHTML = legNumbers.map(leg => {
      const legSteps = steps.filter(s => (s.leg || 1) === leg);
      const legLabel = legNumbers.length > 1 ? `<h3 style="font-size:13px;margin:16px 0 6px;color:#374151;">LEG ${leg}</h3>` : '';
      const rows = legSteps.map(s => {
        const statusColor = s.status === 'completed' ? '#047857' : s.status === 'in_progress' ? '#1d4ed8' : '#64748b';
        const statusBg = s.status === 'completed' ? '#d1fae5' : s.status === 'in_progress' ? '#dbeafe' : '#f1f5f9';
        return `<tr>
          <td>${s.step_number}</td>
          <td>${s.step_name}</td>
          <td><span style="padding:2px 8px;border-radius:999px;background:${statusBg};color:${statusColor};font-size:11px;font-weight:500;">${s.status?.replace('_',' ')}</span></td>
          <td>${s.machine_no || '—'}</td>
          <td>${s.operator_id || '—'}</td>
          <td>${s.qty_in != null ? s.qty_in : '—'}</td>
          <td>${s.qty_out != null ? s.qty_out : '—'}</td>
          <td>${s.completed_at ? new Date(s.completed_at).toLocaleDateString() : '—'}</td>
          <td>${s.notes || '—'}</td>
        </tr>`;
      }).join('');
      return legLabel + `<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:12px;">
        <thead><tr>
          <th>#</th><th>Step</th><th>Status</th><th>Machine</th><th>Operator</th><th>Qty In</th><th>Qty Out</th><th>Completed</th><th>Notes</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    }).join('');

    const fields = [
      ['Request Number', req.request_number], ['Classification', req.classification],
      ['Originator', req.originator], ['Plant', req.plant],
      ['Device Name', req.device_name], ['Lot No.', req.lot_no],
      ['Customer', req.customer], ['Package Info', req.pkg_info],
      ['Automotive', req.automotive ? 'Yes' : 'No'], ['Date LTC', req.date_ltc],
      ['Product Hierarchy', req.product_hierarchy], ['PDL', req.pdl],
      ['Body Size X', req.body_size_x], ['Body Size Y', req.body_size_y],
      ['Package Thickness', req.package_thickness], ['Ball Pitch', req.ball_pitch],
      ['Ball Count', req.ball_count], ['Lead Pitch', req.lead_pitch],
      ['Lead Count', req.lead_count], ['Total SS', req.total_ss],
      ['Deadline', req.deadline], ['Created By', req.created_by_username],
      ['Created At', req.created_at ? new Date(req.created_at).toLocaleString() : '—'],
    ].filter(([, v]) => v != null && v !== '' && v !== false);

    const infoRows = fields.map(([label, val]) =>
      `<tr><td style="font-weight:600;color:#374151;width:38%;padding:5px 8px;">${label}</td><td style="padding:5px 8px;">${val}</td></tr>`
    ).join('');

    const purposeSection = req.purpose ? `<h3 style="font-size:13px;margin:16px 0 4px;color:#374151;">Purpose</h3><p style="font-size:12px;color:#475569;margin:0;white-space:pre-wrap;">${req.purpose}</p>` : '';
    const instrSection = req.engineer_special_instruction ? `<h3 style="font-size:13px;margin:12px 0 4px;color:#374151;">Engineer Special Instruction</h3><p style="font-size:12px;color:#475569;margin:0;white-space:pre-wrap;">${req.engineer_special_instruction}</p>` : '';

    return `
      <html><head><title>Report – ${req.request_number}</title>
      <style>
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:28px;color:#1e293b;}
        h1{font-size:20px;margin-bottom:2px;} h2{font-size:15px;margin:20px 0 8px;border-bottom:2px solid #e2e8f0;padding-bottom:4px;}
        .subtitle{font-size:12px;color:#64748b;margin-bottom:20px;}
        .badge{display:inline-block;padding:3px 10px;border-radius:999px;background:#d1fae5;color:#047857;font-size:12px;font-weight:600;}
        .info-table{width:100%;border-collapse:collapse;font-size:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;}
        .info-table tr:not(:last-child){border-bottom:1px solid #e2e8f0;}
        table th{background:#f1f5f9;text-align:left;padding:7px 10px;border-bottom:2px solid #e2e8f0;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:#475569;font-size:11px;}
        table td{padding:7px 10px;border-bottom:1px solid #e2e8f0;}
        tr:nth-child(even) td{background:#f8fafc;}
        .footer{margin-top:28px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px;}
        @media print{body{padding:0;} button{display:none;}}
      </style></head><body>
        <h1>RELDMS Report</h1>
        <p class="subtitle">Generated on ${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})} &mdash; <span class="badge">Completed</span></p>
        <h2>General Information</h2>
        <table class="info-table"><tbody>${infoRows}</tbody></table>
        ${purposeSection}${instrSection}
        <h2>Process Steps</h2>
        ${stepsHTML}
        <div class="footer">RELDMS &mdash; Amkor Technology &mdash; ${req.request_number}</div>
      </body></html>`;
  };

  const handlePrintSingle = (req, e) => {
    e.preventDefault();
    e.stopPropagation();
    const win = window.open('', '_blank');
    win.document.write(generateReportHTML(req));
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 300);
  };

  const handleDownloadSingle = async (req, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const blob = await api.downloadRequestReport(req.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ReliabilityReport_${req.request_number}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Download failed: ' + err.message);
    }
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    const win = window.open('', '_blank');
    win.document.write(`
      <html>
        <head>
          <title>Completed RELDMS Records</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #1e293b; }
            h1 { font-size: 20px; margin-bottom: 4px; }
            .subtitle { font-size: 12px; color: #64748b; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background: #f1f5f9; text-align: left; padding: 8px 12px; border-bottom: 2px solid #e2e8f0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; }
            td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
            tr:nth-child(even) { background: #f8fafc; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #d1fae5; color: #047857; font-size: 11px; font-weight: 500; }
            .footer { margin-top: 24px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>Completed RELDMS Records</h1>
          <p class="subtitle">Printed on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} &bull; Total: ${requests.length} request(s)</p>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Request Number</th>
                <th>Device Name</th>
                <th>Customer</th>
                <th>Lot No.</th>
                <th>Classification</th>
                <th>Deadline</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${requests.map((req, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${req.request_number || '—'}</td>
                  <td>${req.device_name || '—'}</td>
                  <td>${req.customer || '—'}</td>
                  <td>${req.lot_no || '—'}</td>
                  <td>${req.classification || '—'}</td>
                  <td>${req.deadline || '—'}</td>
                  <td><span class="badge">Completed</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">RELDMS &mdash; Amkor Technology</div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 300);
  };

  return (
    <div className="space-y-6 stagger-children">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-5 shadow-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-heading font-bold text-slate-900 dark:text-white tracking-tight">Completed Requests</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                All completed RELDMS requests.
                {!loading && <span className="ml-1 font-semibold text-emerald-600 dark:text-emerald-400">{requests.length} total</span>}
              </p>
            </div>
          </div>
          <button
            onClick={handlePrint}
            disabled={requests.length === 0}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg px-3.5 py-2 font-medium text-sm shadow-sm hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Printer className="w-4 h-4" /> Print Report
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by REL#, device, customer, lot..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-500
                focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm transition-all"
            />
          </div>
          <button type="submit"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors">
            <Search className="w-4 h-4" /> Search
          </button>
        </form>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-20">
          <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 text-lg">No completed requests found.</p>
          <p className="text-slate-400 text-sm mt-1">Requests will appear here once all process steps are completed.</p>
        </div>
      ) : (
        <div ref={printRef} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden">
          {requests.map(req => (
            <Link
              key={req.id}
              to={`/requests/${req.id}`}
              className="flex items-center gap-4 px-6 py-4 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 hover:shadow-[inset_3px_0_0_#10b981] dark:hover:shadow-[inset_3px_0_0_#34d399] transition-all group"
            >
              <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
              </div>
                <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-mono text-base font-bold text-blue-700 dark:text-blue-400 tracking-tight">{req.request_number}</span>
                  <StatusBadge status={req.status} />
                  {req.automotive && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">Auto</span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
                  {req.device_name && <span>Device: {req.device_name}</span>}
                  {req.customer && <span>Customer: {req.customer}</span>}
                  {req.lot_no && <span>Lot: {req.lot_no}</span>}
                  {req.classification && <span>Class: {req.classification}</span>}
                  <span>by {req.created_by_username}</span>
                </div>
                {req.note && (
                  <div className="mt-1.5 flex items-start gap-1.5 px-2 py-1.5 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 max-w-lg">
                    <MessageSquarePlus className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-amber-800 dark:text-amber-300 line-clamp-2 leading-snug">{req.note}</span>
                  </div>
                )}
                <div className="mt-2 w-48">
                  <ProcessTimeline steps={req.steps} compact />
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {req.deadline && (
                  <span className="text-xs text-slate-400 dark:text-slate-500">Deadline: {req.deadline}</span>
                )}
                <button
                  onClick={(e) => handlePrintSingle(req, e)}
                  title="Print Report"
                  className="p-1.5 rounded hover:bg-slate-100 text-slate-300 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => handleDownloadSingle(req, e)}
                  title="Download Report"
                  className="p-1.5 rounded hover:bg-blue-50 text-slate-300 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Download className="w-4 h-4" />
                </button>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
