@echo off
title UltraEdge AIPC Studio Launcher
echo ===================================================
echo   UltraEdge AIPC Studio - Startup Launcher
echo ===================================================
echo.

:: Resolve absolute project root from this .bat file's location
set "ROOT=%~dp0"

:: 1. Launch Backend FastAPI Server
echo [*] Launching FastAPI Backend Server on port 8000...
start "UltraEdge AIPC Studio - Backend" cmd.exe /k ^
  "call C:\Users\mniti\anaconda3\Scripts\activate.bat project && cd /d "%ROOT%backend" && python -m app.main"

:: 2. Install frontend deps (if needed) then launch Vite Dev Server
echo [*] Launching React/Vite Frontend Server...
start "UltraEdge AIPC Studio - Frontend" cmd.exe /k ^
  "cd /d "%ROOT%frontend" && npm install && npm run dev"

:: 3. Delay and open browser
echo [*] Waiting for services to initialize...
timeout /t 6 /nobreak > nul

echo [*] Launching browser workspace...
start http://localhost:5173

echo.
echo ===================================================
echo   Services running! Close the windows to exit.
echo ===================================================
pause
