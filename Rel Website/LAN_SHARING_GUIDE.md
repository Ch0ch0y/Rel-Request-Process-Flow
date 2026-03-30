# LAN Sharing Guide - Rel Request Process Flow

This guide explains how to make the Rel Request Process Flow application accessible to other computers on your local network.

## Quick Start

### Option 1: Run Directly (Easiest)

```powershell
cd "path\to\Rel Website"
python backend/server.py
```

The server will start on **ALL network interfaces** (`0.0.0.0:8000`), making it accessible from other machines.

### Option 2: Run as 24/7 Service (Recommended for Production)

```powershell
cd "path\to\Rel Website"
.\run_lan_service.ps1
```

This will:
- Start the server in a loop with auto-restart on crash
- Show the LAN IP address on startup
- Keep running even if you close the terminal

### Option 3: Install as Windows Service (For Always-On)

```powershell
.\run_lan_service.ps1 -Install
```

The service will:
- Auto-start when Windows boots
- Run in the background (no console window)
- Auto-restart if it crashes

To start the service immediately without rebooting:
```powershell
Start-ScheduledTask -TaskName "RelRequestWebsite"
```

To view the service logs:
```powershell
Get-Content "backend\service.log" -Tail 50
```

To uninstall the service:
```powershell
.\run_lan_service.ps1 -Uninstall
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

### On Other Machines

**Windows:**
```cmd
ipconfig
```
Look for the server machine's IPv4 address in your network.

**Mac/Linux:**
```bash
ifconfig
```

---

## Accessing from Other Machines

Once the server is running, access it from any machine on your local network:

### From Browser
```
http://<SERVER_IP>:8000/login
```

**Example:**
- If server IP is `192.168.1.100`: http://192.168.1.100:8000/login
- If server IP is `10.0.0.50`: http://10.0.0.50:8000/login

### From the Server Machine
- **Localhost access:** http://localhost:8000/login
- **LAN access:** http://<YOUR_IP>:8000/login

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
2. Windows Firewall is not blocking port 8000 (see below)
3. Server is actually running

---

## Firewall Configuration

### Enable Port 8000 (If Blocked)

**Option A: Using PowerShell (Admin)**
```powershell
# Run PowerShell as Administrator, then:
netsh advfirewall firewall add rule name="Rel Request Port 8000" dir=in action=allow protocol=tcp localport=8000
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
5. Select "TCP" and enter port `8000` → "Next"
6. Select "Allow the connection" → "Next"
7. Check "Domain", "Private", "Public" → "Next"
8. Name it "Rel Request 8000" → "Finish"

---

## Configuration Options

### Environment Variables

You can customize the server behavior by setting environment variables:

```powershell
# In PowerShell, before running the server:
$env:HOST = "0.0.0.0"      # Listen on all interfaces (default)
$env:PORT = "8000"         # Server port (default)
$env:WORKERS = "1"         # Number of worker processes (default: 1)
$env:RELOAD = "false"      # Auto-reload on code changes (default: false)

python backend/server.py
```

Or create a `.env` file in the `backend/` directory:
```
HOST=0.0.0.0
PORT=8000
WORKERS=1
RELOAD=false
```

### Change Port

If port 8000 is already in use, use a different port:

```powershell
$env:PORT = "9000"
python backend/server.py
```

Then access the application at `http://<SERVER_IP>:9000/login`

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
Get-Content backend\service.log -Tail 50
```

**Common issues:**
- Python not found: Ensure `.venv` is properly set up
- Port already in use: Change `PORT` environment variable
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

## Monitoring & Maintenance

### Check Server Status

```powershell
# Check if port 8000 is listening
netstat -ano | findstr :8000

# Check running Python processes
Get-Process python -ErrorAction SilentlyContinue
```

### View Recent Activity

```powershell
# Last 100 log lines
Get-Content backend\service.log -Tail 100

# Real-time monitoring
Get-Content backend\service.log -Tail 50 -Wait
```

### Restart the Server

```powershell
# If running in console
# Press Ctrl+C

# If running as service
Stop-ScheduledTask -TaskName "RelRequestWebsite"
Start-ScheduledTask -TaskName "RelRequestWebsite"
```

---

## Advanced: Docker Deployment

For containerized LAN deployment:

```bash
docker-compose up
```

Access at: `http://<SERVER_IP>:8000/login`

See `docker-compose.yml` for configuration details.

---

## Summary of Access Methods

| Method | Command | Best For |
|--------|---------|----------|
| **Direct** | `python backend/server.py` | Development, testing |
| **LAN Service** | `.\run_lan_service.ps1` | Production, 24/7 access |
| **Windows Service** | `.\run_lan_service.ps1 -Install` | Always-on, auto-restart |
| **Docker** | `docker-compose up` | Container environments |

---

**Questions or Issues?** Check the server logs or contact your system administrator.
