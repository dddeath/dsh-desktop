@echo off
rem 重启 DeepSeek Harness（激活新装插件）并用桌面端重新打开
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\restart-dsh.ps1"
pause
