"""
Amkor Apps Launcher
Starts / stops / deploys REL Request and CA Request (frontend + backend).

Run with:  pythonw.exe launcher.pyw   (no console window)
       or:  python     launcher.pyw   (shows console for debugging)

DEPLOY mode:  builds the React frontend (npm run build) then restarts the
              backend in production mode — accessible to ALL LAN users on
              the same network without a separate Node dev server.

DEV mode:     starts backends with --reload and fronted with npm run dev
              so hot-reload works during development.
"""
import tkinter as tk
from tkinter import scrolledtext
import subprocess
import threading
import os
import shutil
import time
import socket
import webbrowser

# ── Node.js / npm resolver ────────────────────────────────────────────────────
def _find_node_dir() -> str | None:
    """
    Return the directory that contains npm.cmd / node.exe so it can be
    prepended to PATH before spawning frontend subprocesses.

    Search order:
      1. shutil.which  (already on PATH — fastest, covers most machines)
      2. Common Windows install locations (Program Files, nvm, scoop, etc.)
      3. APPDATA\\npm   (global npm symlinks)
    """
    # 1 — already on PATH?
    npm_in_path = shutil.which("npm") or shutil.which("npm.cmd")
    if npm_in_path:
        return os.path.dirname(npm_in_path)

    # 2 — common fixed install paths
    candidates = [
        r"C:\Program Files\nodejs",
        r"C:\Program Files (x86)\nodejs",
        os.path.expandvars(r"%ProgramFiles%\nodejs"),
        os.path.expandvars(r"%ProgramFiles(x86)%\nodejs"),
        # nvm-windows default slot
        os.path.expandvars(r"%APPDATA%\nvm"),
        # Scoop
        os.path.expandvars(r"%USERPROFILE%\scoop\apps\nodejs\current"),
        os.path.expandvars(r"%USERPROFILE%\scoop\apps\nodejs-lts\current"),
        # Chocolatey
        r"C:\ProgramData\chocolatey\bin",
        # winget
        os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\WinGet\Packages\OpenJS.NodeJS"),
    ]
    for d in candidates:
        if d and os.path.isfile(os.path.join(d, "npm.cmd")):
            return d

    # 3 — %APPDATA%\npm houses npm.cmd on some setups
    appdata_npm = os.path.expandvars(r"%APPDATA%\npm")
    if os.path.isfile(os.path.join(appdata_npm, "npm.cmd")):
        return appdata_npm

    return None  # cannot find Node.js


def _npm_env() -> dict:
    """Return an env dict with Node.js directory prepended to PATH (if found)."""
    env = os.environ.copy()
    node_dir = _find_node_dir()
    if node_dir:
        env["PATH"] = node_dir + os.pathsep + env.get("PATH", "")
    return env


NODE_DIR = _find_node_dir()   # resolved once at startup

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT         = os.path.dirname(os.path.abspath(__file__))
REL_BACKEND  = os.path.join(ROOT, "Rel Website", "backend")
REL_FRONTEND = os.path.join(ROOT, "Rel Website", "frontend")
CA_BACKEND   = os.path.join(ROOT, "ca-website",  "backend")
CA_FRONTEND  = os.path.join(ROOT, "ca-website",  "frontend")
REL_VENV_PY  = os.path.join(ROOT, "Rel Website", ".venv", "Scripts", "python.exe")  # venv lives at Rel Website root
CA_VENV_PY   = os.path.join(CA_BACKEND,  ".venv", "Scripts", "python.exe")
ICON_PATH    = os.path.join(ROOT, "amkor.ico")

