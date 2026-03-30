import { useState } from 'react';
import { Save } from 'lucide-react';
import BoxLocationSelector from './BoxLocationSelector';
import {
  parseRetentionDetails,
  serializeRetentionDetails,
  SAMPLE_CARRIERS,
} from '../constants/retentionConstants';

function RetentionSubBox({ title, note, data, onChange, boxLocations, onAddBoxLocation, fields, disabled = false }) {
  const handleFieldChange = (field, value) => { onChange({ ...data, [field]: value }); };

  return (
    <div className="border border-slate-200 dark:border-slate-600 rounded-lg p-4 bg-slate-50 dark:bg-slate-800/50">
      <div className="mb-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">{title}</h4>
        {note && <p className="text-xs text-slate-500 dark:text-slate-400 italic">{note}</p>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.map((field) => (
          <div key={field.key} className={field.span ? `sm:col-span-${field.span}` : ''}>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{field.label}</label>
            {field.type === 'date' ? (
              <input type="date" value={data[field.key] || ''} onChange={(e) => handleFieldChange(field.key, e.target.value)} disabled={disabled}
                className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 disabled:opacity-50" />
            ) : field.type === 'select' ? (
              <select value={data[field.key] || ''} onChange={(e) => handleFieldChange(field.key, e.target.value)} disabled={disabled}
                className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 disabled:opacity-50">
                <option value="">{field.placeholder || 'Select…'}</option>
                {(field.options || []).map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
              </select>
            ) : field.type === 'box-location' ? (
              <BoxLocationSelector value={data[field.key] || ''} onChange={(val) => handleFieldChange(field.key, val)}
                options={boxLocations} onAddCustom={onAddBoxLocation} placeholder={field.placeholder || 'Select or enter…'} disabled={disabled} />
            ) : field.type === 'number' ? (
              <input type="number" min="0" value={data[field.key] || ''} onChange={(e) => handleFieldChange(field.key, e.target.value)} disabled={disabled}
                className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 disabled:opacity-50" />
            ) : field.type === 'textarea' ? (
              <textarea value={data[field.key] || ''} onChange={(e) => handleFieldChange(field.key, e.target.value)} disabled={disabled} rows="2"
                className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 disabled:opacity-50 resize-none" />
            ) : (
              <input type="text" value={data[field.key] || ''} onChange={(e) => handleFieldChange(field.key, e.target.value)} disabled={disabled} placeholder={field.placeholder}
                className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 disabled:opacity-50" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function EnhancedRetentionDetails({ request, isEditing, setIsEditing, onSave, disabled = false }) {
  const [retentionData, setRetentionData] = useState(() => parseRetentionDetails(request.retention_details));
  const [isSaving, setIsSaving] = useState(false);

  const handleAddBoxLocation = (newLocation) => {
    setRetentionData((prev) => ({ ...prev, boxLocations: [...new Set([...prev.boxLocations, newLocation])] }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const serialized = serializeRetentionDetails(retentionData);
      await onSave(serialized);
    } finally { setIsSaving(false); }
  };

  const handleCancel = () => {
    setRetentionData(parseRetentionDetails(request.retention_details));
    setIsEditing(false);
  };

  if (!isEditing) return null;

  const reliabilityFields = [
    { key: 'dateRetent', label: 'Date Retent', type: 'date' },
    { key: 'boxLocation', label: 'Box Location', type: 'box-location' },
    { key: 'quantity', label: 'Quantity', type: 'number' },
    { key: 'legNum', label: 'Leg #', type: 'text' },
    { key: 'retentBy', label: 'Retent by', type: 'text' },
    { key: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
  ];
  const excessFields = [
    { key: 'dateRetent', label: 'Date Retent', type: 'date' },
    { key: 'boxLocation', label: 'Box Location', type: 'box-location' },
    { key: 'quantity', label: 'Quantity', type: 'number' },
    { key: 'retentBy', label: 'Retent by', type: 'text' },
    { key: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
  ];
  const tanyagFields = [
    { key: 'dateRetent', label: 'Date Retent', type: 'date' },
    { key: 'sampleCarrier', label: 'Sample Carrier', type: 'select', options: SAMPLE_CARRIERS },
    { key: 'quantity', label: 'Quantity', type: 'number' },
    { key: 'retentBy', label: 'Retent by', type: 'text' },
    { key: 'dateCheckedAtRetention', label: 'Date Checked at Retention', type: 'date' },
    { key: 'tanyagRetentionBoxNum', label: 'Tanyag Retention Box #', type: 'text' },
    { key: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
  ];

  return (
    <div className="space-y-4">
      <RetentionSubBox title="A. Reliability Tested Units"
        data={retentionData.retentionData.reliabilityTested}
        onChange={(data) => setRetentionData((prev) => ({ ...prev, retentionData: { ...prev.retentionData, reliabilityTested: data } }))}
        boxLocations={retentionData.boxLocations} onAddBoxLocation={handleAddBoxLocation} fields={reliabilityFields} disabled={disabled} />

      <RetentionSubBox title="B. Excess Units" note="N/A if no excess"
        data={retentionData.retentionData.excessUnits}
        onChange={(data) => setRetentionData((prev) => ({ ...prev, retentionData: { ...prev.retentionData, excessUnits: data } }))}
        boxLocations={retentionData.boxLocations} onAddBoxLocation={handleAddBoxLocation} fields={excessFields} disabled={disabled} />

      <RetentionSubBox title="C. Sent to Tanyag Units"
        data={retentionData.retentionData.sentToTanyag}
        onChange={(data) => setRetentionData((prev) => ({ ...prev, retentionData: { ...prev.retentionData, sentToTanyag: data } }))}
        boxLocations={retentionData.boxLocations} onAddBoxLocation={handleAddBoxLocation} fields={tanyagFields} disabled={disabled} />

      <div className="flex items-center gap-2 sticky bottom-0 bg-white dark:bg-slate-900 pt-3">
        <button onClick={handleSave} disabled={isSaving || disabled}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors">
          <Save className="w-3.5 h-3.5" /> {isSaving ? 'Saving…' : 'Save Retention Details'}
        </button>
        <button onClick={handleCancel} disabled={isSaving || disabled}
          className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}
