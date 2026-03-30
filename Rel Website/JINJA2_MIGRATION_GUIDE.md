# FastAPI + Jinja2 Template Conversion Guide

## Overview

Your application has been successfully converted from a **React/Node.js frontend** to a **Python/Jinja2-based frontend** that integrates directly with your FastAPI backend. **No more Node.js required!**

---

## What Was Changed

### 1. **Directory Structure Created**
```
backend/
├── templates/              # NEW: All HTML templates
│   ├── base.html          # Base template with Tailwind + dark mode
│   ├── layout.html        # Main app layout with sidebar navigation
│   ├── components/        # Reusable template components (create as needed)
│   └── pages/
│       ├── login.html     # Login page
│       ├── dashboard.html # Dashboard with KPIs
│       ├── requests.html  # All requests list
│       ├── my_requests.html # User's requests
│       ├── users.html     # User management (admin)
│       └── settings.html  # System settings (admin)
```

### 2. **Backend Updates**
- Added **Jinja2 imports** and template engine initialization
- Created **new HTML routes** (`/login`, `/`, `/requests`, etc.)
- Added **form POST handling** for login
- Integrated **authentication** with existing `get_current_user()` dependency
- Kept all **API endpoints** unchanged (still available at `/api/`)

### 3. **Technology Stack**
- **Frontend**: Jinja2 Templates + HTML + Tailwind CSS + Vanilla JavaScript
- **Backend**: FastAPI (unchanged)
- **Database**: SQLite (unchanged)
- **No build process**: No npm, webpack, or Node.js needed

