# REL Request Process Flow - Complete Application Analysis

**Document Purpose**: Comprehensive blueprint for replicating this web application into a desktop Electron app.

---

## 1. PROJECT OVERVIEW

**Application Name**: REL Request Process Flow  
**Purpose**: Manage reliability (REL) test requests for semiconductor packages through a multi-stage workflow  
**Target Users**: Reliability Engineers, Failure Analysis engineers, Technicians, Planners, Administrators  
**Tech Stack**: React 18 + FastAPI + SQLite + JWT

---

## 2. USER ROLES & ROLE-BASED ACCESS CONTROL (RBAC)

### 2.1 Available Roles
1. **Admin** - Full system access, manages users and settings
2. **Reliability Engineer** - Creates requests, updates steps, imports data
3. **Failure Analysis** - Limited permissions (FA-specific tasks)
4. **Technician** - Can only update process steps (guest login optional)
5. **Planner** - Can update steps and manage scheduling

### 2.2 Permissions Matrix
```
Permission              | Reliability | Failure Analysis | Technician | Planner | Admin
create_request          | ✓           | ✗                | ✗          | ✗       | ✓
edit_request            | ✓           | ✗                | ✗          | ✗       | ✓
delete_request          | ✓           | ✗                | ✗          | ✗       | ✓
update_steps            | ✓           | ✗                | ✓          | ✓       | ✓
manage_steps            | ✓           | ✗                | ✗          | ✗       | ✓
manage_users            | ✗           | ✗                | ✗          | ✗       | ✓
manage_settings         | ✗           | ✗                | ✗          | ✗       | ✓
import_requests         | ✓           | ✗                | ✗          | ✗       | ✓
manage_backups          | ✗           | ✗                | ✗          | ✗       | ✓
```

### 2.3 User Status Workflow
- **pending** - New registration, awaiting admin approval
- **approved** - Active user account
- **hold** - Temporarily disabled
- **lock** - Blocked by admin
- **declined** - Rejected registration

---

## 3. PAGES & FEATURES

### 3.1 Authentication Pages
- **Login.jsx** - User login with email/password, role-based registration, technician guest access with auth code
- **Features**: Math CAPTCHA, password reset link, technician tech-code authentication (735522 default)

### 3.2 Dashboard Pages
- **Dashboard.jsx** - Main landing page with workflow visualization
  - Real-time stats: pending, review, approval, testing, analysis, completed requests
  - Workflow stage cards showing request counts
  - Hold requests tracking
  - Delayed requests (past deadline)
  - Upcoming deadlines (15-day window)
  - Process step progress charts (SAT, BAKE, HTS, etc.)
  - Recent activity log
  
- **TechnicianDashboard.jsx** - Simplified view for Technician role
  - Guest technician access
  - Active step assignments
  - Quick-access step updates

### 3.3 Request Management Pages
- **Requests.jsx** - List all requests with filtering and sorting
  - Filter by status: pending, review, approval, testing, analysis, completed, hold, discontinued
  - Search by request number, device name, customer
  - Bulk operations

- **MyRequests.jsx** - Requests created by current user
  - Personal request tracking
  - Quick actions (edit, view, delete)

- **CompletedRequests.jsx** - Archive/completed requests view
  - Export capabilities
  - Retention details view

- **RequestDetail.jsx** - Full request detail and step management
  - Request header info (device_name, customer, pkg_info, etc.)
  - Process steps table with status tracking
  - Attachment management per step
  - Notes and analysis fields
  - Discontinuation workflow

### 3.4 Workflow & Approval Pages
- **ApprovalPage.jsx** - Request approval workflow
  - Review stage management
  - Approval stage authorization
  - Rejection with comments
  - Submit for review/approval endpoints

### 3.5 Analysis & Monitoring Pages
- **ProcessMonitoring.jsx** - Real-time process step monitoring
  - Step status distribution
  - Machine assignment tracking
  - Queue visualization
  - Hold/blocked requests

