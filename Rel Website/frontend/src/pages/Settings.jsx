import { useState, useEffect, useRef, useCallback } from 'react';
import developerPhoto from '../assets/developer.jpg';
import api from '../api';
import { Save, Download, Trash2, HardDrive, RefreshCw, BookOpen, User, Cpu, Users2, Plus, PlusCircle, ChevronDown, Pencil, Eye, EyeOff, ShieldCheck, Wrench, KeyRound, X } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import UserGuide from '../components/UserGuide';
import { invalidateMachineCache } from '../components/MachineSelect';
import { invalidateEmployeeCache } from '../components/EmployeeSelect';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const PROCESS_PRESETS = [
  {
    id: 'default',
    label: 'Precon + Long Term',
    description: 'Standard reliability qualification flow',
    steps: [
      'Incoming Inspection', 'Visual', 'Serialize Samples', 'O/S', 'SAT',
      'Bake', 'Dry Bake', 'T & H Soak', 'Reflow', 'SAT', 'O/S', 'Visual',
      'Reliability Test', 'Temperature Cycle', 'SAT', 'O/S', 'Visual',
    ],
  },
  {
    id: 'mrt',
    label: 'MRT Process',
    description: 'Moisture Resistance Test qualification flow',
    steps: [
      'Incoming Inspection', 'Visual', 'Serialize Samples', 'O/S', 'SAT',
      'Bake', 'Dry Bake', 'Preconditioning (Precon)',
      'Moisture Resistance Test', 'Forced Convection Reflow (FCR)',
      'Temperature Cycle', 'SAT', 'O/S', 'Visual',
    ],
  },
  {
    id: 'reliability',
    label: 'Rel Only',
    description: 'Reliability testing qualification flow',
    steps: [
      'Incoming Inspection', 'Visual', 'Serialize Samples', 'O/S', 'SAT',
      'Bake', 'Dry Bake', 'T & H Soak', 'Reflow',
      'Reliability Test', 'Temperature Cycle', 'SAT', 'O/S', 'Visual',
    ],
  },
  {
    id: 'relmon',
    label: 'RelMon',
    description: 'Reliability Monitor qualification flow',
    steps: [
      'Incoming Inspection', 'Visual', 'Serialize Samples', 'O/S', 'SAT',
      'Bake', 'Reflow', 'Temperature Cycle', 'SAT', 'O/S', 'Visual',
    ],
  },
];

const AVAILABLE_STEPS = [
  'Incoming Inspection', 'Visual', 'Serialize Samples', 'O/S', 'SAT',
  'Bake', 'Dry Bake', 'T & H Soak', 'Reflow', 'HTS',
  'Reliability Test', 'Moisture Resistance Test',
  'Temperature Cycle',
  'Preconditioning (Precon)', 'Forced Convection Reflow (FCR)',
  'Construction Analysis (CA)', 'Internal Physical Inspection (IPI)',
  'Physical Construction Analysis (PCA)', 'Product Audit',
  'Moisture Absorption and Desorption',
];

