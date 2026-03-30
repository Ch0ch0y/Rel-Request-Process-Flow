import axios from 'axios';

const api = axios.create({ baseURL: '/' });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('ca_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    const url = err.config?.url || '';
    const isAuthEndpoint = url.includes('/api/auth/login') || url.includes('/api/auth/register');
    if (err.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('ca_token');
      localStorage.removeItem('ca_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Named helpers (mirror the REL api.js interface) ─────────────────────
// Auth
api.register         = (data)        => api.post('/api/auth/register', data);
api.heartbeat        = ()            => api.post('/api/auth/heartbeat', {});
api.verifyTechCode   = (code)        => api.post('/api/verify-tech-code', { code }).then(r => r.data);
api.guestToken       = (employee)    => api.post('/api/auth/guest-token', employee || {}).then(r => r.data);
api.getActiveTechnicians = ()         => api.get('/api/active-technicians').then(r => r.data);

// Users
api.getUsers          = ()              => api.get('/api/users').then(r => r.data);
api.deleteUser        = (id)            => api.delete(`/api/users/${id}`).then(r => r.data);
api.approveUser       = (id)            => api.patch(`/api/users/${id}/approve`, {}).then(r => r.data);
api.rejectUser        = (id)            => api.patch(`/api/users/${id}/reject`, {}).then(r => r.data);
api.updateUserRole    = (id, role)      => api.patch(`/api/users/${id}/role`, { role }).then(r => r.data);
api.updateUserStatus  = (id, status)    => api.patch(`/api/users/${id}/status`, { status }).then(r => r.data);
api.updateUserUsername= (id, username)  => api.patch(`/api/users/${id}/username`, { username }).then(r => r.data);
api.toggleBlockUser   = (id)            => api.patch(`/api/users/${id}/block`, {}).then(r => r.data);
api.getLoginLogs      = ()              => api.get('/api/login-logs').then(r => r.data);

// Role Permissions
api.getRolePermissions    = ()          => api.get('/api/role-permissions').then(r => r.data);
api.updateRolePermissions = (perms)     => api.put('/api/role-permissions', { permissions: perms }).then(r => r.data);
api.getMyPermissions      = ()          => api.get('/api/my-permissions').then(r => r.data);

// Requests
api.getRequests        = ()              => api.get('/api/requests').then(r => r.data);
api.approveRequest     = (id, due_date)  => api.post(`/api/requests/${id}/approve`, { due_date }).then(r => r.data);
api.discontinueRequest = (id, reason)    => api.patch(`/api/requests/${id}/discontinue`, { reason }).then(r => r.data);
api.updateRequest      = (id, data)      => api.patch(`/api/requests/${id}`, data).then(r => r.data);

// Backup
api.exportBackup  = ()     => api.get('/api/backup/export', { responseType: 'blob' });
api.importBackup  = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post('/api/backup/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};

export default api;

