@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
echo Echo Atlas
echo Keep this window open while using the application.
where node >nul 2>nul
if errorlevel 1 goto fallback
node "scripts\launch.mjs"
goto finished

:fallback
if not exist "%ProgramFiles%\nodejs\node.exe" goto missing_node
"%ProgramFiles%\nodejs\node.exe" "scripts\launch.mjs"
goto finished

:missing_node
echo Please install Node.js 22.12 or later: https://nodejs.org

:finished
pause
