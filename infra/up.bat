@echo off
REM Double-click wrapper for up.ps1 - .ps1 files open in Notepad when
REM double-clicked directly (Windows file association), not run. This
REM forces it through PowerShell instead.
REM
REM HOW TO RUN: double-click this file in File Explorer, or from a
REM terminal in this folder: .\up.bat (PowerShell) or up.bat (cmd).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0up.ps1"
pause
