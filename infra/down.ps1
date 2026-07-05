# SmartCommerce — pause App Runner + stop RDS
# Resume with: .\up.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RdsId = "database-1"

Write-Host ""
Write-Host "=== SmartCommerce: Shutting down ===" -ForegroundColor Yellow

# ── Step 1: Pause App Runner ─────────────────────────────────────────────────
$Services = aws apprunner list-services --query "ServiceSummaryList[?ServiceName=='smartcommerce-api']" --output json | ConvertFrom-Json

if ($Services.Count -eq 0) {
    Write-Host "[1/2] No App Runner service found — skipping." -ForegroundColor Yellow
} elseif ($Services[0].Status -eq "PAUSED") {
    Write-Host "[1/2] App Runner already paused." -ForegroundColor Green
} else {
    Write-Host "[1/2] Pausing App Runner..." -ForegroundColor Yellow
    aws apprunner pause-service --service-arn $Services[0].ServiceArn | Out-Null

    do {
        Start-Sleep -Seconds 10
        $Status = (aws apprunner list-services --query "ServiceSummaryList[?ServiceName=='smartcommerce-api'].Status" --output text)
        Write-Host "      Status: $Status"
    } while ($Status -ne "PAUSED")

    Write-Host "      App Runner paused." -ForegroundColor Green
}

# ── Step 2: Stop RDS ─────────────────────────────────────────────────────────
$RdsStatus = (aws rds describe-db-instances --db-instance-identifier $RdsId --query "DBInstances[0].DBInstanceStatus" --output text)

if ($RdsStatus -eq "stopped") {
    Write-Host "[2/2] RDS already stopped." -ForegroundColor Green
} elseif ($RdsStatus -eq "available") {
    Write-Host "[2/2] Stopping RDS..." -ForegroundColor Yellow
    aws rds stop-db-instance --db-instance-identifier $RdsId | Out-Null
    Write-Host "      RDS is stopping (happens in the background)." -ForegroundColor Green
} else {
    Write-Host "[2/2] RDS is $RdsStatus — skipping stop." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Everything is DOWN ===" -ForegroundColor Green
Write-Host "Monthly cost while down: ~`$0.50 (RDS storage + Secrets Manager only)" -ForegroundColor Cyan
Write-Host "Resume with: .\up.ps1  (~5 min for RDS to start)" -ForegroundColor Yellow
Write-Host ""