- **PerformanceMonitor.jsx** - System performance metrics
  - CPU/Memory usage
  - Throughput (requests/hour)
  - Success rates
  - Uptime tracking
  - Active tests count

- **RetentionMonitor.jsx** - Data retention & analysis fields
  - Retention details form
  - Analysis notes
  - Long-term tracking data

- **SATSonoscan.jsx** - SAT (Surface Acoustic Wave) test reporting
  - SAT-specific test results
  - Data file uploads
  - Report generation

### 3.6 Administration Pages
- **Users.jsx** - User management interface
  - Approve/reject new users
  - Block/unblock accounts
  - Edit user roles and profiles
  - View login history
  - Online users tracking

- **Settings.jsx** - Application configuration
  - App name, logo, company info
  - Process step presets
  - Custom fields configuration
  - Tech auth code management
  - System health dashboard
  - Backup management

### 3.7 Specialty Pages
- **MasterlistPage.jsx** - Masterlist management (planning/scheduling)
  - Import masterlist data
  - Weekly workload planning
  - Estimated dates and legs
  - Recommit tracking

- **Presentation.jsx** - Report generation and presentation
  - PowerPoint export
  - Results compilation
  - Professional formatting

- **BackupViewer.jsx** - Database backup management
  - Backup history
  - Download/restore backups
  - Critical backup alerts

- **TaskManager.jsx** - System task tracking (Admin)
  - Online users
  - Recent requests
  - Recent edits
  - Status counts
  - Login history

- **ICMappingTool.jsx** - Integrated Circuit mapping utility
  - IC pinout mapping
  - Component location data

- **LoadingUnloading.jsx** - Test carrier management
  - Loading/unloading tracking
  - Tray management

- **RelMon.jsx** - REL monitoring dashboard (specific to P3 REL operations)
  - Real-time monitoring sheets
  - Site-specific data

---

## 4. DATABASE TABLES & SCHEMA

### 4.1 Core Tables

**users**
```
id (PK, UUID)
email (UNIQUE)
username
password (bcrypt hashed)
role (Admin, Reliability Engineer, Failure Analysis, Technician, Planner)
approved (0/1)
created_at
position
contact_email
plant
manager
last_seen (heartbeat for online status)
blocked (0/1)
user_status (pending/approved/hold/lock/declined)
avatar (base64 encoded profile picture)
security_question, security_answer
declined_at
```

**requests** (primary REL request table)
```
id (PK, UUID)
request_number (UNIQUE)
request_type (REL, CA, etc.)
classification
originator
plant
device_name
lot_no
customer
pkg_info
automotive (0/1)
date_ltc
product_hierarchy
pdl (Product Description Language)
body_size_x, body_size_y, package_thickness
ball_pitch, ball_count
lead_pitch, lead_count
total_ss
purpose
engineer_special_instruction
deadline
created_by, created_by_username
created_at, updated_at
status (pending, review, approval, testing, in_progress, analysis, completed, hold, discontinued)
current_step
note
retention_details (JSON)
analysis_notes
approved_at
last_opened_at
planner_est_start, planner_est_end, planner_note
discontinued_at, discontinued_by, discontinued_reason
original_rr_number
rrs_no (Reliability Request Sheet number)
priority (0/1)
test_matrix_json (multi-leg test matrix)
ww (work week)
lc_bc (lifecycle/business case)
test_level
ml_qty (masterlist qty)
num_days
num_legs
recommit
```

**process_steps** (workflow steps within a request)
```
id (PK, auto-increment)
request_id (FK → requests.id)
leg (1-based, for multi-leg testing)
step_number
step_name (e.g., "Incoming Inspection", "Visual", "SAT", "BAKE", "HTS")
status (pending, in_progress, completed, failed, hold)
started_at (ISO datetime)
completed_at (ISO datetime)
machine_no (e.g., "RSS-003" for SAT equipment)
rack_no
operator_id
tray_no
qty_in, qty_out
notes
attachments (JSON: {category: [files...]})
custom_fields (JSON)
priority
updated_by
UNIQUE(request_id, leg, step_number) - triggers for data cleanup
```

