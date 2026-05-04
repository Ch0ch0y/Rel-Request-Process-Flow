# REL Request Process Flow Website

Internal web application for Amkor Technology's Reliability Engineering team to manage REL sample requests through a structured workflow: creation → review → approval → step-by-step testing → completion.

## Architecture

- **Backend:** FastAPI (Python) with SQLite via `aiosqlite` — all code in `backend/server.py`
- **Frontend:** React 18 + Vite + Tailwind CSS — source in `frontend/src/`
- **Auth:** JWT (Bearer token) for the React SPA; cookie-based sessions for the Jinja2 SSR fallback
- **Deployment:** Render.com (`render.yaml`), Docker (`docker-compose.yml`), or local LAN (`RELDMS_Launcher.bat`)

## Quick Start (Local / LAN)

Double-click **`RELDMS_Launcher.bat`** and choose an option from the menu:

| Option | Description |
|--------|-------------|
| 1 | Start locally (backend only, serves built frontend) |
| 2 | Start on LAN (accessible on your local network) |
| 3 | Build frontend only |

Or use the PowerShell launcher:

```powershell
.\run.ps1
```

## Manual Setup

### Backend

```powershell
cd backend
python -m venv ..\.venv
..\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```powershell
cd frontend
npm install
npm run build    # production build → dist/
npm run dev      # dev server with HMR
```

Environment variables: copy `backend/.env.example` to `backend/.env` and set `JWT_SECRET`.

## Docker

```bash
docker compose up --build
```

Backend runs on port `8000`, frontend served by nginx on port `3000`.

## Deployment (Render)

Configured in `render.yaml`. Build runs `build.sh` (pip install + npm build); start command is `start.sh` (uvicorn).

## Project Structure

```
backend/
  server.py          # Entire FastAPI app (routes, DB, auth, reports, imports)
  requirements.txt   # Python dependencies
  templates/         # Jinja2 SSR fallback pages (mirrors React pages)
  uploads/           # User-uploaded images
  backups/           # Auto and manual database backups

frontend/src/
  pages/             # React page components (one per route)
  components/        # Shared UI components
  context/           # Auth & Theme context providers
  api.js             # Centralised API client (JWT)

generate_reports.py  # PowerPoint/Word report builder (imported by server.py)
RELDMS_Launcher.bat  # Master launcher (local + LAN modes)
```

## Testing

```powershell
# Integration tests against running backend
python backend_test.py

# Quick smoke test (no real backend needed)
python mock_server.py          # start mock in one terminal
python backend_test.py          # run tests in another

# pytest suite
python -m pytest tests/ -q
```

## Notes

- See [README_RUN.md](README_RUN.md) for detailed run instructions and troubleshooting.
- See [JINJA2_MIGRATION_GUIDE.md](JINJA2_MIGRATION_GUIDE.md) for notes on the SSR/SPA dual-mode setup.
- See [LAN_SHARING_GUIDE.md](LAN_SHARING_GUIDE.md) for instructions on sharing over a local network.

