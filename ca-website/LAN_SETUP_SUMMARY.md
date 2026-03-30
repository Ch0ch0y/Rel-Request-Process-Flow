# CA Website LAN Configuration Summary

## Configuration Status: ✅ COMPLETE

All CA Website backend modifications for local network sharing are complete and ready to use.

---

## What Changed

### 1. Server Configuration (backend/server.py)

**HOST Variable (Environment-Aware)**
```python
HOST = os.getenv("HOST", "0.0.0.0")  # Listens on all network interfaces by default
```

**PORT Configuration (Dual Port Support)**
```python
PORT = int(os.getenv("CA_PORT") or os.getenv("PORT", 8001))  
# Checks CA_PORT first (CA-specific), falls back to PORT, then default 8001
```

**uvicorn Startup Block (Environment Variables)**
```python
if __name__ == "__main__":
    uvicorn.run(
        "server:app",
        host=HOST,
        port=PORT,
        workers=int(os.getenv("WORKERS", 1)),
        reload=os.getenv("RELOAD", "").lower() in ("true", "1", "yes"),
        log_level="info"
    )
```

---

## Files Modified/Created

| File | Status | Purpose |
|------|--------|---------|
| `backend/server.py` | ✅ Modified | Added HOST/PORT env vars, updated uvicorn startup |
| `backend/.env.example` | ✅ Created | Configuration template with all available options |
| `start_lan.bat` | ✅ Created | Quick Windows batch starter (auto IP detection) |
| `start_lan.ps1` | ✅ Created | Enhanced PowerShell starter (colored output) |
| `LAN_SHARING_GUIDE.md` | ✅ Created | Comprehensive guide with all options |
| `LAN_SETUP_SUMMARY.md` | ✅ Created | This file - quick reference |

---

## Quick Start Commands

### Start with PowerShell (Recommended)
```powershell
cd ca-website
.\start_lan.ps1
```
Shows: IP address, port, and status

### Start with Batch Script
```cmd
cd ca-website
start_lan.bat
```
Simple, reliable Windows startup

### Start Directly
```powershell
cd ca-website
python backend/server.py
```
Basic Python execution, minimal output

---

## Default Configuration

```
HOST: 0.0.0.0        # Listen on all network interfaces
PORT: 8001           # CA Website default port
WORKERS: 1           # Single worker process
RELOAD: false        # Production mode (no auto-reload)
DATABASE: ca_database.db  # Isolated CA database
```

---

## Accessing the Application

### From Same Machine (Server)
- **Localhost:** http://localhost:8001/login
- **LAN IP:** http://192.168.x.x:8001/login (use actual IP)

### From Another Machine on Network
- http://<ServerIP>:8001/login
- Example: http://192.168.1.50:8001/login

---

## Environment Variables

### Quick Reference
```powershell
$env:HOST = "0.0.0.0"      # Network interface to bind (0.0.0.0 = all interfaces)
$env:CA_PORT = "8001"      # CA Website specific port
$env:PORT = "8001"         # Fallback port (if CA_PORT not set)
$env:WORKERS = "1"         # Number of uvicorn workers
$env:RELOAD = "false"      # Enable auto-reload on code changes
```

### Set via File
Create or edit `backend/.env`:
```
HOST=0.0.0.0
CA_PORT=8001
WORKERS=1
RELOAD=false
```

---

## Port Conflict Resolution

### Port 8001 Already in Use?

**Option 1: Change CA Website Port**
```powershell
$env:CA_PORT = "8002"
python backend/server.py
```

**Option 2: Find & Stop Process Using Port**
```powershell
netstat -ano | findstr :8001  # Find PID
taskkill /PID <PID> /F        # Kill process
```

---

## Firewall Setup

### Automatic (Recommended)
```powershell
# Run as Administrator
open_firewall.bat
```

### Manual PowerShell (Admin)
```powershell
netsh advfirewall firewall add rule name="CA Website 8001" dir=in action=allow protocol=tcp localport=8001
```