# ── Service list ──────────────────────────────────────────────────────────────
SERVICES = [
    {
        "id":       "rel_backend",
        "label":    "REL Backend",
        "site":     "rel",
        "url":      "http://localhost:8000",
        "port":     8000,
        "cmd":      lambda: [REL_VENV_PY, "-m", "uvicorn", "server:app",
                              "--reload", "--host", "0.0.0.0", "--port", "8000"],
        "prod_cmd": lambda: [REL_VENV_PY, "-m", "uvicorn", "server:app",
                              "--host", "0.0.0.0", "--port", "8000"],
        "cwd":      lambda: REL_BACKEND,
        "shell":    False,
        "color":    "#3b82f6",
    },
    {
        "id":       "rel_frontend",
        "label":    "REL Frontend (Dev)",
        "dev_only": True,
        "site":     "rel",
        "url":   "http://localhost:3000",
        "port":  3000,
        "cmd":   lambda: "npm run dev",
        "cwd":   lambda: REL_FRONTEND,
        "shell": True,
        "color": "#3b82f6",
    },
    {
        "id":       "ca_backend",
        "label":    "CA  Backend",
        "site":     "ca",
        "url":      "http://localhost:8001",
        "port":     8001,
        "cmd":      lambda: [CA_VENV_PY, "-m", "uvicorn", "server:app",
                              "--reload", "--host", "0.0.0.0", "--port", "8001"],
        "prod_cmd": lambda: [CA_VENV_PY, "-m", "uvicorn", "server:app",
                              "--host", "0.0.0.0", "--port", "8001"],
        "cwd":      lambda: CA_BACKEND,
        "shell":    False,
        "color":    "#8b5cf6",
    },
    {
        "id":       "ca_frontend",
        "label":    "CA  Frontend (Dev)",
        "dev_only": True,
        "site":     "ca",
        "url":   "http://localhost:3001",
        "port":  3001,
        "cmd":   lambda: "npm run dev",
        "cwd":   lambda: CA_FRONTEND,
        "shell": True,
        "color": "#8b5cf6",
    },
]

# ── Site groupings (for Deploy panels) ───────────────────────────────────────
SITES = [
    {
        "id":           "rel",
        "label":        "REL Request",
        "color":        "#3b82f6",
        "bg":           "#0d1f35",
        "frontend_cwd": lambda: REL_FRONTEND,
        "backend_id":   "rel_backend",
        "frontend_id":  "rel_frontend",
        "lan_port":     8000,
    },
    {
        "id":           "ca",
        "label":        "CA Request",
        "color":        "#8b5cf6",
        "bg":           "#150d35",
        "frontend_cwd": lambda: CA_FRONTEND,
        "backend_id":   "ca_backend",
        "frontend_id":  "ca_frontend",
        "lan_port":     8001,
    },
]


