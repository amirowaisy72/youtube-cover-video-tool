@echo off
REM YT Guru - double-click and the tool opens in your browser.
cd /d "%~dp0"
start "" "%~dp0python\pythonw.exe" "%~dp0launcher.py"
