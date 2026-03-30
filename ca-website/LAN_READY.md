# CA Website - LAN Ready ✅

Your CA Website backend is ready for local network access. Here's how to get started right now.

---

## 🚀 Get Started in 30 Seconds

### Step 1: Open PowerShell

Press `Ctrl + Alt + T` or search for "PowerShell"

### Step 2: Navigate to CA Website
```powershell
cd "C:\path\to\ca-website"
```

### Step 3: Start the Server
```powershell
.\start_lan.ps1
```

**You'll see output like:**
```
Activating virtual environment...
Server running on: http://192.168.1.50:8001
Opening in browser...
```

### Step 4: Access from Another Machine
```
http://192.168.1.50:8001/login
```
(Replace 192.168.1.50 with the actual IP shown in Step 3)

---

## 📍 Find Your Server's IP Address

The startup script shows it automatically. If you need it manually:

**PowerShell:**
```powershell
(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch "Loopback" }).IPAddress
```

**Command Prompt:**
```cmd
ipconfig
```
Look for "IPv4 Address" under your network adapter.

---

## 🔥 Firewall: One-Time Setup

Run this once to allow network access:

```powershell
# Run PowerShell as Administrator (right-click → Run as Administrator)
open_firewall.bat
```

Or manually: Press `Alt + Tab` to open "firewall", then:
1. Click "Allow an app through firewall"
2. Click "Change settings" (if prompted for admin)
3. Click "Allow another app" → Select "python.exe" → Add

---

## 📡 Access Methods

### **From the Server Machine:**
- Localhost: http://localhost:8001/login
- Network: http://192.168.x.x:8001/login

### **From Another Machine on the Network:**
- http://192.168.x.x:8001/login
- (Replace with actual server IP)

### **Testing Connection:**
```bash
# Check if you can reach the server
ping 192.168.x.x
```

---

## ⚙️ Startup Options

### **Option 1: PowerShell (Best)**
```powershell
cd ca-website
.\start_lan.ps1
```
✅ Best output, auto IP detection, colored text

### **Option 2: Batch Script**
```cmd
cd ca-website
start_lan.bat
```
✅ Simple, works on all Windows versions

### **Option 3: Direct Python**
```powershell
cd ca-website
python backend/server.py
```
✅ Basic, minimal output

### **Option 4: 24/7 Service**
```powershell
cd ca-website
.\run_lan_service.ps1
```
✅ Runs in background, auto-restart on crash

---

## 🎯 Quick Troubleshooting

**"module not found"**
```powershell
cd ca-website
pip install -r backend/requirements.txt
```

**"Port 8001 already in use"**
```powershell
$env:CA_PORT = "8002"
python backend/server.py
```

**"Cannot connect from other machine"**
1. Is server running? (look for "Server running on" message)
2. Is firewall configured? (run `open_firewall.bat`)
3. Are machines on same network? (try `ping` test)

**"Python not found"**
1. Activate virtual environment: `.\.venv\Scripts\Activate.ps1`
2. Try again: `python backend/server.py`

---

## 📋 Checklist Before Sharing

- [ ] Run `.\start_lan.ps1` and see "Server running on..." message
- [ ] See IP address displayed (e.g., 192.168.x.x)
- [ ] Firewall configured: `open_firewall.bat`
- [ ] Test from same machine: http://localhost:8001/login
- [ ] Test from another machine: http://<IP>:8001/login
- [ ] Can login successfully

---

## 🖥️ Running Both Websites Simultaneously

Both CA Website (8001) and REL Website (8000) can run at the same time:

**Terminal 1 - CA Website:**
```powershell
cd ca-website
.\start_lan.ps1
```

**Terminal 2 - REL Website:**
```powershell
cd ..\Rel\ Website
.\start_lan.ps1
```

**Access:**
- CA: http://localhost:8001/login
- REL: http://localhost:8000/login

---

## 📞 Need Help?

- **Full Guide:** [LAN_SHARING_GUIDE.md](LAN_SHARING_GUIDE.md)
- **Config Reference:** [LAN_SETUP_SUMMARY.md](LAN_SETUP_SUMMARY.md)
- **Network Issues:** Check [LAN_SHARING_GUIDE.md](LAN_SHARING_GUIDE.md#troubleshooting)

---

**Status:** ✅ Ready to share on local network  
**Default Port:** 8001  
**Database:** ca_database.db  
**Last Updated:** 2024