**login_logs**
```
id (PK, auto-increment)
user_id
email
username
role
login_at
ip_address
employee_id (for guest technicians)
employee_name (for guest technicians)
```

**machines** (Equipment list)
```
id (PK, auto-increment)
machine_no (e.g., "RXN-001")
description (e.g., "3D XRAY")
[Pre-populated with ~80 standard machines]
```

**employees** (Staff directory)
```
id (PK, employee ID like "947241")
name
position (e.g., "Sr. Rel Engr", "FA ES P3")
[Pre-populated with ~35 default employees]
```

**settings** (App configuration, singleton)
```
id (PK, 1)
app_name
app_logo
company_name
contact_email
process_steps (JSON array)
process_presets (JSON)
custom_fields (JSON)
tech_auth_code (default: "735522")
updated_at
```

**role_permissions** (Granular RBAC)
```
role
permission (create_request, edit_request, delete_request, update_steps, manage_steps, manage_users, manage_settings, import_requests, manage_backups)
granted (0/1)
PK(role, permission)
```

**backup_tracking** (Backup management, singleton)
```
id (PK, 1)
last_critical_backup_at
last_backup_request_count
critical_backup_required (0/1)
last_backup_downloaded (0/1)
```

**relmon_sheet_data** (REL monitoring sheets)
```
site
sheet
rows_json
merges_json
form_json (JSON)
created_at, updated_at
updated_by
PK(site, sheet)
```

**masterlist_2026** (Planning/scheduling masterlist)
```
id (PK)
ww (work week)
date_received
rrs_no
purpose
qual_type
customer
pkg_type
lc_bc
rr_agile_no
test_level
qty
num_days
num_legs
est_start, est_completion
recommit
planner_remarks
uploaded_at
```

**technician_sessions** (Guest technician tracking)
```
employee_id (PK)
employee_name
employee_position
last_active
login_at
```

---

## 5. AUTHENTICATION & AUTHORIZATION FLOW

### 5.1 Authentication Methods

**1. Standard Login** (Email + Password)
```
POST /api/auth/login
Request: {email: string, password: string}
Response: {access_token, token_type, user: {id, email, username, role, approved, ...}}
```
- Bcrypt password verification
- JWT token issued (24-hour expiry)
- Login logged to login_logs table
- Checks user.approved status before issuing token

**2. Guest (Technician) Login** (No credentials, auth code based)
```
POST /api/auth/guest-token
Request: {employee_id: string, employee_name: string, employee_position: string}
Response: {access_token (short-lived), user: {id: "guest", role: "Technician", is_guest: true, ...}}
```
- No password required
- Requires tech code verification (735522)
- Creates technician_sessions entry
- Limited to step update operations only

**3. Registration**
```
POST /api/auth/register
Request: {email, username, password, role}
Response: User object
```
- New users start with approved=0 (pending)
- Requires admin approval via PATCH /users/{id}/status

### 5.2 Authorization System

**Role-Based Access Control (Decorator: @require_role)**
```python
@api_router.post("/requests")
async def create_request(
    current_user: User = Depends(require_permission('create_request'))
):
    # Checks if user has explicit permission
```

**Permission-Based Access Control (Decorator: @require_permission)**
```python
@api_router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    # Checks if user role matches allowed roles
```

### 5.3 Token Verification
- Every request checks JWT in Authorization header: `Bearer <token>` or httpOnly cookie
- Expired tokens return 401 Unauthorized
- Missing tokens redirect to login

### 5.4 Password Reset Flow
```
1. POST /api/auth/request-reset (email) → issues one-time reset token (15 min validity)
2. POST /api/auth/forgot-password (token, new_password) → resets password
3. POST /api/auth/change-password (current, new) → authenticated user password change
```

---

## 6. API ENDPOINTS (Complete List)