function SystemHealthCard() {
  const [health, setHealth] = useState(null);
  const [period, setPeriod] = useState('24H');
  const [lastFetched, setLastFetched] = useState(null);
  const [relTime, setRelTime] = useState('—');

  const fetchHealth = useCallback(async () => {
    try {
      const data = await api.getSystemHealth(period);
      setHealth(data);
      setLastFetched(new Date());
    } catch { /* ignore */ }
  }, [period]);

  useEffect(() => {
    fetchHealth();
    const iv = setInterval(fetchHealth, 30_000);
    return () => clearInterval(iv);
  }, [fetchHealth]);

  useEffect(() => {
    const iv = setInterval(() => {
      if (!lastFetched) return;
      const secs = Math.round((Date.now() - lastFetched.getTime()) / 1000);
      setRelTime(secs < 60 ? `${secs} sec ago` : `${Math.round(secs / 60)} min ago`);
    }, 1000);
    return () => clearInterval(iv);
  }, [lastFetched]);

  const fmtUptime = (secs) => {
    if (!secs) return '—';
    const h = Math.floor(secs / 3600);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}d ${h % 24}h`;
    if (h > 0) return `${h}h ${Math.floor((secs % 3600) / 60)}m`;
    return `${Math.floor(secs / 60)}m`;
  };

  const statusColor = health?.status === 'OPERATIONAL' ? '#10b981' : '#f59e0b';

  function HealthTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-slate-800/95 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl">
        <p className="text-slate-300 font-medium mb-1">{label}</p>
        {payload.map(p => (
          <p key={p.dataKey} style={{ color: p.color }} className="leading-5">
            {p.name} : {p.value}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-xl">
      {/* Status bar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: statusColor }} />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: statusColor }} />
          </span>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500">System Status</p>
            <p className="text-xs font-bold leading-none mt-0.5" style={{ color: statusColor }}>{health?.status ?? '—'}</p>
          </div>
        </div>
        <div className="h-7 w-px bg-slate-800 hidden sm:block" />
        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-500">Active Tests</p>
          <p className="text-xs font-bold text-cyan-400 leading-none mt-0.5">{health?.active_tests ?? '—'} Running</p>
        </div>
        <div className="h-7 w-px bg-slate-800 hidden sm:block" />
        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-500">Uptime</p>
          <p className="text-xs font-bold text-slate-200 leading-none mt-0.5">{fmtUptime(health?.uptime_seconds)}</p>
        </div>
        <div className="h-7 w-px bg-slate-800 hidden sm:block" />
        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-500">Last Updated</p>
          <p className="text-xs font-bold text-slate-200 leading-none mt-0.5">{relTime}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="px-2.5 py-1 rounded border border-emerald-700 bg-emerald-950/50 text-[11px] font-mono font-bold text-emerald-400">
            CPU: {health?.cpu_pct ?? 0}%
          </span>
          <span className="px-2.5 py-1 rounded border border-blue-700 bg-blue-950/50 text-[11px] font-mono font-bold text-blue-400">
            MEM: {health?.mem_pct ?? 0}%
          </span>
          <span className="px-2.5 py-1 rounded border border-violet-700 bg-violet-950/50 text-[11px] font-mono font-bold text-violet-400">
            LOAD: {health?.load_avg ?? 0}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-white font-bold text-base">System Performance</h3>
            <p className="text-slate-500 text-xs mt-0.5">Real-time test execution metrics</p>
          </div>
          <div className="flex gap-0.5 bg-slate-900 rounded-lg p-0.5 border border-slate-800">
            {['24H', '7D', '30D'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  period === p ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {!health ? (
          <div className="flex items-center justify-center h-52">
            <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={health.chart_data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="hgS" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="hgR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22d3ee" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="hgF" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<HealthTooltip />} />
              <Area type="monotone" dataKey="success" name="Success" stroke="#10b981" strokeWidth={2} fill="url(#hgS)" dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 5 }} />
              <Area type="monotone" dataKey="running" name="Running" stroke="#22d3ee" strokeWidth={2} fill="url(#hgR)" dot={{ r: 3, fill: '#22d3ee', strokeWidth: 0 }} activeDot={{ r: 5 }} />
              <Area type="monotone" dataKey="failed"  name="Failed"  stroke="#f43f5e" strokeWidth={2} fill="url(#hgF)" dot={{ r: 3, fill: '#f43f5e', strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5 pt-4 border-t border-slate-800">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Avg Response</p>
            <p className="text-2xl font-bold text-cyan-400 font-mono">{health?.avg_response_ms ?? '—'}ms</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Success Rate</p>
            <p className="text-2xl font-bold text-cyan-400 font-mono">{health?.success_rate ?? '—'}%</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Throughput</p>
            <p className="text-2xl font-bold text-violet-400 font-mono">{health?.throughput ?? '—'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({});
  const [backups, setBackups] = useState([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupMsg, setBackupMsg] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [backupWarning, setBackupWarning] = useState(null); // { completedCount, totalCount }
  const { hasPerm, user, refreshUser } = useAuth();
  const canEditSettings = hasPerm('manage_settings');


  const canManageBackups = hasPerm('manage_backups');
  const [showGuide, setShowGuide] = useState(false);
  const [showTechPass, setShowTechPass] = useState(false);

  // ----- Maintenance Mode state -----
  const [maintenanceActive, setMaintenanceActive] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('System is currently under maintenance. Please check back later.');
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState('');

  // ----- Server Controls state -----
  const [restartPhase, setRestartPhase] = useState('idle'); // idle | restarting | online
  const [rebuildPhase, setRebuildPhase] = useState('idle'); // idle | running | success | failed
  const [rebuildOutput, setRebuildOutput] = useState('');

  // ----- Profile state -----
  const [profileForm, setProfileForm] = useState({ username: '', position: '', contact_email: '', plant: '', manager: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState('');
  const [viewAvatarOpen, setViewAvatarOpen] = useState(false);

  // ----- Change Password state -----
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [showPwCurrent, setShowPwCurrent] = useState(false);
  const [showPwNew, setShowPwNew] = useState(false);
  const [showDevPhoto, setShowDevPhoto] = useState(false);
  const [showDevSpeech, setShowDevSpeech] = useState(false);

  // ----- Machine Management state -----
  const [machines, setMachines] = useState([]);
  const [machineForm, setMachineForm] = useState({ machine_no: '', description: '' });
  const [machineAdding, setMachineAdding] = useState(false);
  const [machineMsg, setMachineMsg] = useState('');
  const [machineDeleteConfirm, setMachineDeleteConfirm] = useState(null);
  const [machineListOpen, setMachineListOpen] = useState(false);

  // ----- Employee Management state -----
  const [employees, setEmployees] = useState([]);
  const [empForm, setEmpForm] = useState({ id: '', name: '', position: '' });
  const [empAdding, setEmpAdding] = useState(false);
  const [empMsg, setEmpMsg] = useState('');
  const [empDeleteConfirm, setEmpDeleteConfirm] = useState(null);
  const [empListOpen, setEmpListOpen] = useState(false);

  // ----- Process Steps state -----
  const [stepsForm, setStepsForm] = useState([]);
  const [stepsSaving, setStepsSaving] = useState(false);
  const [stepsMsg, setStepsMsg] = useState('');
  const [stepNewInput, setStepNewInput] = useState('');
  const [stepsRenameIdx, setStepsRenameIdx] = useState(null);
  const [stepsRenameVal, setStepsRenameVal] = useState('');

  // ----- Preset editing state -----
  const [presetsState, setPresetsState] = useState(PROCESS_PRESETS);
  const [editingPresetId, setEditingPresetId] = useState(null);
  const [editPresetSteps, setEditPresetSteps] = useState([]);
  const [editPresetInput, setEditPresetInput] = useState('');
  const [presetsSaving, setPresetsSaving] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);

  // ----- New Process Template modal state -----
  const [showNewProcessModal, setShowNewProcessModal] = useState(false);
  const [newPresetLabel, setNewPresetLabel] = useState('');
  const [newPresetSteps, setNewPresetSteps] = useState([]);
  const [newPresetSaving, setNewPresetSaving] = useState(false);
  const [newPresetError, setNewPresetError] = useState('');

  const handleOpenGuide = () => {
    // Clear dismissed flag so the guide can be shown again
    if (user?.id) localStorage.removeItem(`rel_guide_dismissed_${user.id}`);
    setShowGuide(true);
  };

  const handleToggleMaintenance = async () => {
    setMaintenanceLoading(true);
    setMaintenanceMsg('');
    try {
      const next = !maintenanceActive;
      await api.setMaintenance(next, maintenanceMessage);
      setMaintenanceActive(next);
      setMaintenanceMsg(next ? 'Maintenance mode enabled. Users will see the maintenance page.' : 'Maintenance mode disabled. Site is back online.');
      setTimeout(() => setMaintenanceMsg(''), 5000);
    } catch (e) {
      setMaintenanceMsg(`Error: ${e.message}`);
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const handleRestartBackend = async () => {
    setRestartPhase('restarting');
    try {
      await api.restartBackend();
    } catch { /* expected — server drops the connection */ }
    // Poll until the backend responds again
    const poll = setInterval(async () => {
      try {
        await fetch('/api/maintenance');
        clearInterval(poll);
        setRestartPhase('online');
        setTimeout(() => setRestartPhase('idle'), 5000);
      } catch { /* still restarting */ }
    }, 1500);
    // Safety timeout after 60 s
    setTimeout(() => { clearInterval(poll); setRestartPhase('idle'); }, 60000);
  };

  const handleRebuildFrontend = async () => {
    setRebuildPhase('running');
    setRebuildOutput('');
    try {
      await api.rebuildFrontend();
    } catch (e) {
      setRebuildPhase('failed');
      setRebuildOutput(e.message);
      return;
    }
    // Poll build status
    const poll = setInterval(async () => {
      try {
        const s = await api.getRebuildStatus();
        if (!s.running) {
          clearInterval(poll);
          setRebuildPhase(s.success ? 'success' : 'failed');
          setRebuildOutput(s.output || '');
        }
      } catch { /* keep polling */ }
    }, 2000);
    // Safety timeout
    setTimeout(() => { clearInterval(poll); }, 320000);
  };

  useEffect(() => {
    api.getSettings()
      .then(s => {
        setSettings(s);
        setForm({
          app_name: s.app_name || '',
          app_logo: s.app_logo || '',
          company_name: s.company_name || '',
          contact_email: s.contact_email || '',
          tech_auth_code: s.tech_auth_code || '735522',
        });
        setStepsForm(s.process_steps && s.process_steps.length ? s.process_steps : [
          'Incoming Inspection', 'Visual', 'Serialize Samples', 'O/S', 'SAT',
          'Bake', 'Dry Bake', 'T & H Soak', 'Reflow', 'SAT', 'O/S', 'Visual',
          'Reliability Test', 'Temperature Cycle', 'SAT', 'O/S', 'Visual',
        ]);
        if (s.process_presets && s.process_presets.length) {
          // Merge: keep saved presets, append any built-in ones that are missing
          const saved = s.process_presets;
          const missing = PROCESS_PRESETS.filter(bp => !saved.some(sp => sp.id === bp.id));
          setPresetsState([...saved, ...missing]);
        } else {
          setPresetsState(PROCESS_PRESETS);
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
    loadBackups();
    // Load current user profile
    api.getMe().then(u => {
      setProfileForm({
        username: u.username || '',
        position: u.position || '',
        contact_email: u.contact_email || '',
        plant: u.plant || '',
        manager: u.manager || '',
      });
      setAvatarPreview(u.avatar || null);
    }).catch(() => {});
    // Load machines and employees
    api.getMachines().then(d => setMachines(d.machines || [])).catch(() => {});
    api.getEmployees().then(d => setEmployees(d.employees || [])).catch(() => {});
    // Load maintenance status
    api.getMaintenance().then(d => {
      setMaintenanceActive(d.active || false);
      if (d.message) setMaintenanceMessage(d.message);
    }).catch(() => {});
  }, []);

  const loadBackups = () => {
    api.getBackups().then(setBackups).catch(() => {});
  };

  const handleCreateBackup = async () => {
    // First, get the count of completed requests
    try {
      const status = await api.checkBackupStatus();
      if (status.completed_count > 0) {
        // Show warning dialog
        setBackupWarning({
          completedCount: status.completed_count,
          totalCount: status.request_count
        });
      } else {
        // No completed requests, proceed directly
        await executeBackup();
      }
    } catch (err) {
      setBackupMsg(`Error: ${err.message}`);
    }
  };

  const executeBackup = async () => {
    setBackupLoading(true);
    setBackupMsg('');
    setBackupWarning(null);
    try {
      const res = await api.createBackup();
      const deletedCount = res.deleted_completed_requests || 0;
      const remaining = res.remaining_requests || 0;
      setBackupMsg(`✅ Backup created: ${res.filename}. ${deletedCount} completed requests were archived and removed. ${remaining} active requests remaining.`);
      loadBackups();
    } catch (err) { 
      setBackupMsg(`Error: ${err.message}`); 
    }
    finally { setBackupLoading(false); }
  };

  const handleDeleteBackup = async () => {
    if (!deleteConfirm) return;
    try {
      await api.deleteBackup(deleteConfirm);
      loadBackups();
    } catch (err) { alert(err.message); }
    setDeleteConfirm(null);
  };

  const handleDownloadBackup = async (filename) => {
    const token = localStorage.getItem('token');
    const url = api.getBackupUrl(filename);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    // Use fetch with auth header for download
    fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        link.href = blobUrl;
        link.click();
        URL.revokeObjectURL(blobUrl);
        
        // Confirm download for critical backup tracking
        return api.confirmBackupDownload(filename);
      })
      .catch(err => console.error('Download error:', err));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg('');
    try {
      await api.updateProfile(profileForm);
      setProfileMsg('Profile saved successfully!');
    } catch (err) {
      setProfileMsg(`Error: ${err.message}`);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarSaving(true);
    setAvatarMsg('');
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result;
      try {
        await api.updateAvatar(base64);
        setAvatarPreview(base64);
        setAvatarMsg('Photo updated!');
        refreshUser();
        setTimeout(() => setAvatarMsg(''), 3000);
      } catch (err) {
        setAvatarMsg(`Error: ${err.message}`);
      } finally {
        setAvatarSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = async () => {
    if (!window.confirm('Remove profile photo?')) return;
    setAvatarSaving(true);
    setAvatarMsg('');
    try {
      await api.updateAvatar('');
      setAvatarPreview(null);
      setAvatarMsg('Photo removed.');
      refreshUser();
      setTimeout(() => setAvatarMsg(''), 3000);
    } catch (err) {
      setAvatarMsg(`Error: ${err.message}`);
    } finally {
      setAvatarSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMsg('');
    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwMsg('Error: New passwords do not match.');
      return;
    }
    if (pwForm.new_password.length < 6) {
      setPwMsg('Error: New password must be at least 6 characters.');
      return;
    }
    setPwSaving(true);
    try {
      await api.changePassword(pwForm.current_password, pwForm.new_password);
      setPwMsg('Password changed successfully!');
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setPwMsg(`Error: ${err.message}`);
    } finally {
      setPwSaving(false);
    }
  };

  const handleAddMachine = async (e) => {
    e.preventDefault();
    if (!machineForm.machine_no.trim() || !machineForm.description.trim()) return;
    setMachineAdding(true); setMachineMsg('');
    try {
      const added = await api.addMachine(machineForm);
      setMachines(prev => [...prev, added].sort((a, b) => a.machine_no.localeCompare(b.machine_no)));
      setMachineForm({ machine_no: '', description: '' });
      setMachineMsg('Machine added.');
      invalidateMachineCache();
    } catch (err) { setMachineMsg(`Error: ${err.message}`); }
    finally { setMachineAdding(false); }
  };

  const handleDeleteMachine = async () => {
    if (!machineDeleteConfirm) return;
    try {
      await api.deleteMachine(machineDeleteConfirm.id);
      setMachines(prev => prev.filter(m => m.id !== machineDeleteConfirm.id));
      invalidateMachineCache();
    } catch (err) { alert(err.message); }
    setMachineDeleteConfirm(null);
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!empForm.id.trim() || !empForm.name.trim()) return;
    setEmpAdding(true); setEmpMsg('');
    try {
      const added = await api.addEmployee(empForm);
      setEmployees(prev => [...prev, added].sort((a, b) => a.name.localeCompare(b.name)));
      setEmpForm({ id: '', name: '', position: '' });
      setEmpMsg('Employee added.');
      invalidateEmployeeCache();
    } catch (err) { setEmpMsg(`Error: ${err.message}`); }
    finally { setEmpAdding(false); }
  };

  const handleDeleteEmployee = async () => {
    if (!empDeleteConfirm) return;
    try {
      await api.deleteEmployee(empDeleteConfirm.id);
      setEmployees(prev => prev.filter(e => e.id !== empDeleteConfirm.id));
      invalidateEmployeeCache();
    } catch (err) { alert(err.message); }
    setEmpDeleteConfirm(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const data = {};
      if (form.app_name !== (settings.app_name || '')) data.app_name = form.app_name;
      if (form.app_logo !== (settings.app_logo || '')) data.app_logo = form.app_logo;
      if (form.company_name !== (settings.company_name || '')) data.company_name = form.company_name;
      if (form.contact_email !== (settings.contact_email || '')) data.contact_email = form.contact_email;
      if (form.tech_auth_code !== (settings.tech_auth_code || '735522')) data.tech_auth_code = form.tech_auth_code;

      if (Object.keys(data).length === 0) {
        setMessage('No changes to save.');
        setSaving(false);
        return;
      }

      await api.updateSettings(data);
      setMessage('Settings saved successfully!');
      // Update local
      setSettings(prev => ({ ...prev, ...data }));
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSteps = async () => {
    if (stepsForm.length === 0) { setStepsMsg('Cannot save — step list is empty.'); return; }
    setStepsSaving(true);
    setStepsMsg('');
    try {
      await api.updateSettings({ process_steps: stepsForm });
      setSettings(prev => ({ ...prev, process_steps: stepsForm }));
      setStepsMsg('Process steps saved and set as default for all users!');
    } catch (err) {
      setStepsMsg(`Error: ${err.message}`);
    } finally {
      setStepsSaving(false);
    }
  };

  const handleResetSteps = async () => {
    const defaults = [
      'Incoming Inspection', 'Visual', 'Serialize Samples', 'O/S', 'SAT',
      'Bake', 'Dry Bake', 'T & H Soak', 'Reflow', 'SAT', 'O/S', 'Visual',
      'Reliability Test', 'Temperature Cycle', 'SAT', 'O/S', 'Visual',
    ];
    setStepsForm(defaults);
    setStepsMsg('Reset to default — click Save to apply.');
  };

  const handleSavePreset = async (presetId) => {
    setPresetsSaving(true);
    // Only update the edited preset's steps — leave all other presets unchanged
    const updatedPresets = presetsState.map(p => p.id === presetId ? { ...p, steps: editPresetSteps } : p);
    const newSteps = editPresetSteps;
    try {
      // Save the preset definition AND set these steps as the active process_steps (default for all users)
      await api.updateSettings({ process_steps: newSteps, process_presets: updatedPresets });
      setPresetsState(updatedPresets);
      setSettings(prev => ({ ...prev, process_steps: newSteps, process_presets: updatedPresets }));
      setStepsForm(newSteps);
      setEditingPresetId(null);
      setEditPresetSteps([]);
      setEditPresetInput('');
      setStepsMsg(`Preset "${presetsState.find(p => p.id === presetId)?.label}" saved and set as default for all users!`);
    } catch (err) {
      setStepsMsg(`Error saving preset: ${err.message}`);
    } finally {
      setPresetsSaving(false);
    }
  };

  const handleCreateProcessPreset = async () => {
    if (!newPresetLabel.trim()) { setNewPresetError('Process name is required'); return; }
    if (newPresetSteps.length === 0) { setNewPresetError('Add at least one step'); return; }
    setNewPresetSaving(true); setNewPresetError('');
    try {
      await api.createProcessPreset({ label: newPresetLabel.trim(), description: '', steps: newPresetSteps });
      // Reload presets from settings
      const s = await api.getSettings();
      if (s.process_presets && s.process_presets.length) {
        const saved = s.process_presets;
        const missing = PROCESS_PRESETS.filter(bp => !saved.some(sp => sp.id === bp.id));
        setPresetsState([...saved, ...missing]);
      }
      setShowNewProcessModal(false);
      setNewPresetLabel(''); setNewPresetSteps([]);
      setStepsMsg('New process template created!');
    } catch (e) {
      setNewPresetError(e.message || 'Failed to save');
    } finally {
      setNewPresetSaving(false);
    }
  };

  const handleDeleteProcessPreset = async (presetId) => {
    if (!window.confirm('Delete this custom process template?')) return;
    try {
      await api.deleteProcessPreset(presetId);
      const s = await api.getSettings();
      if (s.process_presets && s.process_presets.length) {
        const saved = s.process_presets;
        const missing = PROCESS_PRESETS.filter(bp => !saved.some(sp => sp.id === bp.id));
        setPresetsState([...saved, ...missing]);
      } else {
        setPresetsState(PROCESS_PRESETS);
      }
      setStepsMsg('Template deleted.');
    } catch (e) {
      setStepsMsg(`Error: ${e.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>;
  }

  return (
    <div className="space-y-8 stagger-children">
      <div>
        <h1
          className="text-3xl font-heading font-bold text-slate-900 dark:text-white tracking-tight select-none cursor-default"
          title="Settings"
        >Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Configure application settings.</p>
      </div>

      {/* My Profile */}
      <div className="bg-white dark:bg-slate-800 border border-blue-200 dark:border-slate-700 rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-blue-100 dark:border-slate-700 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-slate-800 dark:text-slate-100">My Profile</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Personal information visible to others in your team</p>
          </div>
        </div>
        <form onSubmit={handleSaveProfile} className="p-6 space-y-5">
          {/* Avatar Upload */}
          <div className="flex items-center gap-5 pb-4 border-b border-slate-100">
            <div className="relative">
              <div
                className={`w-16 h-16 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center text-slate-600 text-xl font-bold flex-shrink-0 ${
                  avatarPreview ? 'cursor-pointer ring-2 ring-transparent hover:ring-blue-400 transition-all' : ''
                }`}
                onClick={() => avatarPreview && setViewAvatarOpen(true)}
                title={avatarPreview ? 'Click to view photo' : undefined}
              >
                {avatarPreview
                  ? <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
                  : (profileForm.username?.[0]?.toUpperCase() || <User className="w-7 h-7" />)
                }
              </div>
              {avatarSaving && (
                <div className="absolute inset-0 rounded-full bg-white/70 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-700">Profile Photo</p>
              <p className="text-xs text-slate-400">JPG or PNG, recommended 200×200px</p>
              <div className="flex items-center gap-2 mt-2">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-lg text-xs font-medium transition-colors">
                  <User className="w-3.5 h-3.5" />
                  Upload Photo
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={avatarSaving} />
                </label>
                {avatarPreview && (
                  <button type="button" onClick={handleRemoveAvatar} disabled={avatarSaving}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-lg text-xs font-medium transition-colors disabled:opacity-50">
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                )}
              </div>
              {avatarMsg && (
                <p className={`text-xs mt-1 ${avatarMsg.startsWith('Error') ? 'text-red-500' : 'text-emerald-600'}`}>{avatarMsg}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1.5">
                Name
              </label>
              <input
                type="text"
                value={profileForm.username}
                onChange={e => setProfileForm(f => ({ ...f, username: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm transition-all"
                placeholder="Your display name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1.5">
                Position / Job Title
              </label>
              <input
                type="text"
                value={profileForm.position}
                onChange={e => setProfileForm(f => ({ ...f, position: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm transition-all"
                placeholder="e.g. Reliability Engineer"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1.5">
                Contact Email
              </label>
              <input
                type="email"
                value={profileForm.contact_email}
                onChange={e => setProfileForm(f => ({ ...f, contact_email: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm transition-all"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1.5">
                Plant
              </label>
              <input
                type="text"
                value={profileForm.plant}
                onChange={e => setProfileForm(f => ({ ...f, plant: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm transition-all"
                placeholder="e.g. Plant 1"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1.5">
                Manager
              </label>
              <input
                type="text"
                value={profileForm.manager}
                onChange={e => setProfileForm(f => ({ ...f, manager: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm transition-all"
                placeholder="Manager's name"
              />
            </div>
          </div>

          {profileMsg && (
            <p className={`text-sm ${profileMsg.startsWith('Error') ? 'text-red-600' : 'text-emerald-600'}`}>{profileMsg}</p>
          )}

          <div className="flex justify-end">
            <button type="submit" disabled={profileSaving}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5 py-2.5
                font-medium text-sm shadow-sm hover:shadow-md disabled:opacity-50 transition-all">
              <Save className="w-4 h-4" />
              {profileSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Change Password */}
      {!user?.is_guest && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
              <KeyRound className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-slate-800">Change Password</h3>
              <p className="text-xs text-slate-500 mt-0.5">Update your login password</p>
            </div>
          </div>
          <form onSubmit={handleChangePassword} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1.5">Current Password</label>
              <div className="relative">
                <input
                  type={showPwCurrent ? 'text' : 'password'}
                  required
                  value={pwForm.current_password}
                  onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 pr-10 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm transition-all"
                  placeholder="Enter current password"
                />
                <button type="button" onClick={() => setShowPwCurrent(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPwCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showPwNew ? 'text' : 'password'}
                    required
                    value={pwForm.new_password}
                    onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 pr-10 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm transition-all"
                    placeholder="At least 6 characters"
                  />
                  <button type="button" onClick={() => setShowPwNew(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPwNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={pwForm.confirm_password}
                  onChange={e => setPwForm(f => ({ ...f, confirm_password: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm transition-all"
                  placeholder="Repeat new password"
                />
              </div>
            </div>
            {pwMsg && (
              <p className={`text-sm ${pwMsg.startsWith('Error') ? 'text-red-600' : 'text-emerald-600'}`}>{pwMsg}</p>
            )}
            <div className="flex justify-end">
              <button type="submit" disabled={pwSaving || user?.is_guest}
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-5 py-2.5 font-medium text-sm shadow-sm disabled:opacity-50 transition-all">
                <KeyRound className="w-4 h-4" />
                {pwSaving ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-heading font-semibold text-slate-800">General Settings</h3>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1.5">
                Application Name
              </label>
              <input
                type="text"
                value={form.app_name}
                onChange={e => setForm(f => ({ ...f, app_name: e.target.value }))}
                disabled={!canEditSettings}
                className={`w-full border border-slate-200 rounded-lg px-4 py-2.5 bg-slate-50 focus:bg-white
                  focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm transition-all ${!canEditSettings ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1.5">
                Company Name
              </label>
              <input
                type="text"
                value={form.company_name}
                onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                disabled={!canEditSettings}
                className={`w-full border border-slate-200 rounded-lg px-4 py-2.5 bg-slate-50 focus:bg-white
                  focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm transition-all ${!canEditSettings ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1.5">
                Contact Email
              </label>
              <input
                type="email"
                value={form.contact_email}
                onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
                disabled={!canEditSettings}
                className={`w-full border border-slate-200 rounded-lg px-4 py-2.5 bg-slate-50 focus:bg-white
                  focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm transition-all ${!canEditSettings ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1.5">
                Logo URL
              </label>
              <input
                type="text"
                value={form.app_logo}
                onChange={e => setForm(f => ({ ...f, app_logo: e.target.value }))}
                disabled={!canEditSettings}
                className={`w-full border border-slate-200 rounded-lg px-4 py-2.5 bg-slate-50 focus:bg-white
                  focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm transition-all ${!canEditSettings ? 'opacity-60 cursor-not-allowed' : ''}`}
                placeholder="https://..."
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                Technician Login Code
              </label>
              <div className="relative">
                <input
                  type={showTechPass ? 'text' : 'password'}
                  value={form.tech_auth_code}
                  onChange={e => setForm(f => ({ ...f, tech_auth_code: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                  disabled={!canEditSettings}
                  maxLength={6}
                  className={`w-full border border-slate-200 rounded-lg px-4 py-2.5 pr-10 bg-slate-50 focus:bg-white
                    focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm tracking-[0.3em] transition-all ${!canEditSettings ? 'opacity-60 cursor-not-allowed' : ''}`}
                  placeholder="6-digit code"
                />
                {canEditSettings && (
                  <button type="button" onClick={() => setShowTechPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showTechPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">6-digit numeric code required to log in as Technician.</p>
            </div>
          </div>

          {message && (
            <p className={`text-sm ${message.startsWith('Error') ? 'text-red-600' : 'text-emerald-600'}`}>
              {message}
            </p>
          )}

          {canEditSettings && (
            <div className="flex justify-end">
              <button type="submit" disabled={saving}
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-5 py-2.5
                  font-medium text-sm shadow-sm hover:shadow-md disabled:opacity-50 transition-all">
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Machine Management */}
      {canEditSettings && (
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
            <Cpu className="w-3.5 h-3.5 text-violet-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-heading font-semibold text-slate-800 text-sm">Machine Management</h3>
            <p className="text-xs text-slate-500">Add or remove machines available in Process Step details</p>
          </div>
          <button onClick={() => setMachineListOpen(o => !o)}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-violet-600 border border-slate-200 hover:border-violet-300 rounded px-2 py-1 transition-colors flex-shrink-0">
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${machineListOpen ? '' : '-rotate-90'}`} />
            {machineListOpen ? 'Hide List' : 'Show List'}
          </button>
        </div>
        <div className="p-4 space-y-3">
          {/* Add form */}
          <form onSubmit={handleAddMachine} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={machineForm.machine_no}
              onChange={e => setMachineForm(f => ({ ...f, machine_no: e.target.value }))}
              placeholder="Machine No. (e.g. RSS-007)"
              className="flex-1 border border-slate-200 rounded px-2.5 py-1.5 bg-slate-50 focus:bg-white focus:border-violet-400 focus:ring-1 focus:ring-violet-100 text-xs"
            />
            <input
              type="text"
              value={machineForm.description}
              onChange={e => setMachineForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Description (e.g. SAT)"
              className="flex-1 border border-slate-200 rounded px-2.5 py-1.5 bg-slate-50 focus:bg-white focus:border-violet-400 focus:ring-1 focus:ring-violet-100 text-xs"
            />
            <button type="submit" disabled={machineAdding || !machineForm.machine_no.trim() || !machineForm.description.trim()}
              className="inline-flex items-center gap-1 bg-violet-600 hover:bg-violet-700 text-white rounded px-3 py-1.5 text-xs font-medium disabled:opacity-50 flex-shrink-0">
              <Plus className="w-3.5 h-3.5" /> Add Machine
            </button>
          </form>
          {machineMsg && (
            <p className={`text-xs ${machineMsg.startsWith('Error') ? 'text-red-600' : 'text-emerald-600'}`}>{machineMsg}</p>
          )}
          {/* Table */}
          {machineListOpen && (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-1.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Machine No.</th>
                  <th className="px-3 py-1.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {machines.length === 0 ? (
                  <tr><td colSpan={3} className="px-3 py-4 text-center text-xs text-slate-400">No machines yet.</td></tr>
                ) : machines.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-1.5 font-mono text-xs font-semibold text-slate-700">{m.machine_no}</td>
                    <td className="px-3 py-1.5 text-xs text-slate-600">{m.description}</td>
                    <td className="px-1.5 py-1 text-right">
                      <button onClick={() => setMachineDeleteConfirm(m)}
                        className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      </div>
      )}

      {/* Employee Management */}
      {canEditSettings && (
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <Users2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-heading font-semibold text-slate-800 text-sm">Employee Management</h3>
            <p className="text-xs text-slate-500">Add or remove employees available in Process Step details</p>
          </div>
          <button onClick={() => setEmpListOpen(o => !o)}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-600 border border-slate-200 hover:border-emerald-300 rounded px-2 py-1 transition-colors flex-shrink-0">
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${empListOpen ? '' : '-rotate-90'}`} />
            {empListOpen ? 'Hide List' : 'Show List'}
          </button>
        </div>
        <div className="p-4 space-y-3">
          {/* Add form */}
          <form onSubmit={handleAddEmployee} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={empForm.id}
              onChange={e => setEmpForm(f => ({ ...f, id: e.target.value }))}
              placeholder="Employee No. (e.g. 240001)"
              className="w-32 flex-shrink-0 border border-slate-200 rounded px-2.5 py-1.5 bg-slate-50 focus:bg-white focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 text-xs"
            />
            <input
              type="text"
              value={empForm.name}
              onChange={e => setEmpForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Full Name"
              className="flex-1 border border-slate-200 rounded px-2.5 py-1.5 bg-slate-50 focus:bg-white focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 text-xs"
            />
            <input
              type="text"
              value={empForm.position}
              onChange={e => setEmpForm(f => ({ ...f, position: e.target.value }))}
              placeholder="Position (e.g. REL ES)"
              className="flex-1 border border-slate-200 rounded px-2.5 py-1.5 bg-slate-50 focus:bg-white focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 text-xs"
            />
            <button type="submit" disabled={empAdding || !empForm.id.trim() || !empForm.name.trim()}
              className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded px-3 py-1.5 text-xs font-medium disabled:opacity-50 flex-shrink-0">
              <Plus className="w-3.5 h-3.5" /> Add Employee
            </button>
          </form>
          {empMsg && (
            <p className={`text-xs ${empMsg.startsWith('Error') ? 'text-red-600' : 'text-emerald-600'}`}>{empMsg}</p>
          )}
          {/* Table */}
          {empListOpen && (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-1.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Emp. No.</th>
                  <th className="px-3 py-1.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-3 py-1.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Position</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.length === 0 ? (
                  <tr><td colSpan={4} className="px-3 py-4 text-center text-xs text-slate-400">No employees yet.</td></tr>
                ) : employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-1.5 font-mono text-xs font-semibold text-slate-700">{emp.id}</td>
                    <td className="px-3 py-1.5 text-xs text-slate-700">{emp.name}</td>
                    <td className="px-3 py-1.5 text-xs text-slate-500">{emp.position}</td>
                    <td className="px-1.5 py-1 text-right">
                      <button onClick={() => setEmpDeleteConfirm(emp)}
                        className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      </div>
      )}

      {/* Process Steps Reference */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
        <div
          className="px-6 py-4 flex items-center justify-between cursor-pointer select-none hover:bg-slate-50 transition-colors rounded-lg"
          onClick={() => setStepsOpen(o => !o)}
        >
          <div className="flex items-center gap-2">
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${stepsOpen ? '' : '-rotate-90'}`} />
            <h3 className="font-heading font-semibold text-slate-800">Process Steps</h3>
            {!stepsOpen && (
              <span className="text-xs text-slate-400">({stepsForm.length} steps)</span>
            )}
          </div>
          {canEditSettings && stepsOpen && (
            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
              <button type="button" onClick={handleResetSteps}
                className="text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors">
                Reset to Default
              </button>
              <button type="button" onClick={handleSaveSteps} disabled={stepsSaving}
                className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50 shadow-sm transition-colors">
                <Save className="w-3 h-3" />
                {stepsSaving ? 'Saving…' : 'Save Steps'}
              </button>
            </div>
          )}
        </div>
        <div className={stepsOpen ? 'border-t border-slate-100' : 'hidden'}>
        <div className="p-6 space-y-3">
          {stepsMsg && (
            <p className={`text-xs ${stepsMsg.startsWith('Error') ? 'text-red-600' : 'text-emerald-600'}`}>{stepsMsg}</p>
          )}
          {/* Preset selector */}
          {canEditSettings && (
            <div className="space-y-2 pb-2">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Load Preset</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {presetsState.map(preset => {
                  const isEditing = editingPresetId === preset.id;
                  const savedSteps = settings?.process_steps || [];
                  const isDefault = !isEditing && savedSteps.length === preset.steps.length &&
                    preset.steps.every((s, i) => s === savedSteps[i]);
                  const isActive = !isEditing && !isDefault && stepsForm.length === preset.steps.length &&
                    preset.steps.every((s, i) => s === stepsForm[i]);
                  return (
                    <div key={preset.id}
                      className={`flex items-start rounded-lg border transition-all ${
                        isEditing ? 'border-amber-400 ring-1 ring-amber-300 bg-amber-50'
                        : isDefault ? 'border-emerald-500 ring-2 ring-emerald-400 bg-emerald-50'
                        : isActive ? 'border-blue-400 ring-1 ring-blue-400 bg-blue-50'
                        : 'border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50'
                      }`}>
                      <button type="button"
                        onClick={async () => {
                          if (!isEditing) {
                            const steps = preset.steps;
                            setStepsForm(steps);
                            setStepsSaving(true);
                            setStepsMsg('');
                            try {
                              await api.updateSettings({ process_steps: steps });
                              setSettings(prev => ({ ...prev, process_steps: steps }));
                              setStepsMsg(`"${preset.label}" applied and saved as default for all users.`);
                            } catch (err) {
                              setStepsMsg(`Error: ${err.message}`);
                            } finally {
                              setStepsSaving(false);
                            }
                          }
                        }}
                        className="flex-1 text-left px-3 py-2.5">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`text-xs font-semibold ${
                            isEditing ? 'text-amber-700' : isDefault ? 'text-emerald-700' : isActive ? 'text-blue-700' : 'text-slate-700'
                          }`}>{preset.label}</span>
                          {isDefault && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500 text-white uppercase tracking-wide">Default</span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 block">{preset.description}</span>
                        <span className={`text-[10px] mt-1 font-medium block ${
                          isEditing ? 'text-amber-500' : isDefault ? 'text-emerald-500' : isActive ? 'text-blue-500' : 'text-slate-400'
                        }`}>{(isEditing ? editPresetSteps : preset.steps).length} steps</span>
                      </button>
                      <div className="flex flex-col gap-0.5 m-1.5">
                        <button type="button" title={isEditing ? 'Cancel' : 'Edit preset steps'}
                          onClick={() => {
                            if (isEditing) {
                              setEditingPresetId(null); setEditPresetSteps([]); setEditPresetInput('');
                            } else {
                              setEditingPresetId(preset.id); setEditPresetSteps([...preset.steps]); setEditPresetInput('');
                            }
                          }}
                          className={`p-1.5 rounded transition-colors ${
                            isEditing ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                            : 'text-slate-300 hover:text-amber-600 hover:bg-amber-50'
                          }`}>
                          <Pencil className="w-3 h-3" />
                        </button>
                        {preset.is_custom && hasPerm('manage_settings') && (
                          <button type="button" title="Delete template"
                            onClick={() => handleDeleteProcessPreset(preset.id)}
                            className="p-1.5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {/* + New Process button */}
                <button type="button"
                  onClick={() => { setNewPresetLabel(''); setNewPresetSteps([]); setNewPresetError(''); setShowNewProcessModal(true); }}
                  className="flex items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors min-h-[72px] text-xs font-medium">
                  <Plus className="w-3.5 h-3.5" />
                  New Process
                </button>
              </div>

              {/* Inline edit panel */}
              {editingPresetId && (() => {
                const preset = presetsState.find(p => p.id === editingPresetId);
                return (
                  <div className="border border-amber-300 rounded-lg bg-amber-50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-amber-800">Editing: {preset?.label}</p>
                      <div className="flex items-center gap-2">
                        <button type="button"
                          onClick={() => { setEditingPresetId(null); setEditPresetSteps([]); setEditPresetInput(''); }}
                          className="text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded px-2.5 py-1 bg-white hover:bg-slate-50">
                          Cancel
                        </button>
                        <button type="button" disabled={presetsSaving || editPresetSteps.length === 0}
                          onClick={() => handleSavePreset(editingPresetId)}
                          className="inline-flex items-center gap-1 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white rounded px-2.5 py-1 disabled:opacity-50">
                          <Save className="w-3 h-3" />
                          {presetsSaving ? 'Saving…' : 'Save Preset'}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                      {editPresetSteps.map((step, i) => (
                        <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-white rounded border border-amber-100 group">
                          <span className="text-xs font-bold text-slate-400 w-5 shrink-0">{i + 1}</span>
                          <span className="flex-1 text-xs text-slate-700">{step}</span>
                          <button type="button"
                            onClick={() => setEditPresetSteps(prev => prev.filter((_, idx) => idx !== i))}
                            className="p-0.5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1.5 pt-1 border-t border-amber-200">
                      <p className="text-[10px] text-amber-700 font-medium uppercase tracking-wider">Add Steps</p>
                      <div className="flex flex-wrap gap-1">
                        {AVAILABLE_STEPS.map(name => (
                          <button key={name} type="button"
                            onClick={() => setEditPresetSteps(prev => [...prev, name])}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-white text-slate-600 hover:bg-amber-100 hover:text-amber-700 border border-amber-200 transition-colors">
                            <PlusCircle className="w-2.5 h-2.5" /> {name}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <input value={editPresetInput} onChange={e => setEditPresetInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              const t = editPresetInput.trim();
                              if (t) { setEditPresetSteps(prev => [...prev, t]); setEditPresetInput(''); }
                            }
                          }}
                          placeholder="Or type a custom step name…"
                          className="flex-1 border border-amber-200 rounded px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-300" />
                        <button type="button"
                          onClick={() => { const t = editPresetInput.trim(); if (t) { setEditPresetSteps(prev => [...prev, t]); setEditPresetInput(''); }}}
                          className="inline-flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white rounded px-2.5 py-1.5 text-xs font-medium">
                          <Plus className="w-3 h-3" /> Add
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
          <div className="space-y-1.5">
            {stepsForm.map((step, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 group">
                <span className="text-xs font-bold text-slate-400 w-5 shrink-0">{i + 1}</span>
                {canEditSettings && stepsRenameIdx === i ? (
                  <>
                    <input autoFocus value={stepsRenameVal}
                      onChange={e => setStepsRenameVal(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          const t = stepsRenameVal.trim();
                          if (t) setStepsForm(prev => prev.map((s, idx) => idx === i ? t : s));
                          setStepsRenameIdx(null);
                        }
                        if (e.key === 'Escape') setStepsRenameIdx(null);
                      }}
                      className="flex-1 border border-blue-300 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200" />
                    <button onClick={() => {
                        const t = stepsRenameVal.trim();
                        if (t) setStepsForm(prev => prev.map((s, idx) => idx === i ? t : s));
                        setStepsRenameIdx(null);
                      }}
                      className="p-1 rounded hover:bg-emerald-100 text-emerald-600">
                      <Save className="w-3 h-3" />
                    </button>
                    <button onClick={() => setStepsRenameIdx(null)}
                      className="p-1 rounded hover:bg-slate-200 text-slate-400 text-xs">✕</button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-xs font-medium text-slate-700 truncate">{step}</span>
                    {canEditSettings && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setStepsRenameIdx(i); setStepsRenameVal(step); }}
                          className="p-1 rounded hover:bg-blue-100 text-slate-300 hover:text-blue-600 transition-colors" title="Rename">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={() => setStepsForm(prev => prev.filter((_, idx) => idx !== i))}
                          className="p-1 rounded hover:bg-red-100 text-slate-300 hover:text-red-500 transition-colors" title="Remove">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
          {canEditSettings && (
            <div className="space-y-2 pt-1">
              {/* Quick-add step buttons */}
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Quick Add</p>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_STEPS.map(name => (
                  <button key={name} type="button"
                    onClick={() => setStepsForm(prev => [...prev, name])}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 border border-slate-200 hover:border-blue-200 transition-colors">
                    <PlusCircle className="w-3 h-3" /> {name}
                  </button>
                ))}
              </div>
              {/* Free-text input */}
              <div className="flex items-center gap-2">
                <input value={stepNewInput} onChange={e => setStepNewInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const t = stepNewInput.trim();
                      if (t) { setStepsForm(prev => [...prev, t]); setStepNewInput(''); }
                    }
                  }}
                  placeholder="Or type a custom step name…"
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
                <button type="button"
                  onClick={() => { const t = stepNewInput.trim(); if (t) { setStepsForm(prev => [...prev, t]); setStepNewInput(''); }}}
                  className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2 text-xs font-medium transition-colors">
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Database Backups */}
      {canManageBackups && (
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-heading font-semibold text-slate-800">Database Backups</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Backups stored in <span className="font-mono text-slate-600">Rel_Request_Backups/</span> folder. 
              Auto-backups run monthly • Manual backups on-demand
            </p>
          </div>
          <button onClick={handleCreateBackup} disabled={backupLoading}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 shadow-sm transition-colors">
            <HardDrive className="w-4 h-4" />
            {backupLoading ? 'Creating...' : 'Create Backup'}
          </button>
        </div>
        <div className="p-6">
          {backupMsg && (
            <p className={`text-sm mb-3 ${backupMsg.startsWith('Error') ? 'text-red-600' : 'text-emerald-600'}`}>{backupMsg}</p>
          )}
          {backups.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No backups yet. Create one or wait for the monthly auto-backup.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {backups.map(b => (
                <div key={b.relative_path || b.filename} className="flex items-center justify-between py-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span>{b.filename.endsWith('.zip') ? '🗜️' : '📊'}</span>
                      <p className="text-sm font-medium text-slate-700 font-mono">{b.filename}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        b.type === 'Auto' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-blue-100 text-blue-700 border border-blue-200'
                      }`}>
                        {b.type}
                      </span>
                      {b.filename.endsWith('.zip') && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
                          DB + SAT Images
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{new Date(b.created_at).toLocaleString()}</span>
                      <span>•</span>
                      <span>{b.size_mb} MB</span>
                      {b.relative_path && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-slate-500">📁 {b.relative_path.split('/').slice(0, 2).join('/')}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleDownloadBackup(b.filename)} title="Download"
                      className="p-1.5 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors">
                      <Download className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteConfirm(b.filename)} title="Delete"
                      className="p-1.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Help & Guide */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-heading font-semibold text-slate-800">Help &amp; Guide</h3>
            <p className="text-xs text-slate-500 mt-0.5">Re-open the interactive onboarding walkthrough</p>
          </div>
          <BookOpen className="w-5 h-5 text-slate-400" />
        </div>
        <div className="p-6 flex items-center justify-between">
          <p className="text-sm text-slate-600 max-w-md">
            View the step-by-step guide that introduces all key features of the RELDMS portal.
          </p>
          <button
            onClick={handleOpenGuide}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors flex-shrink-0 ml-4"
          >
            <BookOpen className="w-4 h-4" /> Open Guide
          </button>
        </div>
      </div>

      {/* Maintenance Mode (Admin only) */}
      {user?.role === 'Admin' && (
        <div className={`bg-white border rounded-lg shadow-sm ${maintenanceActive ? 'border-amber-400 ring-2 ring-amber-200' : 'border-slate-200'}`}>
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-heading font-semibold text-slate-800 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-500" /> Maintenance Mode
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                While active, all users (except Admin) will see a maintenance page.
              </p>
            </div>
            {maintenanceActive && (
              <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">ACTIVE</span>
            )}
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1.5">
                Message shown to users
              </label>
              <input
                type="text"
                value={maintenanceMessage}
                onChange={e => setMaintenanceMessage(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 bg-slate-50 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 text-sm transition-all"
                placeholder="e.g. System update in progress. Back online in 30 minutes."
              />
            </div>
            {maintenanceMsg && (
              <p className={`text-sm font-medium ${maintenanceActive ? 'text-amber-700' : 'text-emerald-600'}`}>{maintenanceMsg}</p>
            )}
            <button
              onClick={handleToggleMaintenance}
              disabled={maintenanceLoading}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-60 ${
                maintenanceActive
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              }`}
            >
              <Wrench className="w-4 h-4" />
              {maintenanceLoading ? 'Updating...' : maintenanceActive ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode'}
            </button>
          </div>
        </div>
      )}

      {/* Server Controls (Admin only) */}
      {user?.role === 'Admin' && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-heading font-semibold text-slate-800 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-blue-500" /> Server Controls
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Restart the backend or rebuild the frontend after code edits.</p>
            </div>
          </div>
          <div className="p-6 grid sm:grid-cols-2 gap-5">
            {/* Restart Backend */}
            <div className="border border-slate-200 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-slate-700">Restart Backend</p>
                <p className="text-xs text-slate-500 mt-0.5">Reloads <span className="font-mono">server.py</span> — apply Python code changes without touching the terminal.</p>
              </div>
              {restartPhase === 'restarting' && (
                <div className="flex items-center gap-2 text-amber-600 text-xs font-medium">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Restarting… waiting for server to come back online.
                </div>
              )}
              {restartPhase === 'online' && (
                <p className="text-xs text-emerald-600 font-medium">✓ Backend is back online.</p>
              )}
              <button
                onClick={handleRestartBackend}
                disabled={restartPhase === 'restarting'}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${restartPhase === 'restarting' ? 'animate-spin' : ''}`} />
                {restartPhase === 'restarting' ? 'Restarting…' : 'Restart Backend'}
              </button>
            </div>

            {/* Rebuild Frontend */}
            <div className="border border-slate-200 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-slate-700">Rebuild Frontend</p>
                <p className="text-xs text-slate-500 mt-0.5">Runs <span className="font-mono">npm run build</span> — applies React/CSS changes to the live site.</p>
              </div>
              {rebuildPhase === 'running' && (
                <div className="flex items-center gap-2 text-blue-600 text-xs font-medium">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Building… this may take up to a minute.
                </div>
              )}
              {rebuildPhase === 'success' && (
                <p className="text-xs text-emerald-600 font-medium">✓ Build succeeded! Refresh your browser to see changes.</p>
              )}
              {rebuildPhase === 'failed' && (
                <p className="text-xs text-red-600 font-medium">✗ Build failed. See output below.</p>
              )}
              {rebuildOutput && (rebuildPhase === 'success' || rebuildPhase === 'failed') && (
                <pre className="bg-slate-900 text-slate-100 text-xs rounded p-3 overflow-auto max-h-32 whitespace-pre-wrap">{rebuildOutput}</pre>
              )}
              <button
                onClick={handleRebuildFrontend}
                disabled={rebuildPhase === 'running'}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${rebuildPhase === 'running' ? 'animate-spin' : ''}`} />
                {rebuildPhase === 'running' ? 'Building…' : 'Rebuild Frontend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* System Health Check */}
      <SystemHealthCard />

      {/* Database Info */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-heading font-semibold text-slate-800">System Information</h3>
        </div>
        <div className="p-6 space-y-2">
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Database</span>
            <span className="text-sm text-slate-700 font-mono">SQLite (Standalone)</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Backend</span>
            <span className="text-sm text-slate-700 font-mono">FastAPI + Python</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Frontend</span>
            <span className="text-sm text-slate-700 font-mono">React + Vite + Tailwind CSS</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Offline Mode</span>
            <span className="text-sm text-emerald-600 font-medium">Enabled (No Internet Required)</span>
          </div>
        </div>
      </div>

      {/* Created By */}
      <div
        className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700 rounded-xl shadow-lg overflow-hidden cursor-pointer transition-all duration-500 hover:shadow-[0_0_50px_rgba(139,92,246,0.35)] hover:border-violet-500/50 group"
        onClick={() => setShowDevSpeech(true)}
        title="Click to read a message from the developer"
      >
        <div className="px-6 py-4 border-b border-slate-700/60 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 group-hover:text-violet-400 transition-colors duration-300">About the Developer</h3>
          <span className="text-[10px] text-slate-600 group-hover:text-violet-500 transition-colors duration-300 italic">click to read message ✦</span>
        </div>
        <div className="p-6 flex items-center gap-5">
          {/* Avatar */}
          <div className="relative shrink-0">
            <img
              src={developerPhoto}
              alt="Francis Niño R. Villanueva"
              className="w-20 h-20 rounded-full object-cover shadow-lg ring-2 ring-white/10 hover:ring-violet-400/60 transition-all duration-300 cursor-zoom-in"
              onClick={e => { e.stopPropagation(); setShowDevPhoto(true); }}
              onError={e => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling.style.display = 'flex';
              }}
            />
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 via-violet-500 to-indigo-600 items-center justify-center shadow-lg ring-2 ring-white/10" style={{display:'none'}}>
              <span className="text-2xl font-bold text-white select-none">FV</span>
            </div>
            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-slate-900" title="Creator" />
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-white tracking-tight">Francis Niño R. Villanueva</p>
            <p className="text-sm text-slate-400 mt-0.5">Developer &amp; Designer</p>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Reliability Request Process Flow System &mdash; built for Amkor Technology’s Reliability Engineering team.
            </p>
          </div>
          {/* Badge */}
          <div className="shrink-0 text-right">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse inline-block" />
              v1.0
            </span>
          </div>
        </div>
        <div className="px-6 pb-4">
          <p className="text-xs text-slate-600 text-center">
            &copy; {new Date().getFullYear()} Amkor Technology &mdash; All rights reserved.
          </p>
        </div>
      </div>

      {/* Developer Photo Lightbox */}
      {showDevPhoto && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowDevPhoto(false)}
        >
          <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowDevPhoto(false)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white transition-colors text-sm flex items-center gap-1"
            >
              <X size={16} /> Close
            </button>
            <img
              src={developerPhoto}
              alt="Francis Niño R. Villanueva"
              className="w-full rounded-2xl shadow-2xl ring-2 ring-violet-500/30 object-cover"
            />
            <p className="text-center text-white/60 text-xs mt-3">Francis Niño R. Villanueva — Developer &amp; Designer</p>
          </div>
        </div>
      )}

      {/* Developer Speech Modal */}
      {showDevSpeech && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowDevSpeech(false)}
        >
          <div
            className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-violet-500/30 rounded-2xl shadow-2xl max-w-xl w-full p-8 overflow-y-auto max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowDevSpeech(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative shrink-0">
                <img
                  src={developerPhoto}
                  alt="Francis Niño R. Villanueva"
                  className="w-14 h-14 rounded-full object-cover ring-2 ring-violet-400/40 shadow-lg"
                  onError={e => { e.currentTarget.style.display='none'; e.currentTarget.nextElementSibling.style.display='flex'; }}
                />
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 items-center justify-center" style={{display:'none'}}>
                  <span className="text-lg font-bold text-white">FV</span>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900" />
              </div>
              <div>
                <p className="text-white font-bold text-base leading-tight">Francis Niño R. Villanueva</p>
                <p className="text-violet-400 text-xs mt-0.5">Developer &amp; Designer · Amkor Technology</p>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent mb-6" />

            {/* Speech */}
            <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
              <p>
                Hello! I'm <span className="text-white font-semibold">Francis Niño</span>, the developer behind the
                RELDMS. What you're looking at is something I built entirely from the ground up —
                every line of code, every UI detail, and every workflow decision was crafted with one goal in mind:
                to make the lives of the Reliability Engineering team at Amkor Technology a little easier.
              </p>
              <p>
                Before this system existed, tracking reliability requests meant navigating spreadsheets, emails, and
                manual follow-ups. I saw that gap and wanted to fill it with something that actually works —
                something fast, clean, and built specifically for the way this team operates.
              </p>
              <p>
                This system was built with <span className="text-violet-400 font-medium">React</span>,{' '}
                <span className="text-violet-400 font-medium">FastAPI</span>, and{' '}
                <span className="text-violet-400 font-medium">Tailwind CSS</span> — running fully offline, no cloud dependency,
                no complicated setup. Just open it and it works.
              </p>
              <p>
                I hope this tool serves you well. Whether you're an engineer submitting a request, a planner
                managing the queue, or a manager reviewing progress — this was built for you.
              </p>
              <p className="text-slate-400 italic">
                Thank you for trusting this work. Keep pushing forward.
              </p>
            </div>

            {/* Footer */}
            <div className="h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent mt-6 mb-4" />
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-600">© {new Date().getFullYear()} Amkor Technology</p>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-[10px] font-semibold text-violet-400">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse inline-block" />
                v1.0
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Backup Warning Dialog */}
      <ConfirmDialog
        open={!!backupWarning}
        title="⚠️ Backup Warning"
        danger={false}
        message={
          <div className="space-y-3">
            <p className="text-sm text-slate-700">
              Creating a backup will <strong className="text-amber-700">permanently delete {backupWarning?.completedCount || 0} completed requests</strong> from your database to free up space.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-amber-900">📋 What will happen:</p>
              <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside ml-2">
                <li>All data will be backed up to an Excel file</li>
                <li><strong>{backupWarning?.completedCount || 0} completed requests</strong> will be removed from the active database</li>
                <li><strong>{(backupWarning?.totalCount || 0) - (backupWarning?.completedCount || 0)} active/pending requests</strong> will remain in the database</li>
                <li>Completed requests will be safely stored in the backup file</li>
              </ul>
            </div>
            <p className="text-xs text-slate-600">
              <strong>Note:</strong> Only completed requests are removed. All active, pending, and in-progress requests will remain in your database.
            </p>
          </div>
        }
        confirmLabel="Proceed with Backup"
        confirmClassName="flex-1 px-4 py-2.5 text-white rounded-lg text-sm font-medium shadow-sm transition-colors bg-amber-600 hover:bg-amber-700"
        onConfirm={executeBackup}
        onCancel={() => setBackupWarning(null)}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        title="Delete Backup"
        message="Are you sure you want to permanently delete this backup file?"
        confirmLabel="Delete Backup"
        onConfirm={handleDeleteBackup}
        onCancel={() => setDeleteConfirm(null)}
      />

      <ConfirmDialog
        open={!!machineDeleteConfirm}
        title="Remove Machine"
        message={`Remove "${machineDeleteConfirm?.machine_no} — ${machineDeleteConfirm?.description}" from the machine list?`}
        confirmLabel="Remove"
        onConfirm={handleDeleteMachine}
        onCancel={() => setMachineDeleteConfirm(null)}
      />

      <ConfirmDialog
        open={!!empDeleteConfirm}
        title="Remove Employee"
        message={`Remove "${empDeleteConfirm?.name} (${empDeleteConfirm?.id})" from the employee list?`}
        confirmLabel="Remove"
        onConfirm={handleDeleteEmployee}
        onCancel={() => setEmpDeleteConfirm(null)}
      />

      <UserGuide open={showGuide} onClose={() => setShowGuide(false)} />

      {/* Avatar lightbox */}
      {viewAvatarOpen && avatarPreview && (
        <div
          className="fixed inset-0 z-[9999] bg-black/75 flex flex-col items-center justify-center gap-4"
          onClick={() => setViewAvatarOpen(false)}
        >
          <img
            src={avatarPreview}
            alt={profileForm.username}
            className="w-64 h-64 rounded-full object-cover shadow-2xl ring-4 ring-white/20"
            onClick={e => e.stopPropagation()}
          />
          {profileForm.username && (
            <p className="text-white text-sm font-semibold tracking-wide">{profileForm.username}</p>
          )}
          <p className="text-white/50 text-xs">Click anywhere to close</p>
          <button
            onClick={() => setViewAvatarOpen(false)}
            className="absolute top-4 right-4 w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      )}

      {/* New Process Template Modal */}
      {showNewProcessModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowNewProcessModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <div>
                <h4 className="font-semibold text-slate-800 text-sm">New Process Template</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Created by: <span className="font-medium text-slate-500">{user?.username || user?.name || 'Unknown'}</span></p>
              </div>
              <button onClick={() => setShowNewProcessModal(false)} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1.5">Process Name</label>
                <input type="text" autoFocus value={newPresetLabel} onChange={e => setNewPresetLabel(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateProcessPreset()}
                  placeholder="e.g. My Custom Flow"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-white text-sm text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" />
              </div>
              {newPresetSteps.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-1.5">Selected Steps ({newPresetSteps.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {newPresetSteps.map((step, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                        <span className="text-blue-400 text-[10px]">{i + 1}.</span> {step}
                        <button onClick={() => setNewPresetSteps(prev => prev.filter((_, idx) => idx !== i))} className="ml-0.5 text-blue-400 hover:text-blue-600 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-1.5">Available Steps — click to add</p>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_STEPS.map(step => (
                    <button key={step} type="button" onClick={() => setNewPresetSteps(prev => [...prev, step])}
                      className="px-2 py-1 rounded-lg text-xs font-medium transition-colors border bg-white text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 cursor-pointer">
                      {step}
                    </button>
                  ))}
                </div>
              </div>
              {newPresetError && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{newPresetError}</p>}
            </div>
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-100">
              <button type="button" onClick={() => setShowNewProcessModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button type="button" onClick={handleCreateProcessPreset} disabled={newPresetSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors">
                <Plus className="w-3.5 h-3.5" />
                {newPresetSaving ? 'Saving…' : 'Save Process'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
