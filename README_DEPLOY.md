# MahanterERP - Deployment Guide

## What's in this Package

| Item | Description |
|---|---|
| Source code | All React frontend + Node.js backend files |
| `backup/database.dump` | Full PostgreSQL database export (all schemas + data) |
| `deploy.bat` | One-click deployment script |
| `setup-autostart.ps1` | Windows auto-start on boot |
| `server/prisma/` | Database schema for sync |

---

## Prerequisites (Install on target server FIRST)

1. **Node.js** v18+ → https://nodejs.org
2. **PostgreSQL** 15+ → https://www.postgresql.org/download/windows/
   - During install, set password. Note it — you'll need it in `deploy.bat`.
   - Ensure `pg_restore`, `pg_dump`, `createdb` are in PATH:
     Add `C:\Program Files\PostgreSQL\15\bin` to System Environment Variables → PATH

---

## Deployment Steps

### Step 1 — Configure deploy.bat

Open `deploy.bat` in Notepad and update these lines:

```bat
set DB_HOST=localhost
set DB_PORT=5432
set DB_NAME=erp_production          ← choose a database name
set DB_USER=postgres
set DB_PASSWORD=YOUR_POSTGRES_PWD   ← your PostgreSQL password
set APP_PORT=3005                   ← backend port (keep default)
set FRONTEND_PORT=4173              ← frontend port (keep default)
set JWT_SECRET=your-secret-here     ← use a strong random string
```

### Step 2 — Run Deployment

Open **Command Prompt as Administrator**, navigate to the folder, and run:

```cmd
deploy.bat
```

This will automatically:
- ✅ Write correct `.env` files
- ✅ Restore the PostgreSQL database from `backup/database.dump`
- ✅ Install all Node.js dependencies
- ✅ Sync the Prisma schema
- ✅ Build the frontend
- ✅ Start both backend and frontend servers

### Step 3 — Access the App

Open browser: `http://localhost:4173`

---

## Running on a Different Port / Domain

If you want to access via IP (e.g., `http://192.168.1.100:4173`):

1. The app auto-detects the server IP and routes API calls to `:3005`
2. Open `utils/apiConfig.ts` and confirm it matches your setup
3. Make sure Windows Firewall allows inbound on ports **3005** and **4173**

---

## Auto-Start on Windows Boot

To make the app start automatically when the server restarts:

```powershell
# Run PowerShell as Administrator
Set-ExecutionPolicy RemoteSigned -Scope LocalMachine
.\setup-autostart.ps1
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `pg_restore not found` | Add PostgreSQL bin to PATH, restart cmd |
| `Port already in use` | Change port in `deploy.bat` |
| `Login fails` | Check JWT_SECRET matches between .env files |
| `No data visible` | Check DB restore log: `deploy_log.txt` |
| Backend not starting | Run `cd server && npm run start` manually to see errors |

---

## Database Only — Restore to Existing PostgreSQL

If you only need to restore the database:

```cmd
set PGPASSWORD=your_password
createdb -U postgres erp_production
pg_restore -U postgres -d erp_production --no-owner -v backup\database.dump
```

---

## Support

Keep the `.env` files secure — they contain your database credentials.
