# LAN Sharing Configuration Summary

This document summarizes the changes made to enable local network sharing of the Rel Request Process Flow application.

## What Was Changed

### 1. **Backend Server Configuration** (`backend/server.py`)
- ✅ Added `if __name__ == "__main__"` block with uvicorn server startup
- ✅ Server now listens on `0.0.0.0` (all network interfaces) by default
- ✅ Configured to read `HOST` and `PORT` from environment variables
- ✅ Supports environment-based configuration for flexible deployment

**Key settings:**
```python
HOST=0.0.0.0        # Listen on ALL network interfaces for LAN access
PORT=8000           # Default port
WORKERS=1           # Single worker (adjust for heavy load)
```

### 2. **Startup Scripts Created/Updated**

#### `start_lan.bat` (New - Simple Batch Script)
- 🆕 Quick-start batch file for Windows
- 📍 Auto-detects and displays LAN IP address
- 🎯 Shows both localhost and network URLs
- 💻 Best for: Quick testing, single users

**Usage:**
```cmd
Double-click: start_lan.bat
or
Command line: start_lan.bat
```

#### `start_lan.ps1` (New - PowerShell Script)
- 🆕 Enhanced PowerShell startup script
- 📍 More robust IP detection
- 🎨 Colored output and formatting
- ✅ Virtual environment auto-activation
- 💻 Best for: Development, troubleshooting

**Usage:**
```powershell
.\start_lan.ps1
```

#### `run_lan_service.ps1` (Updated)
- ✅ Already configured for LAN access (host=0.0.0.0)
- 🔄 Can be run directly or installed as Windows Service
- 🔧 Auto-restart on crash
- 💻 Best for: Production, 24/7 operation

**Usage:**
```powershell
# Run interactively:
.\run_lan_service.ps1

# Install as Windows Service (auto-start):
.\run_lan_service.ps1 -Install

# Start the installed service:
Start-ScheduledTask -TaskName "RelRequestWebsite"

# Uninstall the service:
.\run_lan_service.ps1 -Uninstall
```

### 3. **Environment Configuration** (`backend/.env.example`)
- ✅ Updated with comprehensive LAN configuration options
- ✅ Added network settings (HOST, PORT)
- ✅ Added worker configuration
- ✅ Security recommendations
- ✅ Clear documentation for each option

**Key environment variables:**
```
HOST=0.0.0.0              # For LAN sharing
PORT=8000                 # Server port
WORKERS=1                 # Worker processes
JWT_SECRET=<change-me>    # Security key
CORS_ORIGINS=*            # API access control
```

### 4. **Comprehensive Documentation** (`LAN_SHARING_GUIDE.md`)
- 📖 Complete guide for LAN access setup
- 🔧 Firewall configuration instructions
- 🚀 Multiple deployment options
- 🆘 Troubleshooting section
- 🔐 Security guidelines for network exposure

## Quick Start Guide

### Option 1: Fastest - Just Double-Click
```
1. Double-click: start_lan.bat
2. Wait for startup message showing network URL
3. Open browser: http://<your-ip>:8000/login
```

### Option 2: PowerShell Alternative
```powershell
1. Run PowerShell and navigate to project directory
2. Execute: .\start_lan.ps1
3. Note the network URL displayed
4. Open browser: http://<your-ip>:8000/login
```

### Option 3: 24/7 Service (Production)
```powershell
# Install once:
.\run_lan_service.ps1 -Install

# Start the service:
Start-ScheduledTask -TaskName "RelRequestWebsite"

# Access: http://<your-ip>:8000/login
```

## Finding Your LAN IP Address

### Quick Windows Check
```cmd
ipconfig
```
Look for "IPv4 Address" (usually 192.168.x.x or 10.0.x.x)

### PowerShell Check
```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notmatch 'Loopback'}
```

## Firewall Configuration

### Automatic (Windows)
If you see a firewall dialog when starting the server, click "Allow".

### Manual Method
```powershell
# Run PowerShell as Administrator:
netsh advfirewall firewall add rule name="Rel Request Port 8000" dir=in action=allow protocol=tcp localport=8000

# Or run the batch script:
open_firewall.bat
```

## Frontend Compatibility

✅ **React Frontend** (if using frontend/dist):
- All API calls use relative paths (`/api/...`)
- Will automatically work with any host/port
- No changes needed

✅ **Jinja2 Templates** (server-rendered):
- Templates are served from Python backend
- Automatically work with LAN IP
- No static file serving needed

## Network Access Examples

### From Server Machine
```
Local: http://localhost:8000/login
LAN:   http://192.168.1.100:8000/login
```

### From Another Machine on Network
```
If server is at 192.168.1.100:
http://192.168.1.100:8000/login

If server is at 10.0.0.50:
http://10.0.0.50:8000/login
```

## Troubleshooting

### "Connection Refused"
- Check server is running (look for startup messages)
- Verify correct IP address
- Ensure both machines are on same network

### "Firewall blocked the port"
- Run `open_firewall.bat` with admin privileges
- Or manually add firewall rule (see above)

### "Cannot connect from other machine"
- Ping server to verify network connectivity: `ping <server-ip>`
- Check that machine is on same WiFi/LAN
- Verify firewall rule was applied

### Server crashes on startup
- Check logs with: `Get-Content backend\service.log -Tail 50`
- Verify port 8000 is not in use: `netstat -ano | findstr :8000`
- Try different port: `$env:PORT=9000; python backend/server.py`

## Configuration Options

### Change Port
```powershell
$env:PORT = "9000"
python backend/server.py
# Access: http://<your-ip>:9000/login
```

### Enable Hot Reload (Development)
```powershell
$env:RELOAD = "true"
python backend/server.py
```

### Use Multiple Workers (Heavy Load)
```powershell
$env:WORKERS = "4"
python backend/server.py
```

## Security Considerations

⚠️ **Local Network Only:**
- This setup is secure for local network use
- All machines should be behind corporate/home firewall
- Default passwords should be strong

🚫 **DO NOT expose to internet without:**
- HTTPS/SSL certificate
- Strong authentication (OAuth2, SSO)
- Rate limiting
- VPN for remote access

## Files Modified/Created

| File | Status | Purpose |
|------|--------|---------|
| `backend/server.py` | ✏️ Modified | Added uvicorn startup block |
| `start_lan.bat` | 🆕 Created | Quick-start batch script |
| `start_lan.ps1` | 🆕 Created | Enhanced PowerShell starter |
| `run_lan_service.ps1` | ✏️ Updated | Already LAN-ready |
| `backend/.env.example` | ✏️ Updated | Comprehensive config template |
| `LAN_SHARING_GUIDE.md` | 🆕 Created | Full LAN setup documentation |
| `LAN_SETUP_SUMMARY.md` | 🆕 This file | Configuration summary |

## Next Steps

1. **Verify Backend is Working:**
   ```powershell
   .\start_lan.ps1
   # Should show network URL
   ```

2. **Check Firewall (if needed):**
   ```powershell
   open_firewall.bat
   # Or manually add the rule
   ```

3. **Access from Another Machine:**
   - Copy the LAN URL from startup output
   - Paste into browser on another machine
   - Should see login page

4. **For Production (24/7):**
   ```powershell
   .\run_lan_service.ps1 -Install
   Start-ScheduledTask -TaskName "RelRequestWebsite"
   ```

## Getting Help

- For detailed docs: See `LAN_SHARING_GUIDE.md`
- For setup issues: Check server logs in `backend/service.log`
- For firewall issues: Run `open_firewall.bat`
- For port conflicts: Change PORT in environment

---

**All systems configured for local network sharing!** ✅
