param([string]$Url = "http://127.0.0.1:8766")

Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class LivingPortalWindow {
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left, Top, Right, Bottom; }
    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr after, int x, int y, int width, int height, uint flags);
    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
}
'@

$screens = [System.Windows.Forms.Screen]::AllScreens
$target = $screens | Where-Object { -not $_.Primary } | Select-Object -First 1
if (-not $target) { $target = $screens | Select-Object -First 1 }
$bounds = $target.Bounds

$nativeHost = Join-Path $PSScriptRoot "host\bin\Release\net8.0-windows\win-x64\publish\LivingPortalHost.dll"
if (Test-Path $nativeHost) {
    $dotnetArguments = "`"$nativeHost`" $Url"
    Start-Process -FilePath "dotnet.exe" -ArgumentList $dotnetArguments -WindowStyle Hidden
    exit 0
}

$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$browser = if (Test-Path $chrome) { $chrome } else { $edge }
$profileName = if ($browser -eq $chrome) { "NIDLivingPortalChrome" } else { "NIDLivingPortalEdge" }
$profile = Join-Path $env:TEMP $profileName
$arguments = "--guest --kiosk --new-window --user-data-dir=`"$profile`" --window-position=$($bounds.X),$($bounds.Y) --window-size=$($bounds.Width),$($bounds.Height) --no-first-run --no-default-browser-check --disable-extensions --disable-session-crashed-bubble --disable-features=Glic --autoplay-policy=no-user-gesture-required $Url"

Start-Process -FilePath $browser -ArgumentList $arguments
Start-Sleep -Seconds 2

$processName = if ($browser -eq $chrome) { "chrome" } else { "msedge" }
$window = Get-Process $processName -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -like "Between Bodies*" } |
    Select-Object -First 1

if ($window) {
    [LivingPortalWindow]::SetWindowPos($window.MainWindowHandle, [IntPtr]::Zero, $bounds.X, $bounds.Y, $bounds.Width, $bounds.Height, 0x0040) | Out-Null
    Start-Sleep -Milliseconds 500
    [LivingPortalWindow]::SetForegroundWindow($window.MainWindowHandle) | Out-Null
    [System.Windows.Forms.SendKeys]::SendWait("{ESC}")
    Start-Sleep -Milliseconds 250
    $rect = New-Object LivingPortalWindow+RECT
    [LivingPortalWindow]::GetWindowRect($window.MainWindowHandle, [ref]$rect) | Out-Null
    $measuredHeight = $rect.Bottom - $rect.Top
    if ($measuredHeight -lt ($bounds.Height - 5)) {
        [LivingPortalWindow]::SetForegroundWindow($window.MainWindowHandle) | Out-Null
        [System.Windows.Forms.SendKeys]::SendWait("{F11}")
        Start-Sleep -Milliseconds 700
    }
}
