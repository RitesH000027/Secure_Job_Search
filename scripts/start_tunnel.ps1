param(
    [string]$ServerUser = "iiitd",
    [string]$ServerHost = "192.168.3.40",
    [int]$LocalPort = 8010,
    [int]$RemotePort = 8010
)

Write-Host "Starting SSH tunnel: localhost:$LocalPort -> ${ServerHost}:$RemotePort" -ForegroundColor Cyan
Write-Host "Keep this terminal open." -ForegroundColor Yellow
ssh -N -L "${LocalPort}:127.0.0.1:${RemotePort}" "$ServerUser@$ServerHost"
