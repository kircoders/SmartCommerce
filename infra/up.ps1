# Phase 1

# SmartCommerce - start the API
# First time: terraform apply (creates App Runner service, ~3 min)
# After that:  starts RDS + resumes App Runner (~5 min total)
# This is the reverse of down.ps1.

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Rebuild PATH from Machine+User scope - needed because this is sometimes
# launched from a background/scheduled context where PATH hasn't picked up
# recently-installed tools (aws, terraform) yet.
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$RdsId = "database-1"

Write-Host ""
Write-Host "=== SmartCommerce: Starting ===" -ForegroundColor Cyan

# Step 1: Start RDS if stopped
# RDS has to come up before App Runner, or the API will fail to connect on
# its first requests.
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
    # e.g. already mid-"starting" from a previous run - just wait it out.
    Write-Host "      RDS is $RdsStatus - waiting..." -ForegroundColor Yellow
    do {
        Start-Sleep -Seconds 20
        $RdsStatus = (aws rds describe-db-instances --db-instance-identifier $RdsId --query "DBInstances[0].DBInstanceStatus" --output text)
        Write-Host "      RDS status: $RdsStatus"
    } while ($RdsStatus -ne "available")
}

# Step 2: Resume App Runner
$ServicesJson = aws apprunner list-services --query "ServiceSummaryList[?ServiceName=='smartcommerce-api']" --output json
$Services = if ($ServicesJson) { $ServicesJson | ConvertFrom-Json } else { @() }

if ($Services.Count -eq 0) {
    # No service exists yet at all (e.g. brand new environment, or it was
    # destroyed) - create everything from scratch via Terraform.
    Write-Host "[2/2] First time setup - running terraform apply (~3 min)..." -ForegroundColor Yellow
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

# Update frontend API URL if needed
# The App Runner URL can change (e.g. after a from-scratch terraform apply).
# All frontend API clients import API_URL from lib/api/config.ts's fallback
# now (see that file), so only this one file needs rewriting - not four.
$ApiBase = "$AppRunnerUrl/api"
$ConfigPath = Join-Path $ProjectRoot "frontend\src\lib\api\config.ts"
$Updated = $false
if (Test-Path $ConfigPath) {
    $Content = Get-Content $ConfigPath -Raw
    $NewContent = $Content -replace "\?\? '[^']*'", "?? '$ApiBase'"
    if ($Content -ne $NewContent) {
        [System.IO.File]::WriteAllText($ConfigPath, $NewContent, [System.Text.UTF8Encoding]::new($false))
        Write-Host "Updated API_URL fallback in lib/api/config.ts" -ForegroundColor Green
        $Updated = $true
    }
}

Write-Host ""
Write-Host "=== Everything is UP ===" -ForegroundColor Green
Write-Host "API: $AppRunnerUrl" -ForegroundColor Cyan
Write-Host ""

if ($Updated) {
    # Frontend is deployed separately via Amplify (triggered by a git push),
    # so a URL change here needs to be committed and pushed to actually
    # take effect on the live site.
    Write-Host "Frontend API URLs updated. Push to deploy:" -ForegroundColor Yellow
    Write-Host "  git add -A && git commit -m 'chore: update API URL' && git push"
    Write-Host ""
}
