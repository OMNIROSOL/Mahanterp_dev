@echo off
echo Enabling IIS Application Request Routing (ARR) Proxy...
"%windir%\system32\inetsrv\appcmd.exe" set config -section:system.webServer/proxy /enabled:"True" /commit:apphost
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo SUCCESS: IIS Application Request Routing Proxy is ENABLED!
    echo ========================================================
) else (
    echo.
    echo ========================================================
    echo FAILED: Please right-click enable-iis-proxy.bat and choose
    echo "Run as administrator".
    echo ========================================================
)
pause
