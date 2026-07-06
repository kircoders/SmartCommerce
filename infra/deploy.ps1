# SmartCommerce - build and deploy a new backend image
# Run this whenever you change API code.

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

$Region    = "us-east-1"
$AccountId = "452698428461"
$EcrRepo   = "$AccountId.dkr.ecr.$Region.amazonaws.com/smartcommerce-api"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ApiDir    = Join-Path $ProjectRoot "api"

Write-Host ""
Write-Host "=== SmartCommerce: Deploying new API image ===" -ForegroundColor Cyan

# 1. ECR login
Write-Host "[1/4] Logging into ECR..." -ForegroundColor Yellow
aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin "$AccountId.dkr.ecr.$Region.amazonaws.com"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 2. Build
Write-Host "[2/4] Building Docker image..." -ForegroundColor Yellow
docker build -t smartcommerce-api "$ApiDir"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 3. Tag and push
Write-Host "[3/4] Pushing to ECR..." -ForegroundColor Yellow
docker tag smartcommerce-api:latest "$EcrRepo:latest"
docker push "$EcrRepo:latest"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 4. Trigger App Runner redeploy
Write-Host "[4/4] Triggering App Runner deployment..." -ForegroundColor Yellow
$ServiceArn = (aws apprunner list-services --query "ServiceSummaryList[?ServiceName=='smartcommerce-api'].ServiceArn" --output text)
if ($ServiceArn) {
    aws apprunner start-deployment --service-arn $ServiceArn | Out-Null
    Write-Host "Deployment triggered. Takes ~1-2 min to roll out." -ForegroundColor Green
} else {
    Write-Host "No running App Runner service found - image pushed but not deployed yet." -ForegroundColor Yellow
    Write-Host "Run up.ps1 to create the service." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Done! ===" -ForegroundColor Green
