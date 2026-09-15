@echo off
REM =====================================================================
REM  FIX: EPERM error for npx prisma generate on Windows
REM  Run this script as Administrator in C:\MAHANTERP\server
REM =====================================================================

echo [1/4] Stopping any running Node.js processes...
taskkill /F /IM node.exe /T >nul 2>&1
echo       Done.

echo.
echo [2/4] Deleting locked Prisma client cache...
if exist "node_modules\.prisma" (
    rd /s /q "node_modules\.prisma"
    echo       Deleted node_modules\.prisma
) else (
    echo       Not found, skipping.
)

if exist "node_modules\@prisma\client\runtime" (
    rd /s /q "node_modules\@prisma\client\runtime"
    echo       Deleted @prisma\client\runtime
)

echo.
echo [3/4] Running prisma generate...
call npx prisma generate
if %errorlevel% neq 0 (
    echo.
    echo ERROR: prisma generate still failed.
    echo Try running this script as Administrator.
    pause
    exit /b 1
)

echo.
echo [4/4] Done! Starting server...
call npm run start

pause