### 6.1 Authentication Endpoints
| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | /api/auth/register | Register new user | None |
| POST | /api/auth/login | User login | None |
| POST | /api/auth/guest-token | Technician guest login | None |
| GET | /api/auth/me | Get current user profile | Required |
| PATCH | /api/auth/profile | Update user profile | Required |
| POST | /api/auth/heartbeat | Send alive signal (60s) | Required |
| GET | /api/auth/online-users | Get users online (2min window) | Required |
| POST | /api/auth/request-reset | Request password reset token | None |
| POST | /api/auth/forgot-password | Reset password with token | None |
| POST | /api/auth/change-password | Change password (authenticated) | Required |

### 6.2 User Management Endpoints
| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | /api/users | List all users | Required |
| DELETE | /api/users/{user_id} | Delete user (pending/hold/lock only) | manage_users |
| PATCH | /api/users/{user_id}/status | Update user status | Admin |
| PATCH | /api/users/{user_id}/approve | Approve user registration | Admin |
| PATCH | /api/users/{user_id}/reject | Reject user approval | Admin |
| PATCH | /api/users/{user_id}/role | Change user role | Admin |
| PATCH | /api/users/{user_id}/username | Change username | Admin |
| PATCH | /api/users/{user_id}/block | Block/unblock user | Admin |
| GET | /api/login-logs | Get login history (last 200) | Admin |
| GET | /api/active-technicians | Get active guest technicians (5min) | Required |

### 6.3 Request Management Endpoints
| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | /api/requests | Create new request | create_request |
| GET | /api/requests | List requests (with filters) | Required |
| GET | /api/requests/{request_id} | Get full request details | Required |
| PATCH | /api/requests/{request_id} | Update request metadata | edit_request |
| PATCH | /api/requests/{request_id}/priority | Set request priority | edit_request |
| PATCH | /api/requests/{request_id}/note | Add/update request note | edit_request |
| DELETE | /api/requests/{request_id}/note | Delete request note | edit_request |
| DELETE | /api/requests/{request_id} | Delete request (pending/hold) | delete_request |
| POST | /api/requests/{request_id}/submit-review | Move to review stage | Required |
| POST | /api/requests/{request_id}/submit-approval | Move to approval stage | Required |
| POST | /api/requests/{request_id}/approve | Approve request | Required |
| POST | /api/requests/{request_id}/reject | Reject request | Required |
| POST | /api/requests/{request_id}/discontinue | Discontinue request | edit_request |
| POST | /api/requests/{request_id}/complete-report | Mark as completed | Required |

### 6.4 Process Step Endpoints
| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| PATCH | /api/requests/{request_id}/steps/{step_number} | Update step (status, date, notes) | update_steps |
| PUT | /api/requests/{request_id}/steps | Replace all steps for request | manage_steps |
| POST | /api/requests/{request_id}/legs | Add new leg (for multi-leg tests) | manage_steps |
| POST | /api/requests/{request_id}/legs/{leg}/duplicate | Duplicate a leg | manage_steps |
| DELETE | /api/requests/{request_id}/legs/{leg_number} | Delete a leg | manage_steps |

### 6.5 Planning Endpoints
| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| PATCH | /api/requests/{request_id}/planner-estimation | Set planner dates/notes | Required |
| PUT | /api/requests/{request_id}/planner-estimation | Update planner estimates | Required |

### 6.6 Reporting & Analytics
| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | /api/dashboard/stats | Get dashboard statistics | Required |
| GET | /api/process-monitoring | Get process step distribution | Required |
| GET | /api/requests/{request_id}/report | Generate detailed report | Required |
| GET | /api/requests/{request_id}/sat-report | Generate SAT-specific report | Required |
| GET | /api/requests/{request_id}/ltc | Get LTC (Long Term Cycling) data | Required |
| GET | /api/reports/steps | Get step-level report data | Required |
| GET | /api/reports/presentation | Get presentation-ready data | Required |
| GET | /api/reports/employee-performance | Get employee performance metrics | Required |

