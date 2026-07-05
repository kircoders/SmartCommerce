# SmartCommerce — start the API
# First time: terraform apply (creates App Runner service, ~3 min)
# After that:  starts RDS + resumes App Runner (~5 min total)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$RdsId = "database-1"

Write-Host ""
Write-Host "=== SmartCommerce: Starting ===" -ForegroundColor Cyan

# ── Step 1: Start RDS if stopped ────────────────────────────────────────────
$RdsStatus = (aws rds describe-db-instances --db-instance-identifier $RdsId --query "DBInstances[0].DBInstanceStatus" --output text)
Write-Host "[1/2] RDS status: $RdsStatus"

if ($RdsStatus -eq "stopped") {
    Write-Host "      Starting RDS (~5 min)..." -ForegroundColor Yellow
    aws rds start-db-instance --db-instance-identifier $RdsId | Out-Null

    do {
        Start-Sleep -Seconds 20
        $RdsStatus = (aws rds describe-db-instances --db-instance-identifier $RdsId --query "DBInstances[0].DBInstanceStatus" --output text)
        Write-Host "      RDS status: $RdsStatus"
    } while ($RdsStatus -ne "available")

    Write-Host "      RDS is available." -ForegroundColor Green
} elseif ($RdsStatus -eq "available") {
    Write-Host "      RDS already running." -ForegroundColor Green
} else {
    Write-Host "      RDS is $RdsStatus — waiting..." -ForegroundColor Yellow
    do {
        Start-Sleep -Seconds 20
        $RdsStatus = (aws rds describe-db-instances --db-instance-identifier $RdsId --query "DBInstances[0].DBInstanceStatus" --output text)
        Write-Host "      RDS status: $RdsStatus"
    } while ($RdsStatus -ne "available")
}

# ── Step 2: Resume App Runner ────────────────────────────────────────────────
$Services = aws apprunner list-services --query "ServiceSummaryList[?ServiceName=='smartcommerce-api']" --output json | ConvertFrom-Json

if ($Services.Count -eq 0) {
    Write-Host "[2/2] First time setup — running terraform apply (~3 min)..." -ForegroundColor Yellow
    terraform apply -auto-approve
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    $AppRunnerUrl = terraform output -raw apprunner_url

} elseif ($Services[0].Status -eq "PAUSED") {
    Write-Host "[2/2] Resuming App Runner..." -ForegroundColor Yellow
    aws apprunner resume-service --service-arn $Services[0].ServiceArn | Out-Null

    do {
        Start-Sleep -Seconds 10
        $Status = (aws apprunner list-services --query "ServiceSummaryList[?ServiceName=='smartcommerce-api'].Status" --output text)
        Write-Host "      App Runner status: $Status"
    } while ($Status -ne "RUNNING")

    $AppRunnerUrl = "https://$($Services[0].ServiceUrl)"

} else {
    Write-Host "[2/2] App Runner already $($Services[0].Status)." -ForegroundColor Green
    $AppRunnerUrl = "https://$($Services[0].ServiceUrl)"
}

# ── Update frontend API URL if needed ───────────────────────────────────────
$ApiBase = "$AppRunnerUrl/api"
$FrontendApiDir = Join-Path $ProjectRoot "frontend\src\lib\api"
$Updated = $false
foreach ($File in @("auth.ts", "users.ts", "announcements.ts")) {
    $Path = Join-Path $FrontendApiDir $File
    if (Test-Path $Path) {
        $Content = Get-Content $Path -Raw
        $NewContent = $Content -replace "const API_URL = '[^']*'", "const API_URL = '$ApiBase'"
        if ($Content -ne $NewContent) {
            [System.IO.File]::WriteAllText($Path, $NewContent, [System.Text.UTF8Encoding]::new($false))
            Write-Host "Updated API_URL in $File" -ForegroundColor Green
            $Updated = $true
        }
    }
}

Write-Host ""
Write-Host "=== Everything is UP ===" -ForegroundColor Green
Write-Host "API: $AppRunnerUrl" -ForegroundColor Cyan
Write-Host ""

if ($Updated) {
    Write-Host "Frontend API URLs updated. Push to deploy:" -ForegroundColor Yellow
    Write-Host "  git add -A && git commit -m 'chore: update API URL' && git push"
    Write-Host ""
}
