@echo off
REM =====================================================================
REM  MAHANTERP ERP - BACKUP SCRIPT
REM  Run this on the SOURCE (current) server to package everything
REM  Output: backup\MahanterERP_Backup_YYYYMMDD.zip
REM =====================================================================

setlocal enabledelayedexpansion

echo.
echo  ============================================================
echo    MAHANTERP ERP - CREATING DEPLOYMENT PACKAGE
echo  ============================================================
echo.

REM -- DB settings (current server)
set DB_HOST=localhost
set DB_PORT=5432
set DB_NAME=erp_testing
set DB_USER=postgres
set DB_PASSWORD=1234

REM -- Output folder
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set DT=%%I
set DATE_TAG=%DT:~0,8%
set BACKUP_DIR=MahanterERP_Backup_%DATE_TAG%

echo [1/5] Creating backup folder: %BACKUP_DIR%...
if exist "%BACKUP_DIR%" rmdir /s /q "%BACKUP_DIR%"
mkdir "%BACKUP_DIR%"
mkdir "%BACKUP_DIR%\backup"
mkdir "%BACKUP_DIR%\server"
echo       Done.

echo.
echo [2/5] Dumping PostgreSQL database...
REM -- Try to find pg_dump in common locations
set PGDUMP_EXE=pg_dump
if exist "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" set PGDUMP_EXE=C:\Program Files\PostgreSQL\18\bin\pg_dump.exe
if exist "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" set PGDUMP_EXE=C:\Program Files\PostgreSQL\17\bin\pg_dump.exe
if exist "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" set PGDUMP_EXE=C:\Program Files\PostgreSQL\16\bin\pg_dump.exe
if exist "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe" set PGDUMP_EXE=C:\Program Files\PostgreSQL\15\bin\pg_dump.exe

set PGPASSWORD=%DB_PASSWORD%
"%PGDUMP_EXE%" -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -Fc -f "%BACKUP_DIR%\backup\database.dump"
if %errorlevel% neq 0 (
    echo ERROR: Database dump failed. Make sure pg_dump is in PATH.
    echo   Add C:\Program Files\PostgreSQL\XX\bin to your system PATH.
    pause & exit /b 1
)
echo       Database dumped to %BACKUP_DIR%\backup\database.dump

echo.
echo [3/5] Copying source code (excluding node_modules and dist)...
robocopy . "%BACKUP_DIR%" /E /XD node_modules dist .git scratch ^
    /XF *.log *.txt *.pdf *.xlsx shipments.json quotes.json out.json ^
    replace.js test.js test.cjs scratch_fetch.* ^
    /NFL /NDL /NJH /NJS >nul

REM Copy server folder excluding node_modules and dist
robocopy server "%BACKUP_DIR%\server" /E /XD node_modules dist ^
    /NFL /NDL /NJH /NJS >nul

echo       Source code copied.

echo.
echo [4/5] Copying deployment scripts...
copy deploy.bat "%BACKUP_DIR%\deploy.bat" >nul
copy setup-autostart.ps1 "%BACKUP_DIR%\setup-autostart.ps1" >nul
copy README_DEPLOY.md "%BACKUP_DIR%\README_DEPLOY.md" >nul 2>&1

REM Write README if it doesn't exist
if not exist "%BACKUP_DIR%\README_DEPLOY.md" (
    echo # MahanterERP Deployment > "%BACKUP_DIR%\README_DEPLOY.md"
    echo See deploy.bat for instructions >> "%BACKUP_DIR%\README_DEPLOY.md"
)
echo       Scripts copied.

echo.
echo [5/5] Creating ZIP archive...
powershell -Command "Compress-Archive -Path '%BACKUP_DIR%' -DestinationPath '%BACKUP_DIR%.zip' -Force"
if %errorlevel% equ 0 (
    echo       Archive created: %BACKUP_DIR%.zip
    echo       Cleaning up temp folder...
    rmdir /s /q "%BACKUP_DIR%"
) else (
    echo       ZIP failed. Folder %BACKUP_DIR% is ready to copy manually.
)

echo.
echo  ============================================================
echo    BACKUP COMPLETE!
echo    File: %BACKUP_DIR%.zip
echo    
echo    To deploy on another server:
echo      1. Copy the ZIP to the new server
echo      2. Extract it
echo      3. Edit deploy.bat (DB_PASSWORD, JWT_SECRET)
echo      4. Run deploy.bat as Administrator
echo  ============================================================
echo.
pause
