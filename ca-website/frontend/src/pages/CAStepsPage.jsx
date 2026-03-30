import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { ArrowLeft, Loader2, Printer, CheckCircle2 } from 'lucide-react';

export default function CAStepsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [saved, setSaved] = useState(null);
  const [edits, setEdits] = useState({});
  const [activeLeg, setActiveLeg] = useState(null);
  const [sharedTimeIn, setSharedTimeIn] = useState({});
  const [sharedTimeOut, setSharedTimeOut] = useState({});
  const [sharedTechnician, setSharedTechnician] = useState({});

  useEffect(() => {
    Promise.all([
      api.get(`/api/requests/${id}`),
      api.get(`/api/requests/${id}/checklist`),
    ])
      .then(([rRes, cRes]) => {
        setRequest(rRes.data);
        setChecklist(cRes.data);
        // Set first available leg as active
        const firstLeg = cRes.data[0]?.leg_name || '';
        setActiveLeg(firstLeg);
      })
      .catch(() => navigate('/requests'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleEdit = (itemId, field, value) => {
    setEdits(p => ({ ...p, [itemId]: { ...p[itemId], [field]: value } }));
  };

  const handleSave = async (item) => {
    const changes = edits[item.id];
    if (!changes || Object.keys(changes).length === 0) return;
    setSaving(item.id);
    try {
      await api.patch(`/api/checklist/${item.id}`, changes);
      setChecklist(prev => prev.map(i => i.id === item.id ? { ...i, ...changes } : i));
      setEdits(p => { const n = { ...p }; delete n[item.id]; return n; });
      setSaved(item.id);
      setTimeout(() => setSaved(null), 1500);
    } catch (e) {
      alert('Save failed: ' + (e.response?.data?.detail || e.message));
    } finally {
      setSaving(null);
    }
  };

  const val = (item, field) => edits[item.id]?.[field] ?? item[field] ?? '';
  const isDirty = (itemId) => edits[itemId] && Object.keys(edits[itemId]).length > 0;

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
    </div>
  );
  if (!request) return null;

  // Compute unique legs in order
  const legs = [];
  const legSeen = new Set();
  for (const item of checklist) {
    const key = item.leg_name || '';
    if (!legSeen.has(key)) { legSeen.add(key); legs.push({ name: key, title: item.leg_title || '' }); }
  }
  const hasLegs = legs.length > 1 || (legs.length === 1 && legs[0].name !== '');
  const currentLegTitle = legs.find(l => l.name === activeLeg)?.title || '';

  // Items for the active leg (or all items if no legs)
  const activeItems = hasLegs ? checklist.filter(i => (i.leg_name || '') === activeLeg) : checklist;

  const getSharedTimeIn = () => {
    if (sharedTimeIn[activeLeg] !== undefined) return sharedTimeIn[activeLeg];
    return activeItems[0]?.time_in || '';
  };

  const handleSharedTimeInBlur = async () => {
    const value = sharedTimeIn[activeLeg] !== undefined ? sharedTimeIn[activeLeg] : (activeItems[0]?.time_in || '');
    setSaving('shared-in');
    try {
      await Promise.all(activeItems.map(item =>
        api.patch(`/api/checklist/${item.id}`, { time_in: value })
      ));
      setChecklist(prev => prev.map(i =>
        activeItems.some(ai => ai.id === i.id) ? { ...i, time_in: value } : i
      ));
      setSaved('shared-in');
      setTimeout(() => setSaved(null), 1500);
    } catch (e) {
      alert('Save failed: ' + (e.response?.data?.detail || e.message));
    } finally {
      setSaving(null);
    }
  };

  const getSharedTimeOut = () => {
    if (sharedTimeOut[activeLeg] !== undefined) return sharedTimeOut[activeLeg];
    return activeItems[0]?.time_out || '';
  };

  const handleSharedTimeOutBlur = async () => {
    const value = sharedTimeOut[activeLeg] !== undefined ? sharedTimeOut[activeLeg] : (activeItems[0]?.time_out || '');
    setSaving('shared-out');
    try {
      await Promise.all(activeItems.map(item =>
        api.patch(`/api/checklist/${item.id}`, { time_out: value })
      ));
      setChecklist(prev => prev.map(i =>
        activeItems.some(ai => ai.id === i.id) ? { ...i, time_out: value } : i
      ));
      setSaved('shared-out');
      setTimeout(() => setSaved(null), 1500);
    } catch (e) {
      alert('Save failed: ' + (e.response?.data?.detail || e.message));
    } finally {
      setSaving(null);
    }
  };

  const getSharedTechnician = () => {
    if (sharedTechnician[activeLeg] !== undefined) return sharedTechnician[activeLeg];
    return activeItems[0]?.technician || '';
  };

  const handleSharedTechnicianBlur = async () => {
    const value = sharedTechnician[activeLeg] !== undefined ? sharedTechnician[activeLeg] : (activeItems[0]?.technician || '');
    setSaving('shared-tech');
    try {
      await Promise.all(activeItems.map(item =>
        api.patch(`/api/checklist/${item.id}`, { technician: value })
      ));
      setChecklist(prev => prev.map(i =>
        activeItems.some(ai => ai.id === i.id) ? { ...i, technician: value } : i
      ));
      setSaved('shared-tech');
      setTimeout(() => setSaved(null), 1500);
    } catch (e) {
      alert('Save failed: ' + (e.response?.data?.detail || e.message));
    } finally {
      setSaving(null);
    }
  };

  // Group active leg items by step_name (activity)
  const stepGroups = [];
  const stepMap = new Map();
  for (const item of activeItems) {
    if (!stepMap.has(item.step_name)) {
      const group = { step: item.step_name, items: [] };
      stepMap.set(item.step_name, group);
      stepGroups.push(group);
    }
    stepMap.get(item.step_name).items.push(item);
  }

  const EditInput = ({ item, field, placeholder = '', center = false }) => (
    <input
      value={val(item, field)}
      placeholder={placeholder}
      onChange={e => handleEdit(item.id, field, e.target.value)}
      onBlur={() => handleSave(item)}
      className={`w-full bg-transparent text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:bg-slate-700/60 rounded px-1 py-0.5 min-w-0 ${center ? 'text-center' : ''}`}
    />
  );

  // Step row background rotation
  const stepBg = ['bg-slate-900/60', 'bg-slate-800/40'];
  let stepIdx = 0;

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={() => navigate(`/requests/${id}`)}
          className="text-slate-500 hover:text-white transition-colors flex-shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-violet-400 font-semibold text-sm">{request.ca_number}</span>
            <span className="text-slate-600">·</span>
            <span className="text-white font-bold truncate">{request.title}</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">CA Steps — Analysis Checklist</p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-600 text-slate-400 hover:text-white hover:border-slate-400 text-xs transition-colors">
          <Printer className="w-3.5 h-3.5" /> Print
        </button>
      </div>

      {/* Info bar */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2.5 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-xs">
        <div><span className="text-slate-500 mr-1">Leg:</span><span className="text-slate-200">{currentLegTitle || activeLeg || 'TIME ZERO – Leg 1'}</span></div>
        <div><span className="text-slate-500 mr-1">SR No.:</span><span className="text-slate-200">{request.title}</span></div>
        <div><span className="text-slate-500 mr-1">Ref. Project:</span><span className="text-slate-200">{request.reference_project || '—'}</span></div>
        <div><span className="text-slate-500 mr-1">Lot No.:</span><span className="text-slate-200">{request.lot_no || '—'}</span></div>
      </div>

      {/* Leg tabs — shown only when multiple legs exist */}
      {hasLegs && (
        <div className="flex gap-1 overflow-x-auto pb-1 -mb-1">
          {legs.map(leg => (
            <button
              key={leg.name}
              onClick={() => setActiveLeg(leg.name)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                activeLeg === leg.name
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700'
              }`}>
              {leg.name || 'Default'}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-700 shadow-xl print:shadow-none print:border-slate-300">
        <table className="w-full border-collapse text-xs" style={{ minWidth: 900 }}>
          <thead>
            <tr className="bg-slate-700 text-slate-100 text-[11px] uppercase tracking-wide">
              <th className="border border-slate-600 px-3 py-2.5 text-left font-semibold w-[170px]">Activity</th>
              <th className="border border-slate-600 px-3 py-2.5 text-left font-semibold w-[190px]">Check Item</th>
              <th className="border border-slate-600 px-3 py-2.5 text-left font-semibold">Requirements</th>
              <th className="border border-slate-600 px-3 py-2.5 text-center font-semibold w-[155px]">Date / Time In</th>
              <th className="border border-slate-600 px-3 py-2.5 text-center font-semibold w-[155px]">Date / Time Out</th>
              <th className="border border-slate-600 px-3 py-2.5 text-center font-semibold w-[130px]">Technician</th>
              <th className="border border-slate-600 px-3 py-2.5 text-center font-semibold w-[55px]">QTY</th>
              <th className="border border-slate-600 px-3 py-2.5 text-left font-semibold w-[180px]">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {stepGroups.map(({ step, items }, stepGroupIdx) => {
              const bg = stepBg[stepIdx % 2];
              stepIdx++;

              return items.map((item, idx) => {
                const dirty = isDirty(item.id);
                const isSaved = saved === item.id;
                const isSaving = saving === item.id;

                return (
                  <tr key={item.id}
                    className={`${bg} border-b border-slate-700/60 transition-colors ${dirty ? 'ring-1 ring-inset ring-violet-500/30' : ''}`}>

                    {/* Activity — rowspan for all items in this step */}
                    {idx === 0 && (
                      <td rowSpan={items.length}
                        className="border border-slate-600 px-3 py-2 font-semibold text-violet-300 text-[11px] leading-snug align-middle bg-slate-900/50 print:text-slate-800">
                        {step}
                      </td>
                    )}

                    {/* Check Item */}
                    <td className="border border-slate-600 px-3 py-1.5 text-slate-300 italic leading-tight">
                      {item.item_name}
                    </td>

                    {/* Requirements */}
                    <td className="border border-slate-600 px-3 py-1.5 text-slate-400 leading-relaxed">
                      {item.requirements}
                    </td>

                    {/* Time In — single merged cell spanning all rows in this leg */}
                    {stepGroupIdx === 0 && idx === 0 && (
                      <td rowSpan={activeItems.length}
                        className="border border-slate-600 px-2 py-2 align-middle">
                        <div className="flex flex-col items-center gap-1.5">
                          <input
                            type="datetime-local"
                            value={getSharedTimeIn()}
                            onChange={e => setSharedTimeIn(p => ({ ...p, [activeLeg]: e.target.value }))}
                            onBlur={handleSharedTimeInBlur}
                            className="w-full bg-transparent text-[10px] text-violet-300 focus:outline-none focus:bg-slate-700/60 rounded px-1 py-0.5 [color-scheme:dark] text-center"
                          />
                          {saving === 'shared-in' && <Loader2 className="w-3 h-3 text-violet-400 animate-spin" />}
                          {saved === 'shared-in' && saving !== 'shared-in' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                        </div>
                      </td>
                    )}

                    {/* Time Out — single merged cell spanning all rows in this leg */}
                    {stepGroupIdx === 0 && idx === 0 && (
                      <td rowSpan={activeItems.length}
                        className="border border-slate-600 px-2 py-2 align-middle">
                        <div className="flex flex-col items-center gap-1.5">
                          <input
                            type="datetime-local"
                            value={getSharedTimeOut()}
                            onChange={e => setSharedTimeOut(p => ({ ...p, [activeLeg]: e.target.value }))}
                            onBlur={handleSharedTimeOutBlur}
                            className="w-full bg-transparent text-[10px] text-violet-300 focus:outline-none focus:bg-slate-700/60 rounded px-1 py-0.5 [color-scheme:dark] text-center"
                          />
                          {saving === 'shared-out' && <Loader2 className="w-3 h-3 text-violet-400 animate-spin" />}
                          {saved === 'shared-out' && saving !== 'shared-out' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                        </div>
                      </td>
                    )}

                    {/* Technician — single merged cell spanning all rows in this leg */}
                    {stepGroupIdx === 0 && idx === 0 && (
                      <td rowSpan={activeItems.length}
                        className="border border-slate-600 px-2 py-2 align-middle">
                        <div className="flex flex-col items-center gap-1.5">
                          <input
                            type="text"
                            value={getSharedTechnician()}
                            placeholder="Technician"
                            onChange={e => setSharedTechnician(p => ({ ...p, [activeLeg]: e.target.value }))}
                            onBlur={handleSharedTechnicianBlur}
                            className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:bg-slate-700/60 rounded px-1 py-0.5 text-center"
                          />
                          {saving === 'shared-tech' && <Loader2 className="w-3 h-3 text-violet-400 animate-spin" />}
                          {saved === 'shared-tech' && saving !== 'shared-tech' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                        </div>
                      </td>
                    )}

                    {/* QTY */}
                    <td className="border border-slate-600 px-2 py-1 text-center">
                      <input
                        value={val(item, 'qty')}
                        onChange={e => handleEdit(item.id, 'qty', e.target.value)}
                        onBlur={() => handleSave(item)}
                        className="w-full text-center bg-transparent text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:bg-slate-700/60 rounded px-1 py-0.5"
                      />
                    </td>

                    {/* Remarks + save indicator */}
                    <td className="border border-slate-600 px-2 py-1">
                      <div className="flex items-center gap-1">
                        <input
                          value={val(item, 'remarks')}
                          onChange={e => handleEdit(item.id, 'remarks', e.target.value)}
                          onBlur={() => handleSave(item)}
                          className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:bg-slate-700/60 rounded px-1 py-0.5"
                        />
                        {isSaving && <Loader2 className="w-3 h-3 text-violet-400 animate-spin flex-shrink-0" />}
                        {isSaved && !isSaving && <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />}
                      </div>
                    </td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-slate-600 text-center">
        Click any cell to edit · Changes save automatically when you click away
      </p>

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          table { border-color: #ccc !important; }
          th, td { border-color: #ccc !important; color: black !important; background: white !important; }
          th { background: #eee !important; }
          input { border: none; background: transparent !important; color: black !important; }
        }
      `}</style>
    </div>
  );
}