### 6.7 Import Endpoints
| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | /api/requests/import | Import from Excel | import_requests |
| POST | /api/requests/import-word | Import from Word document | import_requests |
| POST | /api/requests/import-whisker | Import from Whisker tool export | import_requests |
| POST | /api/requests/import-agile/preview | Preview Agile import | import_requests |
| POST | /api/requests/import-agile | Execute Agile import | import_requests |

### 6.8 File Upload
| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | /api/upload | Upload attachment to step | Required |

### 6.9 Backup Management
| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | /api/backups | Create backup | manage_backups |
| GET | /api/backups | List backups | Required |
| GET | /api/backups/{filename} | Download backup | Required |
| POST | /api/backups/{filename}/confirm-download | Confirm backup download | Required |
| GET | /api/backups/{filename}/preview | Preview backup contents | Required |
| POST | /api/backups/upload-preview | Preview uploaded backup | Required |
| GET | /api/backups/status/check | Get backup status | Required |
| DELETE | /api/backups/{filename} | Delete backup | manage_backups |
| GET | /api/filter-backups | List filtered backups | Required |
| GET | /api/filter-backups/{filename} | Download filtered backup | Required |
| POST | /api/filter-backups/upload-preview | Preview filtered backup | Required |

### 6.10 Masterlist Management
| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | /api/masterlist/upload | Upload masterlist | Required |
| GET | /api/masterlist | Get masterlist records | Required |
| GET | /api/masterlist/requests | Get requests linked to masterlist | Required |
| POST | /api/masterlist | Create masterlist record | Required |
| PUT | /api/masterlist/{record_id} | Update masterlist record | Required |
| DELETE | /api/masterlist/{record_id} | Delete masterlist record | Required |
| PATCH | /api/masterlist/requests/{request_id} | Link request to masterlist | Required |
| DELETE | /api/masterlist | Clear masterlist | Required |

### 6.11 Configuration Endpoints
| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | /api/settings | Get app settings | Required |
| PATCH | /api/settings | Update settings | manage_settings |
| GET | /api/step-names | Get available step names | Required |
| GET | /api/step-catalog | Get step templates catalog | Required |
| PATCH | /api/step-catalog | Update step catalog | manage_settings |
| POST | /api/process-presets | Create process preset | manage_settings |
| DELETE | /api/process-presets/{preset_id} | Delete preset | manage_settings |

### 6.12 Admin/System Endpoints
| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | /api/task-manager/stats | Get system stats (online users, requests) | Admin |
| GET | /api/system/health | Get system health metrics | Admin |
| GET | /api/role-permissions | Get role permissions matrix | Required |
| PUT | /api/role-permissions | Update role permissions | Admin |
| GET | /api/maintenance | Get maintenance mode status | Required |
| POST | /api/maintenance | Toggle maintenance mode | Admin |
| POST | /api/admin/restart-backend | Restart backend server | Admin |

### 6.13 Reference Data
| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | /api/employees | List employees | Required |
| POST | /api/employees | Add employee | Required |
| DELETE | /api/employees/{emp_id} | Delete employee | Required |
| GET | /api/machines | List equipment/machines | Required |
| POST | /api/machines | Add machine | Required |
| DELETE | /api/machines/{machine_id} | Delete machine | Required |
| GET | /api/requests/next-number | Get next request number | Required |
| GET | /api/requests/rrs-suggestions | Get RRS number suggestions | Required |

### 6.14 Public/Utility Endpoints
| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | /api/public/stats | Get public stats (user count) | None |
| POST | /api/verify-tech-code | Verify technician auth code | None |
| POST | /api/my-permissions | Get current user permissions | Required |
| GET | /api/ | Health check | None |

---

## 7. REQUEST WORKFLOW & STATUSES

### 7.1 Request Lifecycle
```
pending → review → approval → testing/in_progress → analysis → completed
                                                        ↓
                                                    discontinued (optional)
                        ↓ (rejected at any stage)
                        hold
```

### 7.2 Status Definitions
- **pending** - Initial state, awaiting first review
- **review** - Technical review in progress
- **approval** - Management approval stage
- **testing** / **in_progress** - Active test execution (process steps running)
- **analysis** - Post-test analysis phase
- **completed** - Final report generated
- **hold** - Blocked/on pause
- **discontinued** - Cancelled request

### 7.3 Process Steps (Default)
Per DEFAULT_STEPS in server.py, typical steps include:
- Incoming Inspection
- Visual
- SAT (Surface Acoustic Wave)
- BAKE
- HTS (High Temperature Storage)
- Analysis
- Report

Can be customized per request via custom_steps parameter.

### 7.4 Multi-Leg Support
- Requests can have multiple "legs" (test repetitions)
- Each leg has independent process_steps tracking
- Stored in process_steps.leg column (1-based)
- Can duplicate legs or add new ones

---

## 8. KEY FEATURES & SPECIAL WORKFLOWS

### 8.1 File Upload & Attachment Management
```
POST /api/upload (FormData: file, step_id, category)
- Saves to backend/uploads/ directory
- Attachments stored as JSON in process_steps.attachments
- Categories: images, documents, test_data, reports, etc.
```

### 8.2 Data Import Capabilities
1. **Excel Import** - Import from .xlsx files with request template
2. **Word Import** - Parse .docx documents for request data
3. **Whisker Import** - Import from Whisker tool export files
4. **Agile Import** - Import Agile test matrices with preview

### 8.3 Backup & Restore
- Auto-backup on critical events
- Manual backup creation (POST /api/backups)
- Full database export in ZIP format
- Critical backup warning system
- Filtered backups (subset of data)

### 8.4 Reporting & Export
- PowerPoint report generation (python-pptx)
- Excel export of requests with customizable columns
- PDF-ready HTML reports
- SAT-specific test reports
- Employee performance analytics
- Step completion statistics

### 8.5 Search & Filtering
- Filter by: status, date range, customer, device_name, plant
- Full-text search on request numbers and metadata
- Saved filter views

### 8.6 Real-Time Monitoring
- Heartbeat endpoint (60s interval) tracks online users
- Process step progress visualization
- Active technician tracking
- Queue depth monitoring

### 8.7 Technician Guest Access
- No login required for technicians
- Requires 6-digit auth code (735522 by default)
- Provides short-lived JWT token
- Limited to step updates only
- Tracked separately in technician_sessions table

### 8.8 Masterlist Planning
- Import masterlist for capacity planning
- Link requests to masterlist entries
- Track work weeks, estimated dates
- Multiple legs planning
- Recommitment tracking

---

## 9. FRONTEND COMPONENTS & STATE MANAGEMENT

### 9.1 Key Components
- **Sidebar** - Navigation menu (role-aware)
- **Layout** - Main layout wrapper
- **CreateRequestModal** - Request creation form
- **ConfirmDialog** - Generic confirmation dialogs
- **ImportExcelModal** - Excel import dialog
- **ImportWordModal** - Word import dialog
- **ImportWhiskerModal** - Whisker import dialog
- **ImportAgileModal** - Agile import dialog
- **CriticalBackupModal** - Backup alerts
- **TechnicianSelectModal** - Technician selection for guest login
- **EmployeeSelect** - Employee picker component
- **MachineSelect** - Machine/equipment picker
- **BoxLocationSelector** - IC location mapping UI
- **ProcessTimeline** - Step progression visualization
- **PageTransition** - Smooth page transitions
- **EnhancedRetentionDetails** - Retention data form
- **SatDataFileControl** - SAT file upload control
- **ErrorBoundary** - Error handling wrapper
- **UserGuide** - In-app help/documentation

### 9.2 Context (State Management)
- **AuthContext** - User authentication state, login/logout, permissions
- **ThemeContext** - Dark/light mode, theme settings

