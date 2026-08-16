# ERP and Automation

This project contains both the Backend and Frontend services for the ERP Application.

## Getting Started

### Manual Execution

To start both the Backend (Express/Prisma) and Frontend (Vite) development servers, run the startup batch script in the root directory:

```cmd
start-erp.bat
```

This script will spin up two separate cmd windows running the development servers:
* **Backend:** Running on port 3001 using `ts-node`
* **Frontend:** Running Vite development server

---

## Automatic Startup on Windows Login

To configure the ERP application to start automatically when you log into Windows, we have provided a PowerShell helper script.

### 1. Enable Auto-Start

Run the following command in a PowerShell window to create a shortcut to `start-erp.bat` in your Windows **Startup** folder:

```powershell
powershell -ExecutionPolicy Bypass -File setup-autostart.ps1
```

Once run, the ERP servers will launch automatically every time you log into your Windows user account.

### 2. Disable/Uninstall Auto-Start

To stop the ERP application from launching automatically and remove the startup shortcut, run:

```powershell
powershell -ExecutionPolicy Bypass -File setup-autostart.ps1 -Uninstall
```

