const API_BASE = '/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  async request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (res.status === 401) {
      this.setToken(null);
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || `Request failed: ${res.status}`);
    }

    return res.json();
  }

  get(path) { return this.request(path); }
  post(path, body) { return this.request(path, { method: 'POST', body: JSON.stringify(body) }); }
  put(path, body) { return this.request(path, { method: 'PUT', body: JSON.stringify(body) }); }
  patch(path, body) { return this.request(path, { method: 'PATCH', body: JSON.stringify(body) }); }
  delete(path) { return this.request(path, { method: 'DELETE' }); }

  async upload(file) {
    const formData = new FormData();
    formData.append('file', file);
    const headers = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const res = await fetch(`${API_BASE}/upload`, { method: 'POST', headers, body: formData });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  }

  // Auth
  register(data) { return this.post('/auth/register', data); }
  login(data) { return this.post('/auth/login', data); }
  guestToken(employee = {}) { return this.post('/auth/guest-token', employee); }
  getActiveTechnicians() { return this.get('/active-technicians'); }
  getMe() { return this.get('/auth/me'); }
  heartbeat() { return this.post('/auth/heartbeat', {}); }
  getOnlineUsers() { return this.get('/auth/online-users'); }
  getSystemHealth(period = '24H') { return this.get(`/system/health?period=${period}`); }
  updateProfile(data) { return this.patch('/auth/profile', data); }
  updateAvatar(base64) { return this.patch('/auth/profile', { avatar: base64 }); }
  forgotPassword(email, new_password) { return this.post('/auth/forgot-password', { email, new_password }); }
  changePassword(current_password, new_password) { return this.post('/auth/change-password', { current_password, new_password }); }

  // Users
  getUsers() { return this.get('/users'); }
  deleteUser(id) { return this.delete(`/users/${id}`); }
  approveUser(id) { return this.patch(`/users/${id}/approve`, {}); }
  rejectUser(id) { return this.patch(`/users/${id}/reject`, {}); }
  updateUserRole(id, role) { return this.patch(`/users/${id}/role`, { role }); }
  updateUserStatus(id, status) { return this.patch(`/users/${id}/status`, { status }); }
  updateUserUsername(id, username) { return this.patch(`/users/${id}/username`, { username }); }
  toggleBlockUser(id) { return this.patch(`/users/${id}/block`, {}); }
  getLoginLogs() { return this.get('/login-logs'); }
  getTaskManagerStats() { return this.get('/task-manager/stats'); }

  // Role Permissions
  getRolePermissions() { return this.get('/role-permissions'); }
  updateRolePermissions(permissions) { return this.request('/role-permissions', { method: 'PUT', body: JSON.stringify({ permissions }) }); }
  getMyPermissions() { return this.get('/my-permissions'); }

  // Requests
  getRequests(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.get(`/requests${q ? '?' + q : ''}`);
  }
  getRequest(id) { return this.get(`/requests/${id}`); }
  getNextRequestNumber(request_type = 'REL') { return this.get(`/requests/next-number?request_type=${encodeURIComponent(request_type)}`); }
  createRequest(data) { return this.post('/requests', data); }
  updateRequest(id, data) { return this.patch(`/requests/${id}`, data); }
  deleteRequest(id) { return this.delete(`/requests/${id}`); }
  updateStep(requestId, stepNumber, data, leg = 1) {
    return this.patch(`/requests/${requestId}/steps/${stepNumber}?leg=${leg}`, data);
  }
  replaceSteps(requestId, steps, leg = 1) {
    return this.request(`/requests/${requestId}/steps`, {
      method: 'PUT', body: JSON.stringify({ steps, leg })
    });
  }
  addLeg(requestId) { return this.post(`/requests/${requestId}/legs`); }
  duplicateLeg(requestId, sourceLeg) { return this.post(`/requests/${requestId}/legs/${sourceLeg}/duplicate`); }
  removeLeg(requestId, legNumber) { return this.delete(`/requests/${requestId}/legs/${legNumber}`); }
  getStepNames() { return this.get('/step-names'); }

  // Machines
  getMachines() { return this.get('/machines'); }
  addMachine(data) { return this.post('/machines', data); }
  deleteMachine(id) { return this.delete(`/machines/${id}`); }

  // Employees
  getEmployees() { return this.get('/employees'); }
  addEmployee(data) { return this.post('/employees', data); }
  deleteEmployee(id) { return this.delete(`/employees/${id}`); }

  // Request Notes
  updateNote(requestId, note) { return this.patch(`/requests/${requestId}/note`, { note }); }
  deleteNote(requestId) { return this.delete(`/requests/${requestId}/note`); }

  // Planner Estimation (Admin / Planner only)
  updatePlannerEstimation(requestId, data) { return this.put(`/requests/${requestId}/planner-estimation`, data); }

  // Discontinue (Admin / Planner only)
  discontinueRequest(requestId, reason) { return this.post(`/requests/${requestId}/discontinue`, { reason: reason || null }); }

  // Workflow Transitions
  submitReview(id) { return this.post(`/requests/${id}/submit-review`, {}); }
  submitApproval(id) { return this.post(`/requests/${id}/submit-approval`, {}); }
  approveRequest(id) { return this.post(`/requests/${id}/approve`, {}); }
  rejectRequest(id) { return this.post(`/requests/${id}/reject`, {}); }
  completeReport(id, notes) { return this.post(`/requests/${id}/complete-report`, { notes }); }

  // Import
  async importExcel(files) {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    const headers = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const res = await fetch(`${API_BASE}/requests/import`, { method: 'POST', headers, body: formData });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || 'Import failed');
    }
    return res.json();
  }

  async importWord(files) {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    const headers = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const res = await fetch(`${API_BASE}/requests/import-word`, { method: 'POST', headers, body: formData });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || 'Word import failed');
    }
    return res.json();
  }

  async importWhisker(file) {
    const formData = new FormData();
    formData.append('file', file);
    const headers = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const res = await fetch(`${API_BASE}/requests/import-whisker`, { method: 'POST', headers, body: formData });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const text = await res.text();
        const data = JSON.parse(text);
        const detail = data.detail;
        if (typeof detail === 'string' && detail) msg = detail;
        else if (Array.isArray(detail)) msg = detail.map(e => e.msg || JSON.stringify(e)).join('; ');
        else if (detail) msg = JSON.stringify(detail);
        else msg = `HTTP ${res.status}: ${text.slice(0, 200)}`;
      } catch { /* use default msg */ }
      throw new Error(msg || 'Whisker import failed');
    }
    return res.json();
  }

  // Dashboard
  getDashboardStats() { return this.get('/dashboard/stats'); }
  getLoadingUnloading() { return this.get('/loading-unloading'); }
  async exportLoadingUnloading(stepName) {
    const params = stepName && stepName !== 'all' ? `?step_name=${encodeURIComponent(stepName)}` : '';
    const res = await fetch(`/api/loading-unloading/export${params}`, {
      credentials: 'include',
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loading_unloading_${new Date().toISOString().slice(0,10)}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
  getLoadingUnloadingHistory(params) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/loading-unloading/history${qs ? '?' + qs : ''}`);
  }
  getEmployeePerformance(days = 30) {
    return this.get(`/performance/employees?days=${days}`);
  }
  getDailyPerformance(days = 30) {
    return this.get(`/performance/daily?days=${days}`);
  }
  getPublicStats() { return this.get('/public/stats'); }

  // Maintenance
  getMaintenance() { return this.get('/maintenance'); }
  setMaintenance(active, message) { return this.post('/maintenance', { active, message }); }

  // Server Controls (Admin)
  restartBackend() { return this.post('/admin/restart-backend', {}); }
  rebuildFrontend() { return this.post('/admin/rebuild-frontend', {}); }
  getRebuildStatus() { return this.get('/admin/rebuild-frontend/status'); }

  // Settings
  getSettings() { return this.get('/settings'); }
  updateSettings(data) { return this.patch('/settings', data); }
  verifyTechCode(code) { return this.post('/verify-tech-code', { code }); }

  // Backups
  getBackups() { return this.get('/backups'); }
  createBackup() { return this.post('/backups', {}); }
  deleteBackup(filename) { return this.delete(`/backups/${filename}`); }
  getBackupUrl(filename) { return `${API_BASE}/backups/${filename}`; }
  checkBackupStatus() { return this.get('/backups/status/check'); }
  confirmBackupDownload(filename) { return this.post(`/backups/${filename}/confirm-download`, {}); }
  previewBackup(filename) { return this.get(`/backups/${encodeURIComponent(filename)}/preview`); }
  importBackupFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    const headers = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    return fetch(`${API_BASE}/backups/upload-preview`, { method: 'POST', headers, body: formData })
      .then(res => {
        if (res.status === 401) { this.setToken(null); window.location.href = '/login'; throw new Error('Unauthorized'); }
        if (!res.ok) return res.json().catch(() => ({})).then(d => { throw new Error(d.detail || `Upload failed: ${res.status}`); });
        return res.json();
      });
  }

  // Filter-Backups (accessible to Admin + Reliability Engineer)
  getFilterBackups() { return this.get('/filter-backups'); }
  getFilterBackupData(filename) { return this.get(`/filter-backups/${encodeURIComponent(filename)}`); }
  importFilterBackupFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    const headers = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    return fetch(`${API_BASE}/filter-backups/upload-preview`, { method: 'POST', headers, body: formData })
      .then(res => {
        if (res.status === 401) { this.setToken(null); window.location.href = '/login'; throw new Error('Unauthorized'); }
        if (!res.ok) return res.json().catch(() => ({})).then(d => { throw new Error(d.detail || `Upload failed: ${res.status}`); });
        return res.json();
      });
  }

  // Training Masterlist
  getMasterlist() { return this.get('/masterlist'); }
  clearMasterlist() { return this.delete('/masterlist'); }
  addMasterlistRecord(data) { return this.post('/masterlist', data); }
  updateMasterlistRecord(id, data) { return this.put(`/masterlist/${id}`, data); }
  deleteMasterlistRecord(id) { return this.delete(`/masterlist/${id}`); }
  getMasterlistRequests() { return this.get('/masterlist/requests'); }
  updateRequestMasterlistFields(id, data) { return this.patch(`/masterlist/requests/${id}`, data); }
  async uploadMasterlist(file) {
    const formData = new FormData();
    formData.append('file', file);
    const headers = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const res = await fetch(`${API_BASE}/masterlist/upload`, { method: 'POST', headers, body: formData });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || 'Upload failed');
    }
    return res.json();
  }

  // Reports
  async downloadRequestReport(id) {
    const headers = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const res = await fetch(`${API_BASE}/requests/${id}/report`, { headers });
    if (!res.ok) throw new Error(`Report generation failed: ${res.status}`);
    return res.blob();
  }

  async downloadSatReport(id) {
    const headers = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const res = await fetch(`${API_BASE}/requests/${id}/sat-report`, { headers });
    if (!res.ok) throw new Error(`SAT report generation failed: ${res.status}`);
    return res.blob();
  }
}

const api = new ApiClient();
export default api;