### 9.3 Hooks
- **useApi** - HTTP API communication hook with token management
- Custom hooks for pagination, filtering, form management

### 9.4 Frontend Architecture
- Page-based routing (React Router)
- Component composition pattern
- Context for global state
- Hooks for logic reuse
- Responsive design (TailwindCSS)
- Dark mode support

---

## 10. DATABASE INITIALIZATION & SEEDING

### 10.1 Default Data
**Machines** (80+ pre-configured)
- RXN-001 (3D XRAY)
- RSS-003, RSS-005, RSS-006 (SAT)
- RCE-002, RCE-003, RCE-004 (TC - Temperature Chamber)
- RTE-001, RTE-003, etc. (TH - Thermal)
- HTS chambers, SEM, FTIR, etc.

**Employees** (35+ default staff)
- Employee ID, Name, Position
- Roles: Sr. Rel Engr, FA Engr, FA ES P3, REL ES, etc.

**Default Admin Account**
- Email: admin@amkor.com
- Role: Admin
- Password: Auto-generated on first run

### 10.2 Migrations
- Column additions via ALTER TABLE (with error suppression)
- Legacy data compatibility (xlrd support for .xls files)
- Process step triggers for data validation
- UNIQUE constraints with ON CONFLICT handling

---

## 11. SECURITY CONSIDERATIONS

### 11.1 Authentication
- JWT with HS256 algorithm
- 24-hour token expiry
- Bcrypt password hashing (12 rounds)
- HttpOnly cookies for token storage
- CORS restricted

### 11.2 Authorization
- Role-based access control via decorators
- Permission-based operation checks
- User approval workflow (prevents unauthorized access)
- Login attempt rate limiting (429 Too Many Requests after failures)
- User blocking/locking mechanism

### 11.3 Data Protection
- SQLite with WAL (Write-Ahead Logging) mode
- PRAGMA foreign_keys enabled
- PRAGMA busy_timeout for concurrency
- Password reset tokens (one-time, 15-min expiry)
- Audit logging of user actions

### 11.4 Input Validation
- Pydantic model validation
- Email validation (EmailStr)
- File type checking on uploads
- SQL parameter binding (prevents injection)

---

## 12. TECHNICAL DEBT & CONSIDERATIONS FOR ELECTRON PORT

### 12.1 Potential Challenges
1. **File Uploads** - In-memory vs disk storage strategy
2. **Database Path** - Use user AppData directory
3. **Port Binding** - Backend runs on localhost (handle process management)
4. **Concurrency** - SQLite has write limitations; consider SQLite3 in WAL mode
5. **Packaging** - Include Python runtime (PyInstaller or embedded)
6. **IPC Communication** - Frontend → Backend via HTTP or Electron IPC
7. **Auto-Updates** - Currently manual deployment

### 12.2 Migration Path
1. Keep FastAPI backend, add Electron wrapper
2. Use electron-builder for installer generation
3. Run backend as subprocess or bundled executable
4. Use SQLite database in user AppData
5. Implement Electron IPC for frontend-backend communication
6. Add auto-start and auto-update capabilities

---

## 13. DEPLOYMENT & BUILD

### 13.1 Backend Deployment
- Gunicorn for production (ASGI server)
- Environment variables: JWT_SECRET, DB_PATH, ENVIRONMENT
- Uvicorn for development
- Docker support via Dockerfile (included)

### 13.2 Frontend Build
- Vite build system
- Production bundle optimization
- Static file serving

### 13.3 Environment Configuration
```
.env file required:
- JWT_SECRET (must change in production)
- DB_PATH (SQLite database location)
- ENVIRONMENT (development/production)
```

---

## 14. MONITORING & OBSERVABILITY

### 14.1 Logging
- Python logging configured for backend
- Access logs, error logs
- Login audit trail
- System health metrics

### 14.2 Metrics Tracked
- Active tests count
- CPU/Memory usage (via psutil)
- Throughput (requests/hour)
- Success rates
- Uptime percentage
- Response time percentiles

