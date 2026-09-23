@echo off
setlocal
title NID - Living Portal Launcher
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0portal-stop.ps1" -Quiet
DisplaySwitch.exe /extend
timeout /t 3 /nobreak >nul
if not exist "bridge\KinectBridge.exe" call "bridge\BUILD_KINECT_BRIDGE.bat"
if errorlevel 1 exit /b 1
if not exist "host\bin\Release\net8.0-windows\win-x64\publish\LivingPortalHost.dll" call "host\BUILD_HOST.bat"
if errorlevel 1 exit /b 1
start "Living Portal Kinect" /min "bridge\KinectBridge.exe"
start "Living Portal Server" /min cmd.exe /c "node server.js"
echo Living Portal is starting on the projector...
timeout /t 2 /nobreak >nul
start "Living Portal Projector" /min powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0projector-launch.ps1" "http://127.0.0.1:8766"
exit /b 0
