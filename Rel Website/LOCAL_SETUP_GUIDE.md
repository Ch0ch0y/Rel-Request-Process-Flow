# Rel Request Process Flow - Local Setup Guide

## Complete Offline Access Setup

This guide will help you set up the application on your local machine for complete offline access.

---

## Prerequisites

### Required Software:
1. **Python 3.11+** - [Download](https://www.python.org/downloads/)
2. **Node.js 18+** - [Download]https://nodejs.org/()
3. **MongoDB** - [Download](https://www.mongodb.com/try/download/community)
4. **Yarn** - Install via: `npm install -g yarn`

---

## Step 1: Download the Code

### Option A: Via GitHub (Recommended)
1. In Emergent platform, click "Save to GitHub"
2. Clone your repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
   cd YOUR_REPO
   ```

### Option B: Manual Download
1. Download the code package from Emergent
2. Extract to your desired location
3. Navigate to the folder

---

## Step 2: Install MongoDB Locally

### Windows:
1. Download MongoDB Community Server
2. Install with default settings
3. MongoDB runs automatically on `mongodb://localhost:27017`

### Mac:
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

### Linux:
```bash
sudo apt-get install mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

**Verify MongoDB is running:**
```bash
mongosh
# Should connect to MongoDB shell
```

---

## Step 3: Backend Setup

### 1. Navigate to backend folder:
```bash
cd backend
```

### 2. Create Python virtual environment:
```bash
python -m venv venv

# Activate it:
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate
```

### 3. Install dependencies:
```bash
pip install -r requirements.txt
```

### 4. Configure environment variables:
Create `.env` file in `/backend/` folder:
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=rel_request_db
JWT_SECRET=your-secret-key-change-this
CORS_ORIGINS=http://localhost:3000
```

### 5. Start backend server:
```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Backend should now run at:** `http://localhost:8001`

---

## Step 4: Frontend Setup

### 1. Open new terminal and navigate to frontend:
```bash
cd frontend
```

### 2. Install dependencies:
```bash
yarn install
```

### 3. Configure environment variables:
Create `.env` file in `/frontend/` folder:
```env
REACT_APP_BACKEND_URL=http://localhost:8001
PORT=3000
```

### 4. Start frontend:
```bash
yarn start
```

**Frontend should now run at:** `http://localhost:3000`

---

## Step 5: Create Initial Admin User

1. Open browser: `http://localhost:3000`
2. Click "Register" tab
3. Fill in:
   - Username: Admin
   - Email: admin@yourcompany.com
   - Password: (your password)
   - Role: **Admin**
4. Click "Create Account"
5. Login with your credentials

---

## Step 6: Enable Complete Offline Mode

### Install as PWA (Progressive Web App):

**On Chrome/Edge:**
1. Visit `http://localhost:3000`
2. Click the install icon (➕) in address bar
3. Click "Install"
4. App opens as standalone application

**On Mobile:**
1. Open site in browser
2. Click "Add to Home Screen"
3. Opens like native app

### Benefits:
- ✅ Works without internet after installation
- ✅ Desktop/mobile app icon
- ✅ Standalone window (no browser UI)
- ✅ Offline data access

---

## Testing Offline Mode

1. Start all services (MongoDB, Backend, Frontend)
2. Visit `http://localhost:3000` and use the app
3. Install as PWA
4. Disconnect internet
5. Reopen the app - everything works!

---

## Running Without Internet

Once set up, to use completely offline:

1. **Start MongoDB:**
   ```bash
   # Usually starts automatically on boot
   # Or manually:
   # Windows: net start MongoDB
   # Mac: brew services start mongodb-community
   # Linux: sudo systemctl start mongodb
   ```

2. **Start Backend:**
   ```bash
   cd backend
   source venv/bin/activate  # Windows: venv\Scripts\activate
   uvicorn server:app --host 0.0.0.0 --port 8001 --reload
   ```

3. **Start Frontend:**
   ```bash
   cd frontend
   yarn start
   ```

4. **Access:** Open `http://localhost:3000` in browser (or use installed PWA)

---

## Production Deployment (Optional)

For permanent local server without needing to run commands:

### Option A: Docker (Recommended)
Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  backend:
    build: ./backend
    ports:
      - "8001:8001"
    environment:
      - MONGO_URL=mongodb://mongodb:27017
      - DB_NAME=rel_request_db
    depends_on:
      - mongodb

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_BACKEND_URL=http://localhost:8001

volumes:
  mongo_data:
```

Run with: `docker-compose up -d`

### Option B: System Services
Set up as Windows Service or Linux systemd service for auto-start on boot.

---

## Troubleshooting

### Backend won't start:
- Check MongoDB is running: `mongosh`
- Check port 8001 is free: `netstat -an | grep 8001`
- Verify .env file exists with correct values

### Frontend won't connect to backend:
- Verify REACT_APP_BACKEND_URL=http://localhost:8001
- Check backend is running: `curl http://localhost:8001/api/`
- Clear browser cache

### MongoDB connection failed:
- Verify MongoDB service is running
- Check MONGO_URL in backend/.env
- Try: `mongosh mongodb://localhost:27017`

---

## Features Available Offline

✅ All authentication (login/register)
✅ Create, edit, delete requests
✅ Update process steps
✅ Search and filter requests
✅ Dashboard with statistics
✅ User management
✅ Import from Excel/CSV
✅ Export to CSV
✅ Print reports
✅ Settings configuration

**Everything works 100% offline once set up!**

---

## Support

For issues during setup:
- Check MongoDB logs
- Check backend logs (console output)
- Check frontend console (browser DevTools)
- Verify all environment variables are set correctly

Your data is stored locally in MongoDB, completely private and offline-accessible.
