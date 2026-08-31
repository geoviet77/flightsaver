$gDriveRoot = (Get-ChildItem 'G:\')[0].FullName
$targetDir = Join-Path $gDriveRoot 'FlightSaver'
Write-Host "Backing up C:\FlightSaver to $targetDir ..."
robocopy "C:\FlightSaver" $targetDir /E /XD node_modules .next .git /XF .env.local *.tsbuildinfo
Write-Host "Backup completed with exit code: $LASTEXITCODE"
