# Application Made Shareable on Local Network ✅

## Changes Completed

Your Rel Request Process Flow application has been successfully configured for local network sharing!

### 1. **Backend Server Configuration**
- ✅ Added uvicorn startup block to `backend/server.py`
- ✅ Server now listens on `0.0.0.0` (all network interfaces) by default
- ✅ Supports environment variable configuration for HOST, PORT, WORKERS, and RELOAD

### 2. **Startup Scripts Created**

#### Quick Start Scripts:
1. **`start_lan.bat`** - Windows batch file
   - Auto-detects LAN IP address
   - Shows both localhost and network URLs
   - One-click startup

2. **`start_lan.ps1`** - PowerShell script
   - Enhanced IP detection
   - Colored output
   - Validates virtual environment
   - Better for troubleshooting

#### Existing Service Scripts:
3. **`run_lan_service.ps1`** - Already LAN-ready
   - Run interactively for testing
   - Install as Windows Service for 24/7 operation
   - Auto-restart on crash

### 3. **Environment Configuration**
- ✅ Updated `backend/.env.example` with LAN settings
- ✅ Key settings documented:
  - `HOST=0.0.0.0` - Listen on all interfaces
  - `PORT=8000` - Server port (adjustable)
  - `WORKERS=1 - Default worker count
  - `RELOAD=false` - No auto-reload in production

### 4. **Documentation Created**

1. **`LAN_SHARING_GUIDE.md`** (Comprehensive)
   - Complete setup instructions
   - Multiple access options
   - Firewall configuration
   - Troubleshooting guide
   - Security considerations

2. **`LAN_SETUP_SUMMARY.md`** (Quick Reference)
   - All changes documented
   - Quick start steps
   - File modifications list
   - Next steps checklist

## How to Use

### Option 1: Fastest Start (Recommended for Testing)
```
Double-click: start_lan.bat

or

PowerShell: .\start_lan.ps1
```

**What happens:**
- Server starts
- Displays your network IP address
- Shows login URL
- Ready to access from other machines

### Option 2: 24/7 Service (Production)
```powershell
# Install as Windows Service (one-time):
.\run_lan_service.ps1 -Install

# Start the service:
Start-ScheduledTask -TaskName "RelRequestWebsite"

# Access at: http://<your-ip>:8000/login
```

### Option 3: Direct Python Execution
```powershell
# Activate virtual environment:
.\.venv\Scripts\Activate.ps1

# Run server:
python backend/server.py

# Available at: http://localhost:8000
```

## Accessing from Other Machines

Once the server is running, access it from any machine on your network:

**Find your LAN IP:**

```powershell
ipconfig
```

Look for IPv4 Address (usually format: 192.168.x.x or 10.0.x.x)

**Access the application:**

```
http://<YOUR_IP>:8000/login
```

Example: `http://192.168.1.100:8000/login`

## Network Requirements

### 1. Same Network
- All machines must be on the same WiFi/LAN network
- Windows and other devices are supported

### 2. Firewall Configuration
If you see "Connection Refused" errors:

```powershell
# Option A: Run as Administrator and execute:
netsh advfirewall firewall add rule name="Rel Request Port 8000" dir=in action=allow protocol=tcp localport=8000

# Option B: Run the batch script:
open_firewall.bat

# Option C: Windows Firewall GUI is also available
```

### 3. Check Connectivity
```powershell
# From another machine, verify network:
ping <server-ip>

# If ping fails:
- Check both machines are on same network
- Check Windows Firewall is allowing the port
- Check server is actually running
```

## File Reference

**Created/Modified Files:**

| File | Type | Purpose |
|------|------|---------|
| `backend/server.py` | Modified | Added uvicorn startup block |
| `start_lan.bat` | New | Quick-start batch script |
| `start_lan.ps1` | New | Enhanced PowerShell starter |
| `backend/.env.example` | Updated | LAN configuration template |
| `LAN_SHARING_GUIDE.md` | New | Complete setup documentation |
| `LAN_SETUP_SUMMARY.md` | New | Quick reference guide |

## Environment Variables

You can customize behavior by setting environment variables:

```powershell
# Before running server:
$env:HOST = "0.0.0.0"      # Listen on all interfaces (required for LAN)
$env:PORT = "8000"         # Change port if needed
$env:WORKERS = "1"         # Increase for heavy load
$env:RELOAD = "false"      # Keep false for production

python backend/server.py
```

## Testing the Setup

1. **Start server locally:**
   ```
   .\start_lan.ps1
   ```

2. **Open browser on same machine:**
   ```
   http://localhost:8000/login
   ```

3. **From another machine, use:**
   ```
   http://<YOUR_IP>:8000/login
   ```

4. **Verify network communication:**
   ```
   ping <server-ip>
   ```

## Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| "Connection Refused" | Server not running. Run starter script. |
| "Can't connect from other machine" | Check firewall. Run `open_firewall.bat`. |
| "Port already in use" | Change PORT env variable. `$env:PORT = 9000` |
| "Can't find LAN IP" | Run `ipconfig` in Command Prompt. Look for IPv4. |
| "Firewall blocked" | Add firewall rule (command shown above). |

## Next Steps

1. ✅ Start the server using one of the startup scripts
2. ✅ Connect from any machine on your network
3. ✅ (Optional) Install as Windows Service for 24/7 operation
4. ✅ (Optional) Add other machines by giving them the network URL

## Documentation Links

- **Full Setup Guide:** See `LAN_SHARING_GUIDE.md`
- **Changes Summary:** See `LAN_SETUP_SUMMARY.md`
- **Server Configuration:** See `backend/.env.example`

---

**Your application is now ready for network sharing!** 🚀

Questions? Check the comprehensive guides in `LAN_SHARING_GUIDE.md` or run the startup scripts with `--help` for more options.
