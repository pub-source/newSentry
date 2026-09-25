@echo off
setlocal
cd /d "%~dp0"

set "VENV_PY=%~dp0.venv\Scripts\python.exe"
if exist "%VENV_PY%" goto :run

where py >nul 2>&1
if not errorlevel 1 set "VENV_PY=py -3"
if not defined VENV_PY goto :nopython

:run
echo Downloading ffmpeg, ffprobe and mediamtx into local-server\bin ...
%VENV_PY% fetch_binaries.py
if errorlevel 1 goto :fail
endlocal
exit /b 0

:nopython
echo [ERROR] Python was not found. Install Python 3.10+ from https://www.python.org/downloads/
pause
endlocal
exit /b 1

:fail
echo.
echo Download failed - see the messages above.
pause
endlocal
exit /b 1
