@echo off
setlocal
set "CSC=C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
set "KINECT=C:\Program Files\Microsoft SDKs\Kinect\v2.0_1409\Assemblies\Microsoft.Kinect.dll"
if not exist "%CSC%" (echo ERROR: C# compiler not found.& pause & exit /b 1)
if not exist "%KINECT%" (echo ERROR: Kinect v2 SDK 2.0 is not installed.& pause & exit /b 1)
"%CSC%" /nologo /optimize+ /platform:x64 /target:exe /out:"%~dp0KinectBridge.exe" /reference:"%KINECT%" "%~dp0KinectBridge.cs"
if errorlevel 1 (echo BUILD FAILED& pause& exit /b 1)
copy /y "%KINECT%" "%~dp0Microsoft.Kinect.dll" >nul
echo Kinect bridge built successfully.
exit /b 0
