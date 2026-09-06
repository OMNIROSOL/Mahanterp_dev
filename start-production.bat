@echo off
:: ERP Production Startup Script
:: Starts the production backend on port 3002

title ERP Backend
cd /d "c:\MAHANTERP\server"

echo [ERP] Starting ERP Production Backend on port 3002...
start "ERP Backend" cmd /c "node dist/index.js"

echo [ERP] Backend service initialized on port 3002.
