@echo off
REM Double-click wrapper for down.ps1 - see up.bat for why this exists.
REM
REM HOW TO RUN: double-click this file in File Explorer, or from a
REM terminal in this folder: .\down.bat (PowerShell) or down.bat (cmd).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0down.ps1"
pause
