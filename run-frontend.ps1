# Launched by local-dev.bat in its own Windows Terminal window.
# scripts/dev-logger.js now owns all the logging behavior (JSON,
# rotation by size, levels) - this file just hands off to it, the same
# way the backend's own logging lives entirely inside its own code
# (api/src/main.ts) rather than in this wrapper.
Set-Location (Join-Path $PSScriptRoot 'frontend')
npm run dev:logged