### 14.3 Health Checks
- GET /api/system/health - Comprehensive system status
- GET /api/ - Simple health ping
- Maintenance mode support for maintenance windows

---

## 15. QUICK REFERENCE - CRITICAL TABLES & FIELDS

### Must-Have Tables for MVP
1. users - Auth & access control
2. requests - Core request data
3. process_steps - Workflow tracking
4. role_permissions - RBAC matrix
5. settings - App configuration

### Must-Have Endpoints for MVP
- POST /api/auth/login, register
- GET/POST /api/requests
- PATCH /api/requests/{id}/steps/{step}
- GET /api/dashboard/stats
- GET /api/settings

### Must-Have Features for MVP
1. User login with roles
2. Create/view/edit requests
3. Update process steps
4. Dashboard with stats
5. Settings management
6. User admin panel

---

## 16. ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│                    Electron Desktop App                         │
├──────────────────────┬──────────────────┬──────────────────────┤
│                      │                  │                      │
│  React 18 Frontend   │  IPC Bridge      │  App Menu & Tray     │
│  ├─ Pages (23)       │  ├─ setToken     │  ├─ Minimize         │
│  ├─ Components (20+) │  ├─ getUser      │  ├─ Settings         │
│  ├─ AuthContext      │  └─ getData      │  └─ Quit             │
│  └─ ThemeContext     │                  │                      │
└──────────┬───────────┴──────────────────┴──────────────────────┘
           │ HTTP (localhost:8000)
           ↓
┌─────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend (Python)                      │
├──────────────────────┬──────────────────┬──────────────────────┤
│                      │                  │                      │
│  API Endpoints (60+) │  Auth System     │  Business Logic      │
│  ├─ Requests         │  ├─ JWT tokens   │  ├─ Workflows        │
│  ├─ Users            │  ├─ Bcrypt pwd   │  ├─ Imports          │
│  ├─ Reports          │  ├─ RBAC         │  ├─ Reports          │
│  ├─ Backups          │  └─ Heartbeat    │  └─ Backups          │
│  └─ Imports          │                  │                      │
└──────────┬───────────┴──────────────────┴──────────────────────┘
           │ aiosqlite (async)
           ↓
┌─────────────────────────────────────────────────────────────────┐
│                    SQLite Database                               │
│  ├─ users (RBAC)                                               │
│  ├─ requests (core data)                                       │
│  ├─ process_steps (workflow)                                   │
│  ├─ login_logs (audit)                                         │
│  ├─ machines, employees (reference)                            │
│  ├─ settings, role_permissions (config)                        │
│  └─ backups, masterlist (specialized)                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 17. CONFIGURATION REFERENCE

### 17.1 Process Step Defaults
```javascript
Incoming Inspection, Visual, SAT, BAKE, 
HTS, Analysis, Report
```

### 17.2 Machine Equipment Categories
- XRAY, Polishers, Shears, Degas, Analyzers, Mills, Boxes, Microscopes
- SAT, Reflow, FTIR, HAST, Ionizers, Laser Decap, Etching, SEM, Testers, etc.
- ~80 total machine types configured

### 17.3 Default Step Status Flow
pending → in_progress → completed (or failed/hold)

### 17.4 Request Status Flow
pending → review → approval → testing → analysis → completed
(with hold and discontinued as alternate paths)

---

## 18. TESTING CONSIDERATIONS

### 18.1 Auth Testing
- Test each role's permission matrix
- Verify token expiration
- Test password reset flow
- Test guest technician access

### 18.2 Request Workflow Testing
- Test status transitions
- Test multi-leg handling
- Test step updates
- Test import/export

### 18.3 Data Integrity
- Test concurrent step updates
- Test backup/restore
- Test database migrations
- Test trigger validations

---

**Document Generated**: 2026-07-01
**Application**: REL Request Process Flow
**For**: Desktop (Electron) Port Planning
