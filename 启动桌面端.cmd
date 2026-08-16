@echo off
rem DeepSeek Harness Desktop launcher (runs Electron directly, no npm needed)
start "" "%~dp0desktop\node_modules\electron\dist\electron.exe" "%~dp0desktop"
