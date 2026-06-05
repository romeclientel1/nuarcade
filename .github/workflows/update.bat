@echo off
title NuArcade Updater
color 0B

echo.
echo  ███╗   ██╗██╗   ██╗ █████╗ ██████╗  ██████╗ █████╗ ██████╗ ███████╗
echo  ████╗  ██║██║   ██║██╔══██╗██╔══██╗██╔════╝██╔══██╗██╔══██╗██╔════╝
echo  ██╔██╗ ██║██║   ██║███████║██████╔╝██║     ███████║██║  ██║█████╗
echo  ██║╚██╗██║██║   ██║██╔══██║██╔══██╗██║     ██╔══██║██║  ██║██╔══╝
echo  ██║ ╚████║╚██████╔╝██║  ██║██║  ██║╚██████╗██║  ██║██████╔╝███████╗
echo  ╚═╝  ╚═══╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚═════╝ ╚══════╝
echo.
echo  Updater v1.0 — Jerome Emanuel
echo  ================================================
echo.

:: Check if git is installed
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Git is not installed. Please install from git-scm.com
    pause
    exit /b 1
)

:: Check if node is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js is not installed. Please install from nodejs.org
    pause
    exit /b 1
)

echo  [1/6] Pulling latest updates from GitHub...
git pull
if %errorlevel% neq 0 (
    echo  [ERROR] Git pull failed. Check your internet connection.
    pause
    exit /b 1
)
echo  Done!
echo.

echo  [2/6] Installing root dependencies...
call npm install --silent
if %errorlevel% neq 0 (
    echo  [ERROR] npm install failed.
    pause
    exit /b 1
)
echo  Done!
echo.

echo  [3/6] Installing renderer dependencies...
cd renderer
call npm install --silent
if %errorlevel% neq 0 (
    echo  [ERROR] renderer npm install failed.
    pause
    exit /b 1
)
cd ..
echo  Done!
echo.

echo  [4/6] Building renderer...
cd renderer
call npm run build --silent
if %errorlevel% neq 0 (
    echo  [ERROR] Renderer build failed.
    pause
    exit /b 1
)
cd ..
echo  Done!
echo.

echo  [5/6] Building Windows installer...
call npx electron-builder --win --publish never
if %errorlevel% neq 0 (
    echo  [ERROR] Build failed. Check the error above.
    pause
    exit /b 1
)
echo  Done!
echo.

echo  [6/6] Build complete!
echo.
echo  ================================================
echo  NuArcade installer is ready in the dist folder.
echo  Run: dist\NuArcade Setup 1.0.0.exe
echo  ================================================
echo.

set /p launch="Install now? (y/n): "
if /i "%launch%"=="y" (
    start "" "dist\NuArcade Setup 1.0.0.exe"
)

pause