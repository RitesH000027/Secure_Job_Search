param(
    [int]$ApiPort = 8010
)

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Set-Content -Path "$repoRoot\frontend\.env.local" -Value "VITE_API_BASE_URL=http://127.0.0.1:$ApiPort"
Write-Host "Updated frontend/.env.local with API port $ApiPort" -ForegroundColor Green

Write-Host "Starting frontend dev server..." -ForegroundColor Cyan
npm --prefix frontend run dev
