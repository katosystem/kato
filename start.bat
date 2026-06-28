@echo off
cd /d %~dp0
echo ========================================
echo   Kato Weighing Bridge System
echo ========================================
echo.

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

echo Testing MongoDB Atlas connection...
node test-db.js
if errorlevel 1 (
  echo.
  echo Connection failed. Check Atlas Network Access and .env file.
  pause
  exit /b 1
)

echo.
echo Starting server at http://localhost:3000
echo Login: http://localhost:3000/login.html
echo.
node server.js
pause
