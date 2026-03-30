# LAN Sharing Guide - CA Website

This guide explains how to make the CA Website application accessible to other computers on your local network.

## Quick Start

### Option 1: Run Directly (Easiest)

```powershell
cd "ca-website"
python backend/server.py
```

The server will start on **port 8001** and listen on all network interfaces (`0.0.0.0`), making it accessible from other machines.

### Option 2: Run as 24/7 Service (Recommended)

```powershell
cd "ca-website"
.\run_lan_service.ps1
```

This will:
- Start the server in a loop with auto-restart on crash
- Show the LAN IP address on startup
- Keep running even if you close the terminal

### Option 3: Quick-Start Scripts

```powershell
# Option A: Batch script (Windows)
cd "ca-website"
.\start_lan.bat

# Option B: PowerShell script
cd "ca-website"
.\start_lan.ps1
```

---

## Finding Your LAN IP Address

### On the Server Machine (Windows)

**Option A: PowerShell**
```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' } | Select-Object IPAddress, InterfaceAlias
```

**Option B: Command Prompt**
```cmd
ipconfig
```

Look for "IPv4 Address" (usually something like `192.168.x.x` or `10.0.x.x`)

---

## Accessing from Other Machines

Once the server is running, access it from any machine on your local network:

### From Browser
```
http://<SERVER_IP>:8001/login
```

**Example:**
- If server IP is `192.168.1.100`: http://192.168.1.100:8001/login
- If server IP is `10.0.0.50`: http://10.0.0.50:8001/login

### From the Server Machine
- **Localhost access:** http://localhost:8001/login
- **LAN access:** http://<YOUR_IP>:8001/login

### Checking Connectivity

To verify the server is reachable from another machine:

**Windows:**
```cmd
ping <SERVER_IP>
```

**Mac/Linux:**
```bash
ping <SERVER_IP>
```

If ping fails, check:
1. Both machines are on the same network
2. Windows Firewall is not blocking port 8001 (see below)
3. Server is actually running

---

## Firewall Configuration

### Enable Port 8001 (If Blocked)

**Option A: Using PowerShell (Admin)**
```powershell
# Run PowerShell as Administrator, then:
netsh advfirewall firewall add rule name="CA Website Port 8001" dir=in action=allow protocol=tcp localport=8001
```

**Option B: Using Batch Script**
```bash
# Run Command Prompt or PowerShell as Administrator, and execute:
open_firewall.bat
```

**Option C: Manual (GUI)**
1. Press `Windows Key + R`
2. Type `wf.msc` and press Enter
3. Click "Inbound Rules" → "New Rule"
4. Select "Port" → "Next"
5. Select "TCP" and enter port `8001` → "Next"
6. Select "Allow the connection" → "Next"
7. Check "Domain", "Private", "Public" → "Next"
8. Name it "CA Website 8001" → "Finish"

---

## Configuration Options

### Environment Variables

You can customize the server behavior by setting environment variables:

```powershell
# In PowerShell, before running the server:
$env:HOST = "0.0.0.0"      # Listen on all interfaces (default)
$env:PORT = "8001"         # Server port (default)
$env:CA_PORT = "8001"      # CA-specific port (takes precedence)
$env:WORKERS = "1"         # Number of worker processes (default: 1)
$env:RELOAD = "false"      # Auto-reload on code changes (default: false)

python backend/server.py
```

Or create a `.env` file in the `backend/` directory:
```
HOST=0.0.0.0
CA_PORT=8001
WORKERS=1
RELOAD=false
```

### Change Port

If port 8001 is already in use, use a different port:

```powershell
$env:CA_PORT = "9001"
python backend/server.py
```

Then access the application at `http://<SERVER_IP>:9001/login`

---

## Troubleshooting

### "Connection Refused" Error

**Cause:** Server is not running  
**Solution:** Start the server using one of the options above

### "Cannot Connect" from Another Machine

**Possible causes:**
1. Server is listening on localhost only (shouldn't happen with our setup)
   - **Fix:** Ensure `HOST=0.0.0.0` is set

2. Windows Firewall is blocking the port
   - **Fix:** Run `open_firewall.bat` or manually add firewall rule

3. Machines are on different networks
   - **Fix:** Ensure both machines are on the same WiFi/LAN network

4. Network has IP filtering enabled
   - **Fix:** Configure network administrator to allow traffic

### Server Crashes on Startup

**Check the logs:**
```powershell
# Look at error messages in console output
```

**Common issues:**
- Python not found: Ensure `.venv` is properly set up
- Port already in use: Change `CA_PORT` environment variable
- Missing dependencies: Run `pip install -r backend/requirements.txt`

### Performance Issues

If the application is slow from other machines:
- Check network bandwidth: Run a speed test
- Monitor server CPU/Memory: Use Task Manager on server
- Reduce `WORKERS` count: Set `WORKERS=1` (default) for single-user

---

## Network Security

### For External/Public Networks (NOT Recommended)

**⚠️ DO NOT expose this application to the internet without proper security!**

If you must expose to external networks:

1. **Enable HTTPS:**
   - Use a reverse proxy (nginx, Apache)
   - Obtain SSL certificate (Let's Encrypt)
   - Configure SSL in the proxy

2. **Add Authentication:**
   - Use strong passwords
   - Implement rate limiting
   - Consider OAuth2/Single Sign-On

3. **Network Isolation:**
   - Use VPN for remote access
   - Configure firewall rules to limit access
   - Whitelist specific IP ranges

### For Local Network (Secure)

For local network sharing only:
- Ensure all machines are behind the same corporate/home firewall
- Use Windows authentication if available
- Monitor access logs regularly
- Keep the server on a dedicated machine if possible

---

## CA Website Specific Notes

### Port Convention
- **CA Website:** Port 8001 (Construction Analysis)
- **REL Website:** Port 8000 (Reliability Request)

This allows both instances to run simultaneously on the same machine without port conflicts.

### Database Location
- CA Website uses: `ca-website/backend/ca_database.db`
- REL Website uses: `Rel Website/backend/rel_database.db`

These are isolated databases, but CA Website can sync users from the REL database.

### Cross-Website Navigation
- CA Website has a "Reliability Request (Rel Website)" link to access REL Website
- Both sites can run on the same machine/network with different ports

---

## Monitoring & Maintenance

### Check Server Status

```powershell
# Check if port 8001 is listening
netstat -ano | findstr :8001

# Check running Python processes
Get-Process python -ErrorAction SilentlyContinue
```

### Restart the Server

```powershell
# If running in console
# Press Ctrl+C

# If running as service
Stop-ScheduledTask -TaskName "CAWebsite"
Start-ScheduledTask -TaskName "CAWebsite"
```

---

## Summary of Access Methods

| Method | Command | Best For |
|--------|---------|----------|
| **Direct** | `python backend/server.py` | Development, testing |
| **LAN Service** | `.\run_lan_service.ps1` | Production, 24/7 access |
| **Quick Start** | `.\start_lan.bat or .ps1` | Quick testing |
| **Windows Service** | `.\run_lan_service.ps1 -Install` | Always-on, auto-restart |

---

**Questions or Issues?** Check the error logs or contact your system administrator.
