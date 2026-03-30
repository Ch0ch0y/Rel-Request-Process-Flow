import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, ChevronRight, Loader2, X, FileSpreadsheet } from 'lucide-react';
import ImportCAExcelModal from '../components/ImportCAExcelModal';

const STATUS_OPTS = ['all', 'pending', 'in_progress', 'completed', 'discontinued'];
const STATUS_STYLE = {
  pending:      'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  in_progress:  'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800',
  completed:    'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  discontinued: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
};
const STATUS_LABEL = {
  pending: 'Pending', in_progress: 'In Progress',
  completed: 'Completed', discontinued: 'Discontinued',
};
const PRIORITY_STYLE = {
  Critical: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  High:     'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  Normal:   'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600',
  Low:      'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800',
};

const EMPTY_FORM = {
  // legacy / system
  title: '', sample_description: '', lot_number: '', device: '',
  department: '', submitter_name: '', priority: 'Normal', note: '',
  // General Information
  classification: '', originator: '', plant: '', device_name: '', lot_no: '',
  customer: '', pkg_info: '', automotive: '', reference_project: '',
  product_hierarchy: '', pdl: '', body_size_x: '', body_size_y: '',
  package_thickness: '', ball_pitch: '', ball_count: '', lead_pitch: '',
  lead_count: '', total_ss: '', purpose: '',
  // Material Information
  bcb_material: '', bump_height: '', bump_material: '', bump_pitch: '',
  bump_size: '', bumping_house: '', chip_attach_flux_cleaning_method: '',
  chip_attach_flux: '', die_attach_material: '', die_coat_after_wb: '',
  die_pad_config: '', die_pad_metal: '', die_pad_pitch: '', die_passivation: '',
  die_size: '', die_thick: '', down_bond: '', emc_encap_material: '',
  heat_dissipation_matl: '', lf_ag_option: '', lf_etch_stamp: '',
  lf_inner_lead_pitch: '', lf_sub_material: '', lf_sub_pad_size: '',
  lf_sub_supplier: '', lf_sub_thickness: '', lid_attach_epoxy: '', line_width: '',
  mfg_site: '', masking_material: '', others1: '', others2: '', others3: '',
  others4: '', others5: '', passive_component: '', pcb_finish: '',
  plating_option: '', rel_site: '', solder_ball_attach_paste: '',
  solder_ball_material: '', solder_ball_size: '', solder_mask_material: '',
  solder_paste_material: '', sub_layer: '', sub_pad_design: '',
  sub_pad_opening_size: '', sub_surface_treatment: '', ubm_material: '',
  ubm_opening_size: '', underfill_material: '', wafer_type: '',
  wire_length_max: '', wire_material: '', wire_size: '', wire_supplier: '',
  wire_type: '',
};

function Field({ label, value, onChange, textarea, rows = 2 }) {
  const cls = 'w-full px-2.5 py-1.5 rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30';
  return (
    <div>
      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">{label}</label>
      {textarea
        ? <textarea rows={rows} value={value} onChange={onChange} className={cls + ' resize-none'} />
        : <input value={value} onChange={onChange} className={cls} />}
    </div>
  );
}