def _get_lan_ip() -> str:
    """Return the machine's LAN IPv4 address (falls back to 127.0.0.1)."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


# ── App ───────────────────────────────────────────────────────────────────────
class LauncherApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Amkor Apps Launcher")
        self.resizable(False, False)
        self.configure(bg="#0f172a")
        if os.path.exists(ICON_PATH):
            self.iconbitmap(ICON_PATH)

        self.processes  = {}        # svc_id  -> subprocess.Popen
        self.rows       = {}        # svc_id  -> dict of tk widgets
        self._deploying = set()     # site_ids currently being deployed
        self._lan_ip    = _get_lan_ip()

        self._build_ui()
        if NODE_DIR:
            self.after(0, self._log, f"[Launcher] Node.js path resolved: {NODE_DIR}")
        else:
            self.after(0, self._log,
                       "[Launcher] WARNING: Node.js/npm path not found. "
                       "Frontend deploy/dev will fail until Node.js is installed or added to PATH.")
        self.protocol("WM_DELETE_WINDOW", self._on_close)
        self._poll_status()

    # ── UI construction ───────────────────────────────────────────────────────
    def _build_ui(self):
        PAD = 16

        # Header bar
        hdr = tk.Frame(self, bg="#1e293b", pady=10)
        hdr.pack(fill="x")

        tk.Label(hdr, text="  Amkor Apps Launcher",
                 font=("Segoe UI", 14, "bold"),
                 fg="white", bg="#1e293b").pack(side="left", padx=PAD)

        # LAN IP display
        lan_box = tk.Frame(hdr, bg="#1e293b")
        lan_box.pack(side="left", padx=16)
        tk.Label(lan_box, text="LAN:", font=("Segoe UI", 8),
                 fg="#64748b", bg="#1e293b").pack(side="left")
        tk.Label(lan_box, text=self._lan_ip,
                 font=("Segoe UI", 9, "bold"),
                 fg="#22d3ee", bg="#1e293b").pack(side="left", padx=4)

        # Header action buttons (right → left order)
        for txt, cmd, bg in [
            ("■  Stop All",          self._stop_all,    "#ef4444"),
            ("▶  Start Local/LAN",   self._start_local, "#22c55e"),
            ("⬆  Deploy All (LAN)",  self._deploy_all,  "#f59e0b"),
        ]:
            tk.Button(hdr, text=txt, font=("Segoe UI", 9, "bold"),
                      bg=bg, fg="white", relief="flat",
                      padx=10, pady=4, cursor="hand2",
                      command=cmd).pack(side="right", padx=4)

        # Site panels
        body = tk.Frame(self, bg="#0f172a", padx=PAD, pady=8)
        body.pack(fill="x")
        for site in SITES:
            self._build_site_panel(body, site)

        # Log area
        log_hdr = tk.Frame(self, bg="#0f172a", padx=PAD)
        log_hdr.pack(fill="x")
        tk.Label(log_hdr, text="Log", font=("Segoe UI", 9, "bold"),
                 fg="#64748b", bg="#0f172a").pack(side="left")
        tk.Button(log_hdr, text="Clear", font=("Segoe UI", 8),
                  bg="#1e293b", fg="#94a3b8", relief="flat",
                  cursor="hand2", padx=6,
                  command=lambda: self.log.delete("1.0", "end")).pack(side="right")

        self.log = scrolledtext.ScrolledText(
            self, height=12, bg="#0f172a", fg="#94a3b8",
            font=("Consolas", 8), relief="flat",
            borderwidth=0, padx=PAD, pady=6,
            insertbackground="white",
        )
        self.log.pack(fill="both", expand=True, padx=PAD, pady=(2, PAD))

    def _build_site_panel(self, parent, site):
        """Build one coloured site section (REL or CA) with service rows + deploy button."""
        panel = tk.Frame(parent, bg=site["bg"], pady=6)
        panel.pack(fill="x", pady=6)

        # ── Site header row ───────────────────────────────────────────────────
        shdr = tk.Frame(panel, bg=site["bg"])
        shdr.pack(fill="x", padx=10, pady=(0, 4))

        tk.Frame(shdr, bg=site["color"], width=4).pack(side="left", fill="y")
        tk.Label(shdr, text=f"  {site['label']}",
                 font=("Segoe UI", 10, "bold"),
                 fg=site["color"], bg=site["bg"]).pack(side="left")

        # Clickable LAN URL
        lan_url = f"http://{self._lan_ip}:{site['lan_port']}"
        lan_lbl = tk.Label(shdr, text=f"   LAN → {lan_url}",
                           font=("Segoe UI", 8), fg="#64748b",
                           bg=site["bg"], cursor="hand2")
        lan_lbl.pack(side="left")
        lan_lbl.bind("<Button-1>", lambda e, u=lan_url: webbrowser.open(u))

        # Deploy button — builds frontend then starts backend in production (no --reload)
        short = site["label"].split()[0]   # "REL" or "CA"
        deploy_btn = tk.Button(
            shdr, text=f"⬆  Deploy {short} (LAN)",
            font=("Segoe UI", 9, "bold"),
            bg="#f59e0b", fg="white", relief="flat",
            padx=10, pady=3, cursor="hand2",
            command=lambda s=site: self._deploy(s["id"]),
        )
        deploy_btn.pack(side="right", padx=4)
        site["_deploy_btn"] = deploy_btn

        # Dev button — starts backend (with --reload) + frontend dev server
        dev_btn = tk.Button(
            shdr, text=f"▶  Dev {short}",
            font=("Segoe UI", 9, "bold"),
            bg="#16a34a", fg="white", relief="flat",
            padx=10, pady=3, cursor="hand2",
            command=lambda s=site: self._start_dev_site(s["id"]),
        )
        dev_btn.pack(side="right", padx=4)

        # ── Service rows ──────────────────────────────────────────────────────
        for svc in [s for s in SERVICES if s["site"] == site["id"]]:
            row = tk.Frame(panel, bg="#1e293b", pady=6, padx=12)
            row.pack(fill="x", padx=10, pady=2)

            tk.Frame(row, bg=svc["color"], width=4).pack(side="left", fill="y")

            info = tk.Frame(row, bg="#1e293b")
            info.pack(side="left", padx=10, fill="both", expand=True)

            tk.Label(info, text=svc["label"],
                     font=("Segoe UI", 10, "bold"),
                     fg="white", bg="#1e293b").pack(anchor="w")

            url_lbl = tk.Label(info, text=svc["url"],
                               font=("Segoe UI", 8), fg="#64748b",
                               bg="#1e293b", cursor="hand2")
            url_lbl.pack(anchor="w")
            url_lbl.bind("<Button-1>", lambda e, u=svc["url"]: webbrowser.open(u))

            dot = tk.Label(row, text="●", font=("Segoe UI", 14),
                           fg="#475569", bg="#1e293b")
            dot.pack(side="right", padx=6)

            btn_stop = tk.Button(row, text="■", font=("Segoe UI", 9, "bold"),
                                 bg="#374151", fg="#ef4444", relief="flat",
                                 padx=8, pady=2, cursor="hand2",
                                 command=lambda s=svc: self._stop(s["id"]))
            btn_stop.pack(side="right", padx=2)

            btn_start = tk.Button(row, text="▶", font=("Segoe UI", 9, "bold"),
                                  bg="#374151", fg="#22c55e", relief="flat",
                                  padx=8, pady=2, cursor="hand2",
                                  command=lambda s=svc: self._start(s["id"]))
            btn_start.pack(side="right", padx=2)

            self.rows[svc["id"]] = {
                "dot": dot, "url_lbl": url_lbl,
                "btn_start": btn_start, "btn_stop": btn_stop,
            }

    # ── Deploy ────────────────────────────────────────────────────────────────
    def _deploy(self, site_id: str):
        """Kick off an async deploy for one site (build frontend + restart backend)."""
        if site_id in self._deploying:
            self._log(f"[Deploy] {site_id.upper()} is already deploying — please wait.")
            return
        site = next(s for s in SITES if s["id"] == site_id)
        btn  = site.get("_deploy_btn")
        if btn:
            btn.config(state="disabled", text="⏳ Deploying…", bg="#92400e")
        self._deploying.add(site_id)
        threading.Thread(target=self._deploy_worker, args=(site,), daemon=True).start()

    def _deploy_worker(self, site: dict):
        """
        Background thread:
          1. Stop the frontend dev server (if running in dev mode)
          2. npm install (if node_modules missing)
          3. npm run build   → creates/updates dist/
          4. Stop backend
          5. Start backend in production mode (no --reload), serving the new dist/
        """
        sid   = site["id"]
        label = site["label"]
        fe_id = site["frontend_id"]
        be_id = site["backend_id"]
        be_svc = next(s for s in SERVICES if s["id"] == be_id)
        fe_cwd = site["frontend_cwd"]()
        dist_index = os.path.join(fe_cwd, "dist", "index.html")

        try:
            can_build_frontend = bool(NODE_DIR)
            if not can_build_frontend:
                if os.path.exists(dist_index):
                    self.after(0, self._log,
                               f"[Deploy {label}] npm not found; using existing frontend dist build.")
                else:
                    self.after(0, self._log,
                               f"[Deploy {label}] npm not found and no dist build exists.")
                    self.after(0, self._log,
                               f"[Deploy {label}] Install Node.js LTS, then deploy again.")
                    return

            # 1 — stop dev frontend
            fe_proc = self.processes.get(fe_id)
            if fe_proc and fe_proc.poll() is None:
                self.after(0, self._log, f"[Deploy {label}] Stopping dev frontend…")
                fe_proc.terminate()
                try:
                    fe_proc.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    fe_proc.kill()
                self.processes.pop(fe_id, None)

            if can_build_frontend:
                # 2 — install node deps if missing
                if not os.path.exists(os.path.join(fe_cwd, "node_modules")):
                    self.after(0, self._log, f"[Deploy {label}] Installing frontend deps (npm install)…")
                    r = subprocess.run(
                        "npm install", cwd=fe_cwd, shell=True,
                        stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                        creationflags=subprocess.CREATE_NO_WINDOW,
                        env=_npm_env(),
                    )
                    if r.returncode != 0:
                        self.after(0, self._log,
                                   f"[Deploy {label}] npm install FAILED:\n"
                                   + r.stdout.decode("utf-8", errors="replace"))
                        return

                # 3 — build frontend
                self.after(0, self._log, f"[Deploy {label}] Building frontend (npm run build)…")
                build_proc = subprocess.Popen(
                    "npm run build", cwd=fe_cwd, shell=True,
                    stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                    creationflags=subprocess.CREATE_NO_WINDOW,
                    env=_npm_env(),
                )
                for raw in build_proc.stdout:
                    line = raw.decode("utf-8", errors="replace").rstrip()
                    if line:
                        self.after(0, self._log, f"[Deploy {label}]   {line}")
                build_proc.wait()
                if build_proc.returncode != 0:
                    self.after(0, self._log,
                               f"[Deploy {label}] BUILD FAILED (exit {build_proc.returncode})")
                    self.after(0, self._log,
                               f"[Deploy {label}] npm PATH used: {NODE_DIR if NODE_DIR else 'NOT FOUND'}")
                    return
                self.after(0, self._log, f"[Deploy {label}] Frontend build complete ✓")

            # 4 — stop existing backend
            be_proc = self.processes.get(be_id)
            if be_proc and be_proc.poll() is None:
                self.after(0, self._log, f"[Deploy {label}] Restarting backend…")
                be_proc.terminate()
                try:
                    be_proc.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    be_proc.kill()
                self.processes.pop(be_id, None)
                time.sleep(1)   # brief pause to free the port

            # 5 — start backend in production mode (no --reload)
            prod_cmd = be_svc.get("prod_cmd", be_svc["cmd"])
            self.after(0, self._log, f"[Deploy {label}] Starting backend in production mode…")
            new_proc = subprocess.Popen(
                prod_cmd(),
                cwd=be_svc["cwd"](),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                creationflags=subprocess.CREATE_NO_WINDOW,
                shell=False,
            )
            self.processes[be_id] = new_proc
            threading.Thread(
                target=self._stream_log,
                args=(new_proc, be_svc["label"]),
                daemon=True,
            ).start()

            lan_url   = f"http://{self._lan_ip}:{site['lan_port']}"
            local_url = f"http://localhost:{site['lan_port']}"
            self.after(0, self._log,
                       f"[Deploy {label}] ✓ DONE!   Local: {local_url}   LAN: {lan_url}")

        except Exception as exc:
            self.after(0, self._log, f"[Deploy {label}] ERROR: {exc}")

        finally:
            self._deploying.discard(sid)
            btn = site.get("_deploy_btn")
            short = label.split()[0]
            if btn:
                self.after(0, lambda b=btn, t=f"⬆  Deploy {short}":
                           b.config(state="normal", text=t, bg="#f59e0b"))

    def _deploy_all(self):
        """Deploy all sites: build each frontend then start backend in production mode."""
        for site in SITES:
            self._deploy(site["id"])
            time.sleep(0.3)

    # ── Service control ───────────────────────────────────────────────────────
    def _start(self, svc_id: str):
        svc = next(s for s in SERVICES if s["id"] == svc_id)
        if svc_id in self.processes and self.processes[svc_id].poll() is None:
            self._log(f"[{svc['label']}] Already running.")
            return

        # Auto-bootstrap CA venv the first time
        if svc_id == "ca_backend" and not os.path.exists(CA_VENV_PY):
            self._log("[CA  Backend] venv not found — creating it first…")
            threading.Thread(target=self._setup_ca_venv, daemon=True).start()
            return

        if svc.get("shell") and not NODE_DIR:
            self._log(f"[{svc['label']}] npm not found. Install Node.js LTS and reopen launcher.")
            return

        self._log(f"[{svc['label']}] Starting…")
        try:
            # Frontend dev services use npm — ensure Node.js is on PATH
            extra_env = _npm_env() if svc.get("shell") else None
            proc = subprocess.Popen(
                svc["cmd"](),
                cwd=svc["cwd"](),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                creationflags=subprocess.CREATE_NO_WINDOW,
                shell=svc.get("shell", False),
                env=extra_env,
            )
            self.processes[svc_id] = proc
            threading.Thread(
                target=self._stream_log,
                args=(proc, svc["label"]),
                daemon=True,
            ).start()
        except Exception as exc:
            self._log(f"[{svc['label']}] ERROR: {exc}")

    def _setup_ca_venv(self):
        """Bootstrap CA backend venv from REL's Python, then auto-start the service."""
        req = os.path.join(CA_BACKEND, "requirements.txt")
        venv_dir = os.path.dirname(os.path.dirname(CA_VENV_PY))  # strip \Scripts\python.exe
        steps = [
            ("Creating CA venv",   [REL_VENV_PY, "-m", "venv", venv_dir],        ROOT),
            ("Upgrading pip",      [CA_VENV_PY,  "-m", "pip", "install",
                                    "--upgrade", "pip", "setuptools", "wheel"],   CA_BACKEND),
            ("Installing CA deps", [CA_VENV_PY,  "-m", "pip", "install",
                                    "-r", req],                                    CA_BACKEND),
        ]
        for label, cmd, cwd in steps:
            self.after(0, self._log, f"[CA  Backend] {label}…")
            r = subprocess.run(
                cmd, cwd=cwd,
                stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                creationflags=subprocess.CREATE_NO_WINDOW,
            )
            if r.returncode != 0:
                out = r.stdout.decode("utf-8", errors="replace")
                self.after(0, self._log, f"[CA  Backend] Setup failed:\n{out}")
                return
        self.after(0, self._log, "[CA  Backend] Setup complete — starting…")
        self.after(100, lambda: self._start("ca_backend"))

    def _stop(self, svc_id: str):
        svc  = next(s for s in SERVICES if s["id"] == svc_id)
        proc = self.processes.get(svc_id)
        if proc and proc.poll() is None:
            self._log(f"[{svc['label']}] Stopping…")
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
            self.processes.pop(svc_id, None)
        else:
            self._log(f"[{svc['label']}] Not running.")

    def _start_all(self):
        """Start all services (backends + frontend dev servers) — full dev mode."""
        for svc in SERVICES:
            self._start(svc["id"])
            time.sleep(0.3)

    def _start_local(self):
        """Start backends only (no frontend dev servers).
        Backends bind to 0.0.0.0 so they are accessible on both localhost
        and the LAN. The pre-built frontend in dist/ is served automatically.
        Use 'Deploy (LAN)' first if dist/ has not been built yet.
        """
        for svc in SERVICES:
            if not svc.get("dev_only"):
                self._start(svc["id"])
                time.sleep(0.3)

    def _start_dev_site(self, site_id: str):
        """Start one site's backend (--reload) + frontend dev server."""
        for svc in SERVICES:
            if svc["site"] == site_id:
                self._start(svc["id"])
                time.sleep(0.3)

    def _stop_all(self):
        for svc in reversed(SERVICES):
            self._stop(svc["id"])

    # ── Logging helpers ───────────────────────────────────────────────────────
    def _log(self, msg: str):
        ts = time.strftime("%H:%M:%S")
        self.log.insert("end", f"[{ts}] {msg}\n")
        self.log.see("end")

    def _stream_log(self, proc: subprocess.Popen, label: str):
        try:
            for raw in proc.stdout:
                line = raw.decode("utf-8", errors="replace").rstrip()
                if line:
                    self.after(0, self._log, f"[{label}] {line}")
        except Exception:
            pass

    # ── Status polling ────────────────────────────────────────────────────────
    def _poll_status(self):
        for svc in SERVICES:
            proc    = self.processes.get(svc["id"])
            running = proc is not None and proc.poll() is None
            self.rows[svc["id"]]["dot"].config(
                fg="#22c55e" if running else "#475569"
            )
        self.after(1500, self._poll_status)

    # ── Window close ─────────────────────────────────────────────────────────
    def _on_close(self):
        self._stop_all()
        time.sleep(0.5)
        self.destroy()


if __name__ == "__main__":
    app = LauncherApp()
    app.mainloop()
