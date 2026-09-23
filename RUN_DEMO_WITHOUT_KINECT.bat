@echo off
setlocal
title NID - Living Portal Demo
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0portal-stop.ps1" -Quiet
start "Living Portal Demo Server" /min cmd.exe /c "node server.js"
timeout /t 2 /nobreak >nul
start "Living Portal Demo Projector" /min powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0projector-launch.ps1" "http://127.0.0.1:8766/?demo=1"
exit /b 0
