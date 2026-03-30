# Run Instructions — Rel Request Process Flow

**Overview**
This document explains how to run the project locally using Docker (recommended), run the mock tests, or run services individually (backend/frontend). Use Docker if you want a reproducible full-stack run. If you run locally without Docker, prefer Python 3.11 to avoid package compatibility issues.

**Files of interest**
- `backend/` — FastAPI app (`server.py`) and `requirements.txt`
- `backend/.env.example` — example environment variables
- `backend_test.py` — integration tests that exercise the API (now targets `http://localhost:8000`)
- `mock_server.py` — lightweight mock API used for fast local tests
- `docker-compose.yml` — run `mongo`, `backend`, and `frontend` containers
- `frontend/` — placeholder `index.html` and `Dockerfile` (if you have a real React app, build and replace)

**1) Quick start — Docker (recommended)**
From the `Rel Website` directory run:

```bash
# build and start services (mongo, backend, frontend)
docker compose up --build

# run in background
docker compose up --build -d

# view logs
docker compose logs -f

# stop and remove containers
docker compose down
```

Notes:
- Before building, you can copy `backend/.env.example` to `backend/.env` and edit values if needed.
- If the backend image build fails due to private or version-restricted packages (e.g. `emergentintegrations==0.1.0`), remove or pin that dependency or provide a private package index.

**2) Run tests quickly using the mock server (no Docker)**
This is useful for running `backend_test.py` quickly without Mongo or backend dependencies.

```bash
# from the repository root (Rel Website)
# start mock server (keeps running in foreground)
python mock_server.py

# in a separate terminal, run the integration tests
python backend_test.py
```

Expected: tests hit `http://localhost:8000` and should pass against the mock server.

**3) Run the real backend locally (Python 3.11 recommended)**
1. Install Python 3.11 and create a venv:

```powershell
cd "Rel Website\backend"
python -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip setuptools wheel
python -m pip install -r requirements.txt
```

2. Create `.env` from `backend/.env.example` and set `MONGO_URL`/`DB_NAME`/`JWT_SECRET`.
3. Start a MongoDB instance (local or via Docker). If using Docker for Mongo only:

```bash
docker run -d -p 27017:27017 --name local-mongo -v mongo_data:/data/db mongo:6.0
```

4. Start the backend (from the `backend` folder):

```bash
# development (auto-reload)
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

5. Re-run the tests against the real backend (ensure `backend_test.py` base_url is `http://localhost:8000`):

```bash
cd "Rel Website"
python backend_test.py
# or run pytest
python -m pytest -q
```

**4) Run the frontend locally**
If you have Node installed and the real frontend sources:

```bash
cd "Rel Website/frontend"
# install Node (LTS 18 or 20 recommended) then:
npm ci
npm start
```

The placeholder frontend is served on port `3000` when using Docker. If you have a real production build, copy the `build/` output into `frontend/` or update the frontend `Dockerfile` to build and copy files.

**5) Troubleshooting & tips**
- Python version: some deps are restricted to <3.13. Use Python 3.11 for best compatibility.
- Missing package `emergentintegrations==0.1.0`: either remove from `requirements.txt` or make that package available via a private index and set `PIP_INDEX_URL`.
- If `pip install` fails during Docker build, reproduce locally (inside a 3.11 venv) to iterate faster.
- If `docker` or `npm` commands are not found, install Docker Desktop and Node.js respectively.

**6) Useful commands summary**
- Docker compose up (full stack):
```bash
docker compose up --build
```
- Run mock tests:
```bash
python mock_server.py
python backend_test.py
```
- Run backend locally (venv + uvicorn):
```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt
cd backend
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```
- Run frontend locally:
```bash
cd frontend
npm ci
npm start
```

If you want, I can also add a short `run.sh`/`run.ps1` script to automate these steps on your machine.