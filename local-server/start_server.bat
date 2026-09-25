@echo off
setlocal
cd /d "%~dp0"

set "VENV_PY=%~dp0.venv\Scripts\python.exe"

if not exist "%VENV_PY%" (
  echo No .venv found - running setup first...
  call "%~dp0setup_windows.bat"
  if errorlevel 1 goto :fail
)

if not exist "%VENV_PY%" goto :fail

"%VENV_PY%" -c "import faster_whisper" >nul 2>&1
if errorlevel 1 (
  echo faster-whisper missing - installing requirements...
  "%VENV_PY%" -m pip install -r requirements.txt
  if errorlevel 1 goto :fail
)

if not exist "bin\ffmpeg.exe" (
  echo ffmpeg not found in bin - downloading binaries...
  "%VENV_PY%" fetch_binaries.py
)

echo Starting MSD camera server with "%VENV_PY%"
"%VENV_PY%" camera_server.py
endlocal
exit /b 0

:fail
echo.
echo Failed to prepare the Python environment. Run setup_windows.bat and read the errors above.
pause
endlocal
exit /b 1
