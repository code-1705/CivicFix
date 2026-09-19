@echo off
setlocal enabledelayedexpansion
title Civic Issue Tracker - Launcher

echo ===================================================
echo     Starting Civic Issue Tracker Application
echo ===================================================
echo.

cd /d "%~dp0"

:: Check Backend Virtual Environment
if exist "backend\venv\Scripts\activate.bat" (
    echo [*] Found backend virtual environment in backend\venv.
    set "PYTHON_CMD=venv\Scripts\python.exe"
    set "UVICORN_CMD=venv\Scripts\uvicorn.exe"
) else (
    echo [!] backend\venv not found, falling back to system python.
    set "PYTHON_CMD=python"
    set "UVICORN_CMD=uvicorn"
)

:: Start Backend in a separate window
echo [*] Starting FastAPI Backend on http://127.0.0.1:8000...
start "Civic Issue Tracker - Backend (FastAPI)" cmd /k "cd /d "%~dp0backend" && if exist "venv\Scripts\activate.bat" (call venv\Scripts\activate.bat) && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

:: Wait a brief moment before starting frontend
timeout /t 2 /nobreak >nul

:: Start Frontend in a separate window
echo [*] Starting Next.js Frontend on http://localhost:3000...
start "Civic Issue Tracker - Frontend (Next.js)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ===================================================
echo  Services launched in separate command windows:
echo   - Backend:  http://127.0.0.1:8000 (Docs: http://127.0.0.1:8000/docs)
echo   - Frontend: http://localhost:3000
echo ===================================================
echo.
echo You can keep this window open or close it. To stop the servers, close the opened terminal windows.
pause
