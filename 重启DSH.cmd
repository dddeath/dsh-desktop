@echo off
rem Restart DeepSeek Harness (apply plugins) and reopen via desktop shell
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\restart-dsh.ps1"
pause
