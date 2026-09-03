# FLIGHTSAVER UNIFIED BACKUP PIPELINE
$drive = Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Name -eq 'G' }
if (-not $drive) {
    Write-Warning "Google Drive (G:) is not mounted yet."
    exit 0
}

$gRoot = (Get-ChildItem 'G:\')[0].FullName
Write-Host "Google Drive Root: $gRoot"

$projectFolder = Join-Path $gRoot 'FlightSaver'
if (-not (Test-Path $projectFolder)) {
    New-Item -ItemType Directory -Path $projectFolder -Force | Out-Null
}

# Зеркалирование проекта в каноническую структуру FlightSaver на Google Диске
robocopy 'C:\FlightSaver' $projectFolder /E /XD node_modules .next .git .quarantine_duplicates /XF .env.local *.tsbuildinfo
Write-Host "Unified backup completed to: $projectFolder"


