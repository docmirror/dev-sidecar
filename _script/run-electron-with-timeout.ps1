param(
    [string]$Workdir = "packages/gui",
    [int]$TimeoutSeconds = 1800  # 30 minutes
)

Write-Host "Starting npm run electron in $Workdir with 30 minute timeout..."

$process = Start-Process -FilePath "npm" -ArgumentList "run electron" -WorkingDirectory $Workdir -PassThru -NoNewWindow

$timer = [System.Diagnostics.Stopwatch]::StartNew()

while ($timer.Elapsed.TotalSeconds -lt $TimeoutSeconds) {
    if ($process.HasExited) {
        Write-Host "❌ 程序运行不正常"
        exit 1
    }
    Start-Sleep -Seconds 60
}

if (!$process.HasExited) {
    Write-Host "⏱  Electron run completed 30 minutes without error, terminating..."
    $process.Kill()
    Write-Host "✅ 程序运行正常"
    exit 0
}
else {
    Write-Host "❌ 程序运行不正常"
    exit 1
}