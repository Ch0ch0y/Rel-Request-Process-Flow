import { useEffect, useState } from 'react';
import api from '../api';
import { Loader2, Save } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState({ site_name: '', maintenance_mode: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/api/settings').then(r => {
      setSettings({
        site_name: r.data.site_name || 'CA Website',
        maintenance_mode: r.data.maintenance_mode === 'true' || r.data.maintenance_mode === true,
      });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/settings', {
        site_name: settings.site_name,
        maintenance_mode: String(settings.maintenance_mode),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      alert(e.response?.data?.detail || 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-violet-500 animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-lg stagger-children">
      <h1 className="text-xl font-bold text-slate-900 dark:text-white font-heading">Settings</h1>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Site Name</label>
          <input value={settings.site_name}
            onChange={e => setSettings(p => ({ ...p, site_name: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20" />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Displayed in the browser tab and header.</p>
        </div>

        <div className="flex items-center justify-between py-1">
          <div>
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Maintenance Mode</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Disables new requests and shows a maintenance notice.</div>
          </div>
          <button onClick={() => setSettings(p => ({ ...p, maintenance_mode: !p.maintenance_mode }))}
            className={`relative w-11 h-6 rounded-full transition-colors ${settings.maintenance_mode ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${settings.maintenance_mode ? 'translate-x-5' : ''}`} />
          </button>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="flex items-center gap-2 px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium disabled:opacity-50 shadow-lg shadow-violet-600/20">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saved ? 'Saved!' : 'Save Settings'}
      </button>
    </div>
  );
}
