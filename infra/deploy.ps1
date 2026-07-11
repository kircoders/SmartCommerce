# Phase 1

# SmartCommerce - build and deploy a new backend image
# Run this whenever you change API code.
# This does NOT touch RDS or App Runner's paused/running state - if things
# are paused, run up.ps1 first (or after) so the new deployment can actually
# roll out to a running service.

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Rebuild PATH from Machine+User scope, same reasoning as up.ps1.
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

$Region    = "us-east-1"
$AccountId = "452698428461"
$EcrRepo   = "$AccountId.dkr.ecr.$Region.amazonaws.com/smartcommerce-api"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ApiDir    = Join-Path $ProjectRoot "api"

Write-Host ""
Write-Host "=== SmartCommerce: Deploying new API image ===" -ForegroundColor Cyan

# 1. ECR login
# Docker needs a short-lived auth token to push to a private ECR repo -
# this fetches one from AWS and feeds it straight into `docker login`.
Write-Host "[1/4] Logging into ECR..." -ForegroundColor Yellow
aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin "$AccountId.dkr.ecr.$Region.amazonaws.com"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 2. Build
# Builds the image from api/Dockerfile using whatever code is currently on
# disk - make sure your changes are saved before running this.
Write-Host "[2/4] Building Docker image..." -ForegroundColor Yellow
docker build -t smartcommerce-api "$ApiDir"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 3. Tag and push
# App Runner always pulls the ":latest" tag, so every deploy overwrites it -
# there's no separate versioned tag being kept around here.
Write-Host "[3/4] Pushing to ECR..." -ForegroundColor Yellow
docker tag smartcommerce-api:latest "$EcrRepo:latest"
docker push "$EcrRepo:latest"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 4. Trigger App Runner redeploy
# Pushing a new ":latest" image to ECR does NOT automatically redeploy it
# (auto_deployments_enabled = false in apprunner.tf) - this explicitly tells
# App Runner "go pull the image you're configured to use, again."
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
