$gRoot = (Get-ChildItem 'G:\')[0].FullName
Write-Host "Google Drive Root: $gRoot"

# 1. Копирование в корень Google Диска
Copy-Item 'C:\FlightSaver\Reports\Full_Project_Audit_Report.md' -Destination (Join-Path $gRoot 'Full_Project_Audit_Report_31_Aug_2026.md') -Force
Copy-Item 'C:\FlightSaver\PROJECT JOURNAL TEMPLATES\Report_v6.md' -Destination (Join-Path $gRoot 'Report_v6_Daily_31_Aug_2026.md') -Force
Copy-Item 'C:\FlightSaver\test_telegram_twa_suite.js' -Destination (Join-Path $gRoot 'test_telegram_twa_suite.js') -Force
Copy-Item 'C:\FlightSaver\test_telegram_auth_supabase.js' -Destination (Join-Path $gRoot 'test_telegram_auth_supabase.js') -Force


# 2. Зеркалирование проекта в папку FlightSaver на Google Диске
$projectFolder = Join-Path $gRoot 'FlightSaver'
if (-not (Test-Path $projectFolder)) {
    New-Item -ItemType Directory -Path $projectFolder -Force | Out-Null
}
robocopy 'C:\FlightSaver' $projectFolder /E /XD node_modules .next .git /XF .env.local *.tsbuildinfo
Write-Host "Backup completed to: $projectFolder"

