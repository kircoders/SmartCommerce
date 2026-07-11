@echo off
REM Double-click wrapper for deploy.ps1 - see up.bat for why this exists.
REM
REM HOW TO RUN: double-click this file in File Explorer, or from a
REM terminal in this folder: .\deploy.bat (PowerShell) or deploy.bat (cmd).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy.ps1"
pause
