@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 回声群岛 · Echo Atlas
echo 正在启动，请保留此窗口；关闭此窗口即可停止应用。
where node >nul 2>nul
if %errorlevel% equ 0 (
  node scripts\launch.mjs
) else if exist "C:\Program Files\nodejs\node.exe" (
  "C:\Program Files\nodejs\node.exe" scripts\launch.mjs
) else (
  echo 请先安装 Node.js 22.12 或更高版本：https://nodejs.org
)
pause
