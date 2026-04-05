@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found in PATH.
  echo Download: https://nodejs.org/en/download
  pause
  exit /b 1
)

node AndroidMicApp\scripts\buildAndroid.js
set EXIT_CODE=%ERRORLEVEL%

if not "%EXIT_CODE%"=="0" (
  echo.
  echo Launcher finished with errors. Review the messages above.
  pause
)

exit /b %EXIT_CODE%
