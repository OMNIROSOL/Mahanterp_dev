@echo off
:: ERP Startup Script
:: This script starts both the Backend and Frontend development servers.

echo [1/2] Starting ERP Backend on port 3001...
cd /d "d:\erp\server"
start "ERP Backend" cmd /c "npm run dev"

echo [2/2] Starting ERP Frontend (Vite)...
cd /d "d:\erp"
start "ERP Frontend" cmd /c "npm run dev"

echo ERP Application services initialized.
