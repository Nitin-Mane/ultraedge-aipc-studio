@echo off
title UltraEdge AIPC Studio Launcher
echo ===================================================
echo   UltraEdge AIPC Studio - Startup Launcher
echo   Powered by OpenVINO Toolkit and React/Vite
echo   Developer: Mr. Nitin Mane
echo ===================================================
echo.

:: 1. Launch Backend FastAPI Server in a separate command window
echo [*] Launching FastAPI Backend Server on port 8000...
start "UltraEdge AIPC Studio - Backend Server" cmd.exe /k "call C:\Users\mniti\anaconda3\Scripts\activate.bat project && cd backend && python -m app.main"

:: 2. Launch Frontend Vite Dev Server in a separate command window
echo [*] Launching React/Vite Frontend Server...
start "UltraEdge AIPC Studio - Frontend Dev Server" cmd.exe /k "cd frontend && npm run dev"

:: 3. Delay and open browser page
echo [*] Waiting for services to initialize...
timeout /t 4 /nobreak > nul

echo [*] Launching browser workspace...
start http://localhost:3000

echo.
echo ===================================================
echo   Services running! Close the command windows to exit.
echo ===================================================
pause
