@echo off
REM SmartCommerce - run the backend and frontend locally, in separate windows.
REM RDS still needs to be running (this is a real AWS database, not a local
REM one), so this checks its status first and starts it if needed before
REM launching either dev server.
REM
REM HOW TO RUN: double-click this file in File Explorer (it's in the repo
REM root, not infra/), or from a terminal here: .\local-dev.bat (PowerShell)
REM or local-dev.bat (cmd).

set ROOT=%~dp0

echo Checking RDS status...
powershell -NoProfile -Command "$s = aws rds describe-db-instances --db-instance-identifier database-1 --query 'DBInstances[0].DBInstanceStatus' --output text; if ($s -eq 'stopped') { Write-Host 'RDS is stopped - starting it now (~5 min)...' -ForegroundColor Yellow; aws rds start-db-instance --db-instance-identifier database-1 | Out-Null; do { Start-Sleep -Seconds 20; $s = aws rds describe-db-instances --db-instance-identifier database-1 --query 'DBInstances[0].DBInstanceStatus' --output text; Write-Host \"RDS status: $s\" } while ($s -ne 'available'); Write-Host 'RDS is available.' -ForegroundColor Green } else { Write-Host \"RDS status: $s\" -ForegroundColor Green }"

echo.
echo Starting backend (NestJS) - will run at http://localhost:3000
start "SmartCommerce API" cmd /k "cd /d "%ROOT%api" && npm run start:dev"

echo Waiting for backend to actually be listening on port 3000 before
echo starting the frontend - both point at port 3000 by default, and
echo whichever one starts first claims it. Starting them at the same time
echo risks the frontend grabbing 3000 instead of the backend.
powershell -NoProfile -Command "$ready = $false; for ($i = 0; $i -lt 60; $i++) { try { Invoke-WebRequest -Uri 'http://localhost:3000/api/health' -UseBasicParsing -TimeoutSec 2 | Out-Null; $ready = $true; break } catch { Start-Sleep -Seconds 2 } }; if ($ready) { Write-Host 'Backend is up.' -ForegroundColor Green } else { Write-Host 'Backend did not come up after 2 minutes - check its window for errors.' -ForegroundColor Red }"

echo.
echo Starting frontend (Next.js) - will run at http://localhost:3001
start "SmartCommerce Frontend" cmd /k "cd /d "%ROOT%frontend" && npm run dev"

echo.
echo Both servers are launching in their own windows.
echo.
echo NOTE: the frontend only talks to this local backend if
echo frontend\.env.local exists with:
echo   NEXT_PUBLIC_API_URL=http://localhost:3000/api
echo Copy frontend\.env.local.example to frontend\.env.local to set this up
echo (see frontend/src/lib/api/config.ts for details). Without it, the
echo frontend talks to the deployed App Runner API instead, even though
echo it's running on your machine.
echo.
pause
