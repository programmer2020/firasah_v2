# Firasah AI - Quick Start Guide

Get up and running with Firasah AI in 5 minutes!

## Prerequisites

Make sure you have installed:
- Node.js 20.17.0+
- PostgreSQL 12+

## Quick Start (Windows PowerShell or Bash)

### Step 1: Setup PostgreSQL Database

Open PowerShell as Administrator:

```powershell
# Connect to PostgreSQL
psql -U postgres

# In psql, create database
CREATE DATABASE firasah_ai;
\q

# Load schema
cd d:\Projects\_Firasah-Ai-V2.0.0.1\backend
psql -U postgres -d firasah_ai -f database/schema.sql
```

### Step 2: Start Backend (Terminal 1)

```bash
cd d:\Projects\_Firasah-Ai-V2.0.0.1\backend
npm install
npm run dev
```

Wait for:
```
Server is running on port 5000
Database connected successfully
```

### Step 3: Start Frontend (Terminal 2)

```bash
cd d:\Projects\_Firasah-Ai-V2.0.0.1\frontend
npm install
npm run dev
```

Wait for:
```
➜  Local:   http://localhost:5173/
```

### Step 4: Open Application

Open browser: `http://localhost:5173`

### Step 5: Register & Login

1. Click "Register here"
2. Fill in details:
   - Name: Your Name
   - Email: your@email.com
   - Password: password123
3. Click Register
4. Login with your credentials
5. Explore Dashboard!

## What Now?

- **Explore UI**: Navigate through different management pages
- **Try API**: Visit `http://localhost:5000/api-docs` for API documentation
- **Manage Data**: Add schools, teachers, classes (when backend routes are added)

## Stop Services

- Backend: Press `Ctrl + C` in Terminal 1
- Frontend: Press `Ctrl + C` in Terminal 2

## Troubleshooting

### Database Error
- Ensure PostgreSQL is running
- Verify schema loaded: `psql -U postgres -d firasah_ai -c "\dt"`

### Port Already in Use
- Port 5000 (backend): Kill process using port 5000
- Port 5173 (frontend): Kill process using port 5173

### CORS Error
- Ensure backend is running on http://localhost:5000
- Check .env CORS_ORIGIN setting

## Next Steps

1. Read `COMPLETE_SETUP_GUIDE.md` for detailed configuration
2. Check `backend/FULL_DOCUMENTATION.md` for API details
3. Review `frontend/FRONTEND_README.md` for React components

---

**Need Help?** See the full guides in project root folder.