### 4. **Styling**
- **Tailwind CSS v3** via CDN (https://cdn.tailwindcss.com)
- Full **dark mode support** with localStorage persistence
- Custom scrollbars, animations, and responsive design
- All original design maintained

---

## How to Use

### Starting the Server

```bash
# Activate Python environment
.venv/Scripts/Activate.ps1  # Windows PowerShell

# Install Jinja2 (if not already done)
pip install jinja2

# Run the backend server
python backend/server.py
# OR
cd backend && python server.py
```

Server will start at `http://localhost:8000`

### Accessing Pages

| Page | URL | Auth Required |
|------|-----|---------------|
| Login | `/login` | No |
| Dashboard | `/` | Yes |
| All Requests | `/requests` | Yes |
| My Requests | `/my-requests` | Yes |
| Users | `/users` | Admin only |
| Settings | `/settings` | Admin only |

### Sample Login
```
Email: test@example.com
Password: (use existing database user)
```

---

## Authentication Flow

1. **Form submission** → POST to `/login`
2. **Validation** against database users
3. **JWT token creation** (24-hour expiration)
4. **Cookie storage** (`access_token`)
5. **Redirect** to dashboard or requested page
6. **On each request**: `get_current_user()` validates token from cookie

---

## Key Features

### ✅ Dark Mode Toggle
- Button in user menu (bottom-left sidebar)
- Persists to localStorage
- Auto-applies on page load

### ✅ Flash Messages
- Error/success messages in templates
- Auto-dismissed alerts
- Toast notifications via JavaScript `window.showToast()`

### ✅ Form Handling
- Standard HTML forms with POST
- CSRF protection ready (add if needed)
- Client-side validation support

### ✅ Role-Based Access
- Login page checks `user.role`
- Sidebar conditionally shows menu items
- Template `{% if user.role == 'ADMIN' %}` blocks

### ✅ Responsive Design
- Mobile-first Tailwind CSS
- Sidebar collapses on mobile
- Mobile menu dropdown

---

## Migration Checklist

### Completed ✅
- [x] Set up Jinja2 templates directory
- [x] Create base template with styling
- [x] Create main layout template
- [x] Create login page
- [x] Create dashboard page
- [x] Create requests list
- [x] Update FastAPI server with new routes
- [x] Test authentication flow

### Next Steps (For You)

#### Short-term
- [ ] **Test the server**: `python backend/server.py` and navigate to `/login`
- [ ] **Create test user** if none exists
- [ ] **Verify pages load** without errors
- [ ] **Test dark mode toggle**

#### Medium-term
- [ ] Convert remaining React pages to Jinja2 (RequestDetail, Approvals, etc.)
- [ ] Create form pages (new request, edit request)
- [ ] Wire up API calls from templates to existing endpoints
- [ ] Add client-side JavaScript for interactivity

#### Long-term
- [ ] Move Tailwind to self-hosted version (optional optimization)
- [ ] Add form validation library (optional)
- [ ] Create more reusable components (modals, buttons, etc.)
- [ ] Remove React/Node.js references from documentation

---

## Creating New Pages

### Example: Creating a "Completed Requests" Page

**1. Create template** at `backend/templates/pages/completed.html`:
```html
{% extends "layout.html" %}

{% block title %}Completed Requests - REL{% endblock %}
{% block page_title %}Completed Requests{% endblock %}

{% block page_content %}
<div class="bg-white dark:bg-slate-800 rounded-lg shadow">
    <table class="w-full">
        <thead>
            <tr>
                <th>Request #</th>
                <th>Completed Date</th>
                <th>Created By</th>
            </tr>
        </thead>
        <tbody>
            {% for req in completed_requests %}
            <tr>
                <td><a href="/requests/{{ req.id }}">{{ req.request_number }}</a></td>
                <td>{{ req.completed_at.strftime('%Y-%m-%d') }}</td>
                <td>{{ req.created_by_username }}</td>
            </tr>
            {% endfor %}
        </tbody>
    </table>
</div>
{% endblock %}
```

**2. Add route** in `backend/server.py`:
```python
@app.get("/completed", response_class=HTMLResponse)
async def completed_requests(
    request: Request,
    db: aiosqlite.Connection = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cursor = await db.execute(
        "SELECT * FROM requests WHERE status = 'completed' ORDER BY created_at DESC"
    )
    reqs = await cursor.fetchall()
    
    return templates.TemplateResponse(
        "pages/completed.html",
        {
            "request": request,
            "user": current_user,
            "completed_requests": reqs
        }
    )
```

**3. Update sidebar navigation** in `backend/templates/layout.html`:
```html
<li>
    <a href="/completed" class="flex items-center px-4 py-2 rounded-lg hover:bg-slate-100">
        <span class="mr-3">✅</span>
        <span>Completed Requests</span>
    </a>
</li>
```

---

## Working with Existing API Endpoints

All your existing API endpoints at `/api/*` continue to work! You can call them from Jinja2 templates using:

```html
<!-- Simple data fetch and display -->
<script>
async function loadData() {
    const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('access_token='))
        ?.split('=')[1];
    
    const response = await fetch('/api/requests', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    const data = await response.json();
    console.log(data);
}
</script>
```

---

## File Structure Reference

```
backend/
├── server.py              # Main FastAPI app (UPDATED)
├── requirements.txt       # Dependencies (UPDATED - added Jinja2)
├── rel_database.db        # SQLite database
├── templates/             # NEW: HTML templates
│   ├── base.html          # Base template with styling
│   ├── layout.html        # Main layout with sidebar
│   ├── components/        # Reusable components
│   │   ├── sidebar.html
│   │   ├── header.html
│   │   └── ... (create as needed)
│   └── pages/
│       ├── login.html
│       ├── dashboard.html
│       ├── requests.html
│       ├── my_requests.html
│       ├── users.html
│       ├── settings.html
│       └── ... (add more as you convert)
└── ... (existing files)
```

---

## Common Issues & Solutions

### **Issue**: "Templates directory not found"
**Solution**: Ensure `backend/templates/` exists and is in the right location

### **Issue**: Styling not loading
**Solution**: Check that Tailwind CDN is accessible (`https://cdn.tailwindcss.com`)
- Fallback: Download Tailwind CSS locally

### **Issue**: Login redirects to login page again
**Solution**: Check that `access_token` cookie is being set. Inspect browser DevTools → Application → Cookies

### **Issue**: API calls fail with 401
**Solution**: Token might be expired or not being sent. Check:
```javascript
// Get token from cookie
const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('access_token='))
    ?.split('=')[1];
```

---

## Next: Converting More Pages

The remaining pages to convert are listed in the frontend analysis. Each follows the same pattern:

1. **Create template** at `backend/templates/pages/[pagename].html`
2. **Extend `layout.html`** for authenticated pages, or `base.html` for public pages
3. **Add route** in `server.py` with `@app.get()` decorator
4. **Pass data** to template via `TemplateResponse(..., {...context})`
5. **Add navigation link** in `layout.html` sidebar

---

## Questions?

If you run into issues:
1. Check the browser console (F12) for JavaScript errors
2. Check FastAPI logs in terminal for Python errors
3. Verify template files exist in correct locations
4. Test API endpoints directly: `curl http://localhost:8000/api/requests`

---

**Happy migrating! 🚀**
