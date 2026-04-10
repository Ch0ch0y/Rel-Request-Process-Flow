import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { Trash2, UserPlus, Shield, X, CheckCircle2, XCircle, Clock, ScrollText, Lock, Edit2, Check, Ban, ChevronDown, Users as UsersIcon } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';

const ROLES = ['Admin', 'Reliability Engineer', 'Failure Analysis', 'Technician', 'Planner'];

const roleBadgeColors = {
  'Admin': 'bg-red-100 text-red-700 border-red-200',
  'Reliability Engineer': 'bg-blue-100 text-blue-700 border-blue-200',
  'Failure Analysis': 'bg-purple-100 text-purple-700 border-purple-200',
  'Technician': 'bg-amber-100 text-amber-700 border-amber-200',
  'Planner': 'bg-green-100 text-green-700 border-green-200',
};

// A user is "online" if they sent a heartbeat in the last 5 minutes
function isOnline(lastSeen) {
  if (!lastSeen) return false;
  return (Date.now() - new Date(lastSeen).getTime()) < 5 * 60 * 1000;
}

function formatLastSeen(lastSeen) {
  if (!lastSeen) return 'Never';
  const diffMs = Date.now() - new Date(lastSeen).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return new Date(lastSeen).toLocaleDateString();
}

function AddUserModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ email: '', username: '', password: '', role: 'Technician' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.register(form);
      onCreated();
      onClose();
      setForm({ email: '', username: '', password: '', role: 'Technician' });
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-heading text-lg font-bold text-slate-900">Add User</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        {error && <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Email</label>
            <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Username</label>
            <input type="text" required value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Password</label>
            <input type="password" required value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Role</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm">
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium">Cancel</button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium disabled:opacity-50 shadow-sm">
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const USER_STATUS_OPTIONS = [
  { value: 'approved', label: 'Approved', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'hold',     label: 'Hold',     color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'lock',     label: 'Lock',     color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'declined', label: 'Declined', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  { value: 'pending',  label: 'Pending',  color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
];

function getUserStatusBadge(user) {
  const s = user.user_status || (user.blocked ? 'lock' : user.approved ? 'approved' : 'pending');
  const opt = USER_STATUS_OPTIONS.find(o => o.value === s);
  return opt || USER_STATUS_OPTIONS.find(o => o.value === 'pending');
}

const PERMISSION_LABELS = {
  create_request: 'Create Requests',
  edit_request: 'Edit Rel Information',
  delete_request: 'Delete Requests',
  update_steps: 'Update Step Details',
  manage_steps: 'Add/Remove/Reorder Steps',
  manage_users: 'Manage Users',
  manage_settings: 'Manage Settings',
  import_requests: 'Import from Excel',
  manage_backups: 'Manage Backups',
};

const CONFIGURABLE_ROLES = ['Reliability Engineer', 'Failure Analysis', 'Technician', 'Planner'];

function PermissionsPanel() {
  const [permissions, setPermissions] = useState({});
  const [allPerms, setAllPerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const { loadPermissions } = useAuth();

  useEffect(() => {
    api.getRolePermissions()
      .then(res => {
        setPermissions(res.permissions || {});
        setAllPerms(res.all_permissions || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const togglePerm = (role, perm) => {
    setPermissions(prev => ({
      ...prev,
      [role]: { ...prev[role], [perm]: !prev[role]?.[perm] }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await api.updateRolePermissions(permissions);
      setMessage('Permissions saved successfully!');
      // Reload current user permissions in case they changed
      loadPermissions();
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h3 className="font-heading font-semibold text-slate-800">Role Permissions</h3>
          <p className="text-xs text-slate-400 mt-0.5">Configure what each role can do. Admin always has full access.</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-4 py-2 font-medium text-sm disabled:opacity-50 shadow-sm">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
      {message && (
        <div className={`mx-6 mt-4 p-3 rounded-lg text-sm ${message.startsWith('Error') ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'}`}>
          {message}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500 min-w-[180px]">Permission</th>
              {CONFIGURABLE_ROLES.map(role => (
                <th key={role} className="text-center px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500 min-w-[120px]">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${roleBadgeColors[role] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {role}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {allPerms.map(perm => (
              <tr key={perm} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-3 text-sm text-slate-700 font-medium">
                  {PERMISSION_LABELS[perm] || perm}
                </td>
                {CONFIGURABLE_ROLES.map(role => (
                  <td key={role} className="px-4 py-3 text-center">
                    <button
                      onClick={() => togglePerm(role, perm)}
                      className={`w-9 h-5 rounded-full transition-colors relative ${
                        permissions[role]?.[perm]
                          ? 'bg-emerald-500'
                          : 'bg-slate-200'
                      }`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        permissions[role]?.[perm] ? 'translate-x-4' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loginLogs, setLoginLogs] = useState([]);
  const [activeTechnicians, setActiveTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [activeTab, setActiveTab] = useState('users');
  const [editingRole, setEditingRole] = useState(null); // userId being edited
  const [tempRole, setTempRole] = useState(''); // temporary role value while editing
  const [editingUsername, setEditingUsername] = useState(null); // userId being edited
  const [tempUsername, setTempUsername] = useState(''); // temporary username value
  const [blockConfirm, setBlockConfirm] = useState(null); // { id, blocked, username }
  const [editingStatus, setEditingStatus] = useState(null); // userId
  const [tempStatus, setTempStatus] = useState('');
  const { user: currentUser, hasRole, hasPerm } = useAuth();
  const isAdmin = hasRole('Admin');
  const canManageUsers = hasPerm('manage_users');
  const [viewingAvatar, setViewingAvatar] = useState(null);

  const loadUsers = (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    api.getUsers()
      .then(setUsers)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  const loadLogs = () => {
    api.getLoginLogs()
      .then(setLoginLogs)
      .catch(() => {});
  };

  const loadActiveTechnicians = () => {
    api.getActiveTechnicians()
      .then(data => setActiveTechnicians(data.technicians || []))
      .catch(() => {});
  };

  useEffect(() => {
    loadUsers(true);
    if (isAdmin) { loadLogs(); loadActiveTechnicians(); }
    // Refresh user list every 30s to keep online status current
    const interval = setInterval(() => { loadUsers(false); if (isAdmin) loadActiveTechnicians(); }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (userId) => {
    if (userId === currentUser?.id) {
      alert("You can't delete your own account.");
      return;
    }
    setDeleteConfirm(userId);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.deleteUser(deleteConfirm);
      loadUsers(false);
    } catch (err) { alert(err.message); }
    setDeleteConfirm(null);
  };

  const handleApprove = async (userId) => {
    try { await api.approveUser(userId); loadUsers(false); } catch (err) { alert(err.message); }
  };

  const handleReject = async (userId) => {
    try { await api.rejectUser(userId); loadUsers(false); } catch (err) { alert(err.message); }
  };

  const handleEditRole = (userId, currentRole) => {
    setEditingRole(userId);
    setTempRole(currentRole);
  };

  const handleRoleChange = async (userId) => {
    try {
      await api.updateUserRole(userId, tempRole);
      setEditingRole(null);
      loadUsers(false);
    } catch (err) {
      alert(err.message);
      setEditingRole(null);
    }
  };

  const handleCancelRoleEdit = () => {
    setEditingRole(null);
    setTempRole('');
  };

  const handleEditStatus = (userId, currentStatus) => {
    setEditingStatus(userId);
    setTempStatus(currentStatus || 'pending');
  };

  const handleStatusChange = async (userId) => {
    try {
      await api.updateUserStatus(userId, tempStatus);
      setEditingStatus(null);
      loadUsers(false);
    } catch (err) {
      alert(err.message);
      setEditingStatus(null);
    }
  };

  const handleCancelStatusEdit = () => {
    setEditingStatus(null);
    setTempStatus('');
  };

  const handleEditUsername = (userId, currentUsername) => {
    setEditingUsername(userId);
    setTempUsername(currentUsername);
  };

  const handleUsernameChange = async (userId) => {
    if (!tempUsername.trim()) return;
    try {
      await api.updateUserUsername(userId, tempUsername.trim());
      setEditingUsername(null);
      loadUsers(false);
    } catch (err) {
      alert(err.message);
      setEditingUsername(null);
    }
  };

  const handleCancelUsernameEdit = () => {
    setEditingUsername(null);
    setTempUsername('');
  };

  const handleToggleBlock = async () => {
    if (!blockConfirm) return;
    try {
      await api.toggleBlockUser(blockConfirm.id);
      loadUsers(false);
    } catch (err) { alert(err.message); }
    setBlockConfirm(null);
  };

  return (
    <div className="space-y-6 stagger-children">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-5 shadow-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h1 className="text-xl font-heading font-bold text-slate-900 dark:text-white tracking-tight">Users</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage user accounts, approvals, and activity logs.</p>
            </div>
          </div>
          {canManageUsers && (
            <button onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg px-3.5 py-2 font-medium text-sm shadow-sm hover:shadow-md transition-all">
              <UserPlus className="w-4 h-4" /> Add User
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      {isAdmin && (
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 w-fit">
          <button onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
            Users
          </button>
          <button onClick={() => setActiveTab('permissions')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${activeTab === 'permissions' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
            <Lock className="w-3.5 h-3.5" /> Permissions
          </button>
          <button onClick={() => { setActiveTab('logs'); loadLogs(); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${activeTab === 'logs' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
            <ScrollText className="w-3.5 h-3.5" /> Login Logs
          </button>
          <button onClick={() => { setActiveTab('technicians'); loadActiveTechnicians(); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${activeTab === 'technicians' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
            <UsersIcon className="w-3.5 h-3.5" /> Active Technicians
            {activeTechnicians.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold">{activeTechnicians.length}</span>
            )}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      ) : activeTab === 'users' ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-hidden">
          <div>
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">User</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Role</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Online</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Created</th>
                <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div
                          className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold uppercase ${u.blocked ? 'bg-red-100 text-red-500' : 'bg-slate-200 text-slate-600'} ${u.avatar ? 'cursor-pointer ring-1 ring-transparent hover:ring-blue-400 transition-all' : ''}`}
                          onClick={() => u.avatar && setViewingAvatar({ src: u.avatar, name: u.username })}
                          title={u.avatar ? 'Click to view photo' : undefined}
                        >
                          {u.avatar
                            ? <img src={u.avatar} alt={u.username} className="w-full h-full object-cover" />
                            : (u.username?.[0] || '?')
                          }
                        </div>
                        {isOnline(u.last_seen) && !u.blocked && (
                          <span className="absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                        )}
                      </div>
                      {editingUsername === u.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={tempUsername}
                            onChange={e => setTempUsername(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleUsernameChange(u.id); if (e.key === 'Escape') handleCancelUsernameEdit(); }}
                            className="border border-slate-300 rounded-lg px-2 py-1 text-xs w-28 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            autoFocus
                          />
                          <button onClick={() => handleUsernameChange(u.id)} className="p-1 rounded hover:bg-emerald-50 text-emerald-600" title="Save"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={handleCancelUsernameEdit} className="p-1 rounded hover:bg-slate-100 text-slate-400" title="Cancel"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className={`text-sm font-medium ${u.blocked ? 'text-red-500 line-through' : 'text-slate-800 dark:text-slate-100'}`}>{u.username}</span>
                          {isAdmin && (
                            <button onClick={() => handleEditUsername(u.id, u.username)} className="p-0.5 rounded hover:bg-slate-100 text-slate-300 hover:text-slate-600" title="Edit username">
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">{u.email}</td>
                  <td className="px-4 py-4">
                    {editingRole === u.id ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={tempRole}
                          onChange={(e) => setTempRole(e.target.value)}
                          className="border border-slate-300 rounded-lg px-2 py-1 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          autoFocus
                        >
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <button
                          onClick={() => handleRoleChange(u.id)}
                          className="p-1 rounded hover:bg-emerald-50 text-emerald-600"
                          title="Save"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelRoleEdit}
                          className="p-1 rounded hover:bg-slate-100 text-slate-400"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleBadgeColors[u.role] || roleBadgeColors['Planner']}`}>
                          <Shield className="w-3 h-3 mr-1" />
                          {u.role}
                        </span>
                        {isAdmin && (
                          <button
                            onClick={() => handleEditRole(u.id, u.role)}
                            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                            title="Edit role"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {editingStatus === u.id ? (
                      <div className="flex items-center gap-1.5">
                        <select
                          value={tempStatus}
                          onChange={e => setTempStatus(e.target.value)}
                          className="border border-slate-300 rounded-lg px-2 py-1 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          autoFocus
                        >
                          {USER_STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <button onClick={() => handleStatusChange(u.id)} className="p-1 rounded hover:bg-emerald-50 text-emerald-600" title="Save"><Check className="w-3.5 h-3.5" /></button>
                        <button onClick={handleCancelStatusEdit} className="p-1 rounded hover:bg-slate-100 text-slate-400" title="Cancel"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {(() => { const badge = getUserStatusBadge(u); return (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${badge.color}`}>
                            {badge.value === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                            {badge.value === 'hold' && <Clock className="w-3 h-3" />}
                            {badge.value === 'lock' && <Lock className="w-3 h-3" />}
                            {badge.value === 'declined' && <XCircle className="w-3 h-3" />}
                            {badge.value === 'pending' && <Clock className="w-3 h-3" />}
                            {badge.label}
                          </span>
                        ); })()}
                        {isAdmin && u.id !== currentUser?.id && (
                          <button onClick={() => handleEditStatus(u.id, getUserStatusBadge(u).value)} className="p-0.5 rounded hover:bg-slate-100 text-slate-300 hover:text-slate-600" title="Edit status">
                            <Edit2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {isOnline(u.last_seen) ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        Online
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-400" title={u.last_seen ? new Date(u.last_seen).toLocaleString() : 'Never logged in'}>
                        <span className="inline-flex rounded-full h-2 w-2 bg-slate-300"></span>
                        {formatLastSeen(u.last_seen)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-400">
                    <div>{new Date(u.created_at).toLocaleDateString()}</div>
                    <div className="text-xs text-slate-400">{new Date(u.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {isAdmin && !u.approved && !u.blocked && (
                        <button onClick={() => handleApprove(u.id)} title="Approve"
                          className="p-1.5 rounded hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors">
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      {isAdmin && u.approved && u.id !== currentUser?.id && !u.blocked && (
                        <button onClick={() => handleReject(u.id)} title="Revoke Approval"
                          className="p-1.5 rounded hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors">
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                      {isAdmin && u.id !== currentUser?.id && (
                        <button
                          onClick={() => setBlockConfirm({ id: u.id, blocked: u.blocked, username: u.username })}
                          title={u.blocked ? 'Unblock user' : 'Block user'}
                          className={`p-1.5 rounded transition-colors ${
                            u.blocked
                              ? 'hover:bg-emerald-50 text-red-400 hover:text-emerald-600'
                              : 'hover:bg-red-50 text-slate-300 hover:text-red-500'
                          }`}
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                      {isAdmin && u.id !== currentUser?.id && (
                        <button onClick={() => handleDelete(u.id)} title="Delete"
                          className="p-1.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {users.length === 0 && (
            <p className="text-center py-8 text-slate-400">No users found.</p>
          )}
        </div>
      ) : activeTab === 'permissions' ? (
        <PermissionsPanel />
      ) : activeTab === 'logs' ? (
        /* Login Logs Tab */
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">User</th>
                <th className="text-left px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Email</th>
                <th className="text-left px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Role</th>
                <th className="text-left px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Employee</th>
                <th className="text-left px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Login Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loginLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">
                        {log.username?.[0] || '?'}
                      </div>
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{log.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400">{log.email}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${roleBadgeColors[log.role] || roleBadgeColors['Planner']}`}>
                      {log.role}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    {log.employee_name ? (
                      <div>
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{log.employee_name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{log.employee_id}</div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400">
                    {new Date(log.login_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loginLogs.length === 0 && (
            <p className="text-center py-8 text-slate-400">No login records yet.</p>
          )}
        </div>
      ) : (
        /* Active Technicians Tab */
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h3 className="font-heading font-semibold text-slate-800 dark:text-white">Active Technician Sessions</h3>
              <p className="text-xs text-slate-400 mt-0.5">Technicians currently logged in (active within last 5 minutes).</p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              {activeTechnicians.length} Online
            </span>
          </div>
          {activeTechnicians.length === 0 ? (
            <p className="text-center py-10 text-slate-400">No technicians are currently active.</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Technician</th>
                  <th className="text-left px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Employee ID</th>
                  <th className="text-left px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Position</th>
                  <th className="text-left px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Session Started</th>
                  <th className="text-left px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {activeTechnicians.map((tech, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-xs font-bold text-amber-700 dark:text-amber-300">
                            {tech.employee_name?.[0] || 'T'}
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-800" />
                        </div>
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{tech.employee_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400">{tech.employee_id}</td>
                    <td className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400">{tech.employee_position || '—'}</td>
                    <td className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400">{tech.login_at ? new Date(tech.login_at).toLocaleString() : '—'}</td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        Online
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      )}

      <AddUserModal open={showAdd} onClose={() => setShowAdd(false)} onCreated={() => loadUsers(false)} />
      <ConfirmDialog
        open={!!deleteConfirm}
        title="Delete User"
        message="Are you sure you want to permanently delete this user account? This action cannot be undone."
        confirmLabel="Delete User"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
      <ConfirmDialog
        open={!!blockConfirm}
        title={blockConfirm?.blocked ? 'Unblock User' : 'Block User'}
        message={
          blockConfirm?.blocked
            ? `Unblock "${blockConfirm?.username}"? They will be able to log in again.`
            : `Block "${blockConfirm?.username}"? They will immediately lose access and cannot log in.`
        }
        confirmLabel={blockConfirm?.blocked ? 'Unblock' : 'Block User'}
        onConfirm={handleToggleBlock}
        onCancel={() => setBlockConfirm(null)}
      />

      {/* Avatar lightbox */}
      {viewingAvatar && (
        <div
          className="fixed inset-0 z-[9999] bg-black/75 flex flex-col items-center justify-center gap-4"
          onClick={() => setViewingAvatar(null)}
        >
          <img
            src={viewingAvatar.src}
            alt={viewingAvatar.name}
            className="w-52 h-52 rounded-full object-cover shadow-2xl ring-4 ring-white/20"
            onClick={e => e.stopPropagation()}
          />
          {viewingAvatar.name && (
            <p className="text-white text-sm font-semibold tracking-wide">{viewingAvatar.name}</p>
          )}
          <p className="text-white/50 text-xs">Click anywhere to close</p>
          <button
            onClick={() => setViewingAvatar(null)}
            className="absolute top-4 right-4 w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
