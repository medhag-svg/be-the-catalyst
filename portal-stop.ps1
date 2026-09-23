param([switch]$Quiet)

$stopped = 0
Get-Process LivingPortalHost -ErrorAction SilentlyContinue |
    ForEach-Object { $_.CloseMainWindow() | Out-Null; $stopped++ }
Start-Sleep -Milliseconds 300
Get-Process LivingPortalHost -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }

Get-CimInstance Win32_Process -Filter "Name='dotnet.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match 'LivingPortalHost\.dll' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; $stopped++ }

$portalWindows = Get-Process chrome,msedge -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowTitle -like 'Between Bodies*' }
foreach ($window in $portalWindows) {
    $window.CloseMainWindow() | Out-Null
}
if ($portalWindows) { Start-Sleep -Milliseconds 1200 }

try {
    Get-NetTCPConnection -LocalPort 8766 -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique |
        ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue; $stopped++ }
} catch { }

Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object {
        $_.Name -eq 'KinectBridge.exe' -or
        $_.CommandLine -match 'NIDLivingPortalChrome|NIDLivingPortalEdge'
    } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; $stopped++ }

Get-Process chrome,msedge -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowTitle -like 'Between Bodies*' } |
    ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue; $stopped++ }

if (-not $Quiet) { Write-Host "Living Portal stopped ($stopped processes)." }
