param(
    [switch]$Uninstall
)

$shortcutName = "ERP_Start.lnk"
$startupFolder = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupFolder $shortcutName
$targetPath = "d:\erp\start-erp.bat"
$workingDirectory = "d:\erp"

if ($Uninstall) {
    Write-Host "Checking for existing auto-start shortcut..." -ForegroundColor Cyan
    if (Test-Path $shortcutPath) {
        try {
            Remove-Item $shortcutPath -Force
            Write-Host "Success: Auto-start shortcut removed from Startup folder." -ForegroundColor Green
            Write-Host "Path removed: $shortcutPath" -ForegroundColor Gray
        } catch {
            Write-Error "Failed to remove the shortcut: $_"
        }
    } else {
        Write-Host "No auto-start shortcut found at $shortcutPath" -ForegroundColor Yellow
    }
    exit 0
}

# Standard Setup
Write-Host "Configuring ERP application auto-start..." -ForegroundColor Cyan

# 1. Verify target file exists
if (-not (Test-Path $targetPath)) {
    Write-Error "Target startup script not found at '$targetPath'. Please make sure the ERP codebase is in 'd:\erp'."
    exit 1
}

# 2. Create the shortcut
try {
    Write-Host "Creating Windows Startup shortcut..." -ForegroundColor Cyan
    $wshShell = New-Object -ComObject WScript.Shell
    $shortcut = $wshShell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $targetPath
    $shortcut.WorkingDirectory = $workingDirectory
    $shortcut.Description = "Starts both ERP Backend and Frontend Vite servers automatically on login"
    $shortcut.IconLocation = "cmd.exe" # Use default command prompt icon
    $shortcut.Save()
    
    Write-Host "`nSuccess! ERP Application auto-start has been configured." -ForegroundColor Green
    Write-Host "Shortcut created at: $shortcutPath" -ForegroundColor Gray
    Write-Host "Target: $targetPath" -ForegroundColor Gray
    Write-Host "Working Directory: $workingDirectory" -ForegroundColor Gray
    Write-Host "`nEvery time you log in, Windows will now automatically run the ERP start script." -ForegroundColor Yellow
} catch {
    Write-Error "Failed to create the Startup shortcut: $_"
    exit 1
}
