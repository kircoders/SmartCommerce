# SmartCommerce — pause the API (keeps config, stops billing for compute)
# Resume with: .\up.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== SmartCommerce: Pausing API ===" -ForegroundColor Yellow

$Services = aws apprunner list-services --query "ServiceSummaryList[?ServiceName=='smartcommerce-api']" --output json | ConvertFrom-Json

if ($Services.Count -eq 0) {
    Write-Host "No App Runner service found — nothing to pause." -ForegroundColor Yellow
    exit 0
}

$Service = $Services[0]

if ($Service.Status -eq "PAUSED") {
    Write-Host "Service is already paused." -ForegroundColor Green
    exit 0
}

aws apprunner pause-service --service-arn $Service.ServiceArn | Out-Null

Write-Host "Pausing..." -ForegroundColor Yellow
do {
    Start-Sleep -Seconds 10
    $Status = (aws apprunner list-services --query "ServiceSummaryList[?ServiceName=='smartcommerce-api'].Status" --output text)
    Write-Host "  Status: $Status"
} while ($Status -ne "PAUSED")

Write-Host ""
Write-Host "=== API is PAUSED ===" -ForegroundColor Green
Write-Host "Compute billing stopped. RDS storage: ~`$2.30/month." -ForegroundColor Cyan
Write-Host "Resume with: .\up.ps1" -ForegroundColor Yellow
Write-Host ""