### Manual GUI
1. Settings → Windows Security → Firewall & Network Protection
2. "Allow an app through firewall"
3. Click "Change settings" (Admin)
4. Click "Allow another app" → Select Python → Add
5. Ensure "Private" is checked

---

## Network Accessibility Checklist

- [ ] Server is running (`python backend/server.py` or startup script)
- [ ] Port 8001 is listening (check with `netstat -ano | findstr :8001`)
- [ ] Windows Firewall allows port 8001 (run `open_firewall.bat`)
- [ ] Other machine is on same network (ping test: `ping <ServerIP>`)
- [ ] Try accessing: http://<ServerIP>:8001/login
- [ ] Check browser console for errors (F12 → Console tab)

---

## Dual System Access (CA + REL Websites)

Both can run simultaneously on the same machine:

| Website | Port | Database | Status |
|---------|------|----------|--------|
| **CA Website** | 8001 | ca_database.db | ✅ Configured |
| **REL Website** | 8000 | rel_database.db | ✅ Pre-configured |

### Start Both Servers
```powershell
# Terminal 1 - CA Website
cd ca-website
python backend/server.py

# Terminal 2 - REL Website  
cd "Rel Website"
python backend/server.py
```

**Access:**
- CA Website: http://localhost:8001/login
- REL Website: http://localhost:8000/login
- From other machines, use actual IP address instead of localhost

---

## Configuration Files Reference

### backend/server.py
- Contains HOST/PORT environment variable configuration
- uvicorn startup with env var support
- Logging with startup info

### backend/.env.example
- Template for all configurable options
- Copy to `backend/.env` to use custom configuration
- Contains defaults and descriptions

### start_lan.bat
- Windows batch script
- Auto-detects IPv4 address via `ipconfig`
- Sets PORT=8001
- Shows IP on startup

### start_lan.ps1
- PowerShell script
- Better IP detection (Get-NetIPAddress)
- Colored console output
- Shows hostname and port

### run_lan_service.ps1
- Service manager for continuous operation
- Auto-restart on failure
- Logging to file

---

## Troubleshooting Guide

### Server Won't Start
1. Check Python is installed: `python --version`
2. Check venv exists: `ls .venv`
3. Activate venv: `.\.venv\Scripts\Activate.ps1`
4. Install dependencies: `pip install -r backend/requirements.txt`

### Can't Connect from Another Machine
1. Verify server is running: `netstat -ano | findstr :8001`
2. Check port 8001 is allowed: `open_firewall.bat`
3. Verify network connection: `ping <ServerIP>`
4. Check exact IP of server: `ipconfig` (IPv4 address)

### Port Already in Use
```powershell
# Find what's using port 8001
netstat -ano | findstr :8001

# Kill the process (find PID from above)
taskkill /PID <PID> /F

# Or use different port
$env:CA_PORT = "9001"
```

### Performance Issues
- Reduce WORKERS: `$env:WORKERS = "1"`
- Check network bandwidth between machines
- Monitor server CPU in Task Manager

---

## Important Notes

⚠️ **Security:**
- This setup is for local networks only
- Do NOT expose to the internet without proper security (SSL, auth, firewall)
- Use this on trusted corporate/home networks

✅ **Best Practices:**
- Run the service continuously for reliable access
- Monitor disk space for database growth
- Keep Python packages updated
- Document any custom environment variables used

📋 **Monitoring:**
- Check logs for errors: `backend/server.log`
- Monitor database size: `ca_database.db`
- Track user access via application logs

---

## Additional Resources

- **Full Guide:** See [LAN_SHARING_GUIDE.md](LAN_SHARING_GUIDE.md)
- **Server Code:** [backend/server.py](backend/server.py)
- **Configuration Template:** [backend/.env.example](backend/.env.example)
- **REL Website Guide:** [../Rel Website/LAN_SHARING_GUIDE.md](../Rel%20Website/LAN_SHARING_GUIDE.md)

---

**Last Updated:** 2024
**Configuration Version:** 1.0
**Default Port:** 8001
**Status:** Ready for Local Network Sharing
