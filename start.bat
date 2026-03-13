@echo off
title IPTV Scout — AI Telegram Lead Platform
color 0B
echo.
echo  ================================================
echo   IPTV SCOUT — AI Telegram Lead Platform v1.0
echo  ================================================
echo.

cd /d "%~dp0backend"

:: Find Python — try standard locations
set PYTHON=
for %%P in (
    "C:\Python313\python.exe"
    "C:\Python312\python.exe"
    "C:\Python311\python.exe"
    "C:\Python310\python.exe"
    "C:\Python39\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python313\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
) do (
    if exist %%P (
        set PYTHON=%%P
        goto :found_python
    )
)

:: Not found
echo [ERROR] Python 3.10+ not found!
echo.
echo Please install Python from: https://www.python.org/downloads/
echo Make sure to check "Add Python to PATH" during installation.
echo Then run this script again.
echo.
pause
exit /b 1

:found_python
echo [*] Found Python at: %PYTHON%
%PYTHON% --version

:: Create venv if needed
if not exist "venv" (
    echo [*] Creating virtual environment...
    python -m venv venv
)

:: Activate venv
call venv\Scripts\activate.bat

:: Install dependencies
echo [*] Installing/updating dependencies...
pip install -r requirements.txt -q

:: Check .env
if not exist ".env" (
    echo.
    echo [IMPORTANT] I need your Telegram API keys to start.
    %PYTHON% setup_telegram.py
    if not exist ".env" (
        echo [ERROR] Setup failed or was cancelled.
        pause
        exit /b 1
    )
)


echo.
echo [*] Starting IPTV Scout backend on http://localhost:8000 ...
echo [*] Open your browser to: http://localhost:8000
echo [*] Press Ctrl+C to stop.
echo.

:: Open browser after a short delay
start "" cmd /c "timeout /t 2 >nul && start http://localhost:8000"

:: Start server
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

pause
