$gDrive = (Get-ChildItem -Path 'G:\')[0].FullName

# Copy files directly to root of 'Мой диск'
Copy-Item -Path "C:\FlightSaver\Reports\Full_Project_Audit_Report.md" -Destination (Join-Path $gDrive "Full_Project_Audit_Report_31_Aug_2026.md") -Force
Copy-Item -Path "C:\FlightSaver\PROJECT JOURNAL TEMPLATES\Report_v6.md" -Destination (Join-Path $gDrive "Report_v6_Daily_31_Aug_2026.md") -Force
Copy-Item -Path "C:\FlightSaver\Project_Status.md" -Destination (Join-Path $gDrive "Project_Status_v1.5_31_Aug_2026.md") -Force
Copy-Item -Path "C:\FlightSaver\test_price_comparison_target.js" -Destination (Join-Path $gDrive "test_price_comparison_target.js") -Force

Write-Host "All summary reports and test suites successfully copied to Google Drive Root:"
Get-ChildItem -Path $gDrive -File