export default function Requests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [formTab, setFormTab] = useState('general');
  const [searchParams] = useSearchParams();
  const stepFilter = searchParams.get('step') || '';
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ ...EMPTY_FORM, submitter_name: user?.username || '' });

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const fetchAll = () => {
    setLoading(true);
    api.get('/api/requests').then(r => setRequests(r.data)).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { fetchAll(); }, []);

  const filtered = requests.filter(r => {
    const q = search.toLowerCase();
    const matchQ = !q || r.ca_number?.toLowerCase().includes(q) || r.title?.toLowerCase().includes(q) || r.sample_description?.toLowerCase().includes(q) || r.lot_number?.toLowerCase().includes(q);
    const matchS = statusFilter === 'all' || r.status === statusFilter;
    const matchStep = !stepFilter || r.current_step?.toLowerCase().includes(stepFilter.toLowerCase());
    return matchQ && matchS && matchStep;
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      // sync legacy fields from general info if not separately set
      const payload = {
        ...form,
        title: form.title || form.device_name || form.device || '(Untitled)',
        lot_number: form.lot_number || form.lot_no,
        device: form.device || form.device_name,
      };
      const res = await api.post('/api/requests', payload);
      setShowForm(false);
      setForm({ ...EMPTY_FORM, submitter_name: user?.username || '' });
      setFormTab('general');
      navigate(`/requests/${res.data.id}`);
    } catch (err) {
      alert(err.response?.data?.detail || 'Error creating request');
    }
  };

  return (
    <div className="space-y-5 stagger-children">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white font-heading">All CA Requests</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium shadow-lg shadow-emerald-600/25 transition-colors">
            <FileSpreadsheet className="w-4 h-4" /> Import Excel
          </button>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium shadow-lg shadow-violet-600/25 transition-colors">
            <Plus className="w-4 h-4" /> New Request
          </button>
        </div>
      </div>

      {stepFilter && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-50 dark:bg-violet-600/10 border border-violet-200 dark:border-violet-600/30 text-sm text-violet-700 dark:text-violet-300">
          Filtering by step: <span className="font-semibold">{stepFilter}</span>
          <button onClick={() => navigate('/requests')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by number, title, sample, lot…"
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_OPTS.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${statusFilter === s ? 'bg-violet-600 border-violet-600 text-white' : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-slate-600'}`}>
              {s === 'all' ? 'All' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-violet-500 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500 dark:text-slate-400 text-sm">No requests found</div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">CA #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Device / Sample</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">Lot No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">Originator</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">Created By</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">Current Step</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.map(r => (
                  <tr key={r.id} onClick={() => navigate(`/requests/${r.id}`)}
                    className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-mono text-violet-600 dark:text-violet-400 font-medium whitespace-nowrap">{r.ca_number}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-white truncate max-w-[180px]">{r.device_name || r.device || r.title}</div>
                      {r.sample_description && <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[180px]">{r.sample_description}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden md:table-cell">{r.lot_no || r.lot_number || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden md:table-cell">{r.originator || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden lg:table-cell">{r.submitter_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs hidden lg:table-cell">{r.current_step || '—'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className={`px-2 py-0.5 rounded-full text-xs border ${PRIORITY_STYLE[r.priority] || 'text-slate-400 border-slate-700'}`}>{r.priority}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_STYLE[r.status] || 'text-slate-400 border-slate-700'}`}>
                        {STATUS_LABEL[r.status] || r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 dark:text-slate-600"><ChevronRight className="w-4 h-4" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Import Excel Modal ── */}
      {showImport && (
        <ImportCAExcelModal
          onClose={() => setShowImport(false)}
          onImported={() => fetchAll()}
          currentUser={user?.username || ''}
        />
      )}

      {/* ── Create Request Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-4xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col max-h-[95vh]">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">New Construction Analysis Request</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Fill in the information below to submit a CA request</p>
              </div>
              <button onClick={() => { setShowForm(false); setFormTab('general'); }} className="text-slate-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 pt-3 shrink-0">
              {[['general', 'General Information'], ['material', 'Material Information']].map(([tab, label]) => (
                <button key={tab} type="button" onClick={() => setFormTab(tab)}
                  className={`px-4 py-2 rounded-t-lg text-sm font-medium border-b-2 transition-colors ${formTab === tab ? 'border-violet-500 text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
                  {label}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleCreate} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto flex-1 px-6 py-4">

                {/* ── GENERAL INFORMATION ── */}
                {formTab === 'general' && (
                  <div className="space-y-4">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-200 dark:border-slate-700">General Information</div>

                    {/* Row 1: Request# / Reference Project */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                      <Field label="Request Number" value={form.title} onChange={set('title')} />
                      <Field label="Reference Project" value={form.reference_project} onChange={set('reference_project')} />

                      <Field label="Classification" value={form.classification} onChange={set('classification')} />
                      <Field label="Product Hierarchy" value={form.product_hierarchy} onChange={set('product_hierarchy')} />

                      <Field label="Originator" value={form.originator} onChange={set('originator')} />
                      <Field label="PDL" value={form.pdl} onChange={set('pdl')} />

                      <Field label="Plant" value={form.plant} onChange={set('plant')} />
                      <Field label="Body Size X (mm)" value={form.body_size_x} onChange={set('body_size_x')} />

                      <Field label="Device Name" value={form.device_name} onChange={set('device_name')} />
                      <Field label="Body Size Y (mm)" value={form.body_size_y} onChange={set('body_size_y')} />

                      <Field label="Lot No" value={form.lot_no} onChange={set('lot_no')} />
                      <Field label="Package Thickness (mm)" value={form.package_thickness} onChange={set('package_thickness')} />

                      <Field label="Customer" value={form.customer} onChange={set('customer')} />
                      <Field label="Ball Pitch (mm)" value={form.ball_pitch} onChange={set('ball_pitch')} />

                      <Field label="PKG Info" value={form.pkg_info} onChange={set('pkg_info')} />
                      <Field label="Ball Count" value={form.ball_count} onChange={set('ball_count')} />

                      <Field label="Automotive" value={form.automotive} onChange={set('automotive')} />
                      <Field label="Lead Pitch (mm)" value={form.lead_pitch} onChange={set('lead_pitch')} />

                      <Field label="Date" value={form.sample_description} onChange={set('sample_description')} />
                      <Field label="Lead Count" value={form.lead_count} onChange={set('lead_count')} />

                      <div />
                      <Field label="Total S/S" value={form.total_ss} onChange={set('total_ss')} />
                    </div>

                    {/* Purpose */}
                    <Field label="Purpose" value={form.purpose} onChange={set('purpose')} textarea rows={4} />

                    {/* Priority */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">Priority</label>
                      <select value={form.priority} onChange={set('priority')}
                        className="w-full px-2.5 py-1.5 rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30">
                        {['Normal', 'Low', 'High', 'Critical'].map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {/* ── MATERIAL INFORMATION ── */}
                {formTab === 'material' && (
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-200 dark:border-slate-700">Material Information</div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                      <Field label="BCB Material" value={form.bcb_material} onChange={set('bcb_material')} />
                      <Field label="Mfg Site" value={form.mfg_site} onChange={set('mfg_site')} />

                      <Field label="Bump Height" value={form.bump_height} onChange={set('bump_height')} />
                      <Field label="Masking Material" value={form.masking_material} onChange={set('masking_material')} />

                      <Field label="Bump Material" value={form.bump_material} onChange={set('bump_material')} />
                      <Field label="Others1" value={form.others1} onChange={set('others1')} />

                      <Field label="Bump Pitch" value={form.bump_pitch} onChange={set('bump_pitch')} />
                      <Field label="Others2" value={form.others2} onChange={set('others2')} />

                      <Field label="Bump Size" value={form.bump_size} onChange={set('bump_size')} />
                      <Field label="Others3" value={form.others3} onChange={set('others3')} />

                      <Field label="Bumping House" value={form.bumping_house} onChange={set('bumping_house')} />
                      <Field label="Others4" value={form.others4} onChange={set('others4')} />

                      <Field label="Chip Attach Flux Cleaning Method" value={form.chip_attach_flux_cleaning_method} onChange={set('chip_attach_flux_cleaning_method')} />
                      <Field label="Others5" value={form.others5} onChange={set('others5')} />

                      <Field label="Chip Attach Flux" value={form.chip_attach_flux} onChange={set('chip_attach_flux')} />
                      <Field label="Passive Component" value={form.passive_component} onChange={set('passive_component')} />

                      <Field label="Die Attach Material" value={form.die_attach_material} onChange={set('die_attach_material')} />
                      <Field label="PCB Finish" value={form.pcb_finish} onChange={set('pcb_finish')} />

                      <Field label="Die coat after W/B" value={form.die_coat_after_wb} onChange={set('die_coat_after_wb')} />
                      <Field label="Plating Option" value={form.plating_option} onChange={set('plating_option')} />

                      <Field label="Die Pad Config" value={form.die_pad_config} onChange={set('die_pad_config')} />
                      <Field label="Rel Site" value={form.rel_site} onChange={set('rel_site')} />

                      <Field label="Die Pad Metal" value={form.die_pad_metal} onChange={set('die_pad_metal')} />
                      <Field label="Solder Ball Attach Paste" value={form.solder_ball_attach_paste} onChange={set('solder_ball_attach_paste')} />

                      <Field label="Die Pad Pitch (μm)" value={form.die_pad_pitch} onChange={set('die_pad_pitch')} />
                      <Field label="Solder Ball Material" value={form.solder_ball_material} onChange={set('solder_ball_material')} />

                      <Field label="Die Passivation" value={form.die_passivation} onChange={set('die_passivation')} />
                      <Field label="Solder Ball Size (mm)" value={form.solder_ball_size} onChange={set('solder_ball_size')} />

                      <Field label="Die Size (mm)" value={form.die_size} onChange={set('die_size')} />
                      <Field label="Solder Mask Material" value={form.solder_mask_material} onChange={set('solder_mask_material')} />

                      <Field label="Die Thick (μm)" value={form.die_thick} onChange={set('die_thick')} />
                      <Field label="Solder Paste Material" value={form.solder_paste_material} onChange={set('solder_paste_material')} />

                      <Field label="Down Bond" value={form.down_bond} onChange={set('down_bond')} />
                      <Field label="Sub Layer" value={form.sub_layer} onChange={set('sub_layer')} />

                      <Field label="EMC/Encap Material" value={form.emc_encap_material} onChange={set('emc_encap_material')} />
                      <Field label="Sub Pad Design" value={form.sub_pad_design} onChange={set('sub_pad_design')} />

                      <Field label="Heat Dissipation Mat'l" value={form.heat_dissipation_matl} onChange={set('heat_dissipation_matl')} />
                      <Field label="Sub Pad Opening Size" value={form.sub_pad_opening_size} onChange={set('sub_pad_opening_size')} />

                      <Field label="LF Ag Option" value={form.lf_ag_option} onChange={set('lf_ag_option')} />
                      <Field label="Sub Surface Treatment" value={form.sub_surface_treatment} onChange={set('sub_surface_treatment')} />

                      <Field label="LF Etch/Stamp" value={form.lf_etch_stamp} onChange={set('lf_etch_stamp')} />
                      <Field label="UBM Material" value={form.ubm_material} onChange={set('ubm_material')} />

                      <Field label="LF Inner Lead Pitch (μm)" value={form.lf_inner_lead_pitch} onChange={set('lf_inner_lead_pitch')} />
                      <Field label="UBM Opening Size (μm)" value={form.ubm_opening_size} onChange={set('ubm_opening_size')} />

                      <Field label="LF/Sub Material" value={form.lf_sub_material} onChange={set('lf_sub_material')} />
                      <Field label="Underfill Material" value={form.underfill_material} onChange={set('underfill_material')} />

                      <Field label="LF/Sub Pad Size (μm)" value={form.lf_sub_pad_size} onChange={set('lf_sub_pad_size')} />
                      <Field label="Wafer Type" value={form.wafer_type} onChange={set('wafer_type')} />

                      <Field label="LF/Sub Supplier" value={form.lf_sub_supplier} onChange={set('lf_sub_supplier')} />
                      <Field label="Wire Length Max (mm)" value={form.wire_length_max} onChange={set('wire_length_max')} />

                      <Field label="LF/Sub Thickness (μm)" value={form.lf_sub_thickness} onChange={set('lf_sub_thickness')} />
                      <Field label="Wire Material" value={form.wire_material} onChange={set('wire_material')} />

                      <Field label="Lid Attach Epoxy" value={form.lid_attach_epoxy} onChange={set('lid_attach_epoxy')} />
                      <Field label="Wire Size (μm)" value={form.wire_size} onChange={set('wire_size')} />

                      <Field label="Line Width" value={form.line_width} onChange={set('line_width')} />
                      <Field label="Wire Supplier" value={form.wire_supplier} onChange={set('wire_supplier')} />

                      <div />
                      <Field label="Wire Type" value={form.wire_type} onChange={set('wire_type')} />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-900/60">
                <div className="flex gap-2">
                  {formTab === 'material' && (
                    <button type="button" onClick={() => setFormTab('general')}
                      className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      ← General Info
                    </button>
                  )}
                  {formTab === 'general' && (
                    <button type="button" onClick={() => setFormTab('material')}
                      className="px-4 py-2 rounded-lg border border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 text-sm hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors">
                      Material Info →
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setShowForm(false); setFormTab('general'); }}
                    className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors">
                    Cancel
                  </button>
                  <button type="submit"
                    className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium">
                    Submit Request
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
