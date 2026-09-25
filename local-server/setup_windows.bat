@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo === MSD Local Camera Server - Windows setup ===
echo.

set "PYLAUNCH="
where py >nul 2>&1
if not errorlevel 1 set "PYLAUNCH=py -3"

if not defined PYLAUNCH (
  where python >nul 2>&1
  if not errorlevel 1 set "PYLAUNCH=python"
)

if not defined PYLAUNCH goto :nopython

set "VENV_PY=%~dp0.venv\Scripts\python.exe"

if not exist "%VENV_PY%" (
  echo Creating virtual environment .venv ...
  %PYLAUNCH% -m venv ".venv"
  if errorlevel 1 goto :fail
)

if not exist "%VENV_PY%" goto :fail

echo Using Python: "%VENV_PY%"
"%VENV_PY%" -m pip install --upgrade pip
"%VENV_PY%" -m pip install -r requirements.txt
if errorlevel 1 goto :fail

echo.
echo Downloading ffmpeg, ffprobe and mediamtx into bin\ ...
"%VENV_PY%" fetch_binaries.py
if errorlevel 1 echo [WARNING] Binary download failed - see messages above, or place them in bin\ manually.

echo.
echo Setup complete. Start the server with:  .\start_server.bat
endlocal
exit /b 0

:nopython
echo.
echo [ERROR] Python was not found. Install Python 3.10+ from https://www.python.org/downloads/
echo         Make sure to tick "Add python.exe to PATH" during installation.
pause
endlocal
exit /b 1

:fail
echo.
echo Setup FAILED. See the messages above.
pause
endlocal
exit /b 1
