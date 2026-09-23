@echo off
setlocal
cd /d "%~dp0"
dotnet publish LivingPortalHost.csproj -c Release -r win-x64 --self-contained false
if errorlevel 1 (echo PROJECTOR HOST BUILD FAILED& pause& exit /b 1)
echo Native projector host built successfully.
exit /b 0
