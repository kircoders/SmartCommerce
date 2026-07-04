# SmartCommerce — start the API
# First time: terraform apply (creates App Runner service, ~3 min)
# After that:  resumes the paused service (~30 sec)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
$ProjectRoot = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "=== SmartCommerce: Starting API ===" -ForegroundColor Cyan

# Check if App Runner service already exists
$Services = aws apprunner list-services --query "ServiceSummaryList[?ServiceName=='smartcommerce-api']" --output json | ConvertFrom-Json

if ($Services.Count -eq 0) {
    # ── First time: create everything via Terraform ──────────────────────────
    Write-Host "First time setup — running terraform apply (~3 min)..." -ForegroundColor Yellow
    Write-Host ""
    terraform apply -auto-approve
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    $AppRunnerUrl = terraform output -raw apprunner_url

} elseif ($Services[0].Status -eq "PAUSED") {
    # ── Existing service: just resume it ────────────────────────────────────
    Write-Host "Resuming paused service (~30 sec)..." -ForegroundColor Yellow
    aws apprunner resume-service --service-arn $Services[0].ServiceArn | Out-Null

    Write-Host "Waiting for service to become running..."
    do {
        Start-Sleep -Seconds 10
        $Status = (aws apprunner list-services --query "ServiceSummaryList[?ServiceName=='smartcommerce-api'].Status" --output text)
        Write-Host "  Status: $Status"
    } while ($Status -ne "RUNNING")

    $AppRunnerUrl = "https://$($Services[0].ServiceUrl)"

} else {
    $AppRunnerUrl = "https://$($Services[0].ServiceUrl)"
    Write-Host "Service is already $($Services[0].Status)." -ForegroundColor Green
}

# ── Update frontend API URL ──────────────────────────────────────────────────
$ApiBase = "$AppRunnerUrl/api"
$FrontendApiDir = Join-Path $ProjectRoot "frontend\src\lib\api"

$FilesToUpdate = @("auth.ts", "users.ts", "announcements.ts")
$Updated = $false
foreach ($File in $FilesToUpdate) {
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
Write-Host "=== API is UP ===" -ForegroundColor Green
Write-Host "URL: $AppRunnerUrl" -ForegroundColor Cyan
Write-Host ""

if ($Updated) {
    Write-Host "Frontend API URLs updated. Push to deploy:" -ForegroundColor Yellow
    Write-Host "  git add -A && git commit -m 'chore: update API URL' && git push"
    Write-Host ""
}
