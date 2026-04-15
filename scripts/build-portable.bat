@echo off
setlocal enabledelayedexpansion

:: ZenNote Windows Portable Build Script
:: Run this from the repository root

echo ===========================================
echo  ZenNote Portable Build for Windows
echo ===========================================
echo.

:: Determine repo root (where this script lives)\..
cd /d "%~dp0\.."
set "REPO_ROOT=%cd%"
echo [INFO] Working directory: %REPO_ROOT%

:: Step 1: Build frontend
echo.
echo [1/4] Building frontend...
cd /d "%REPO_ROOT%\frontend"
call npm run build
if errorlevel 1 (
    echo [ERROR] Frontend build failed.
    exit /b 1
)

:: Step 2: Build Tauri app
echo.
echo [2/4] Building Tauri app (release)...
cd /d "%REPO_ROOT%\src-tauri"
call cargo tauri build
if errorlevel 1 (
    echo [ERROR] Tauri build failed.
    exit /b 1
)

:: Step 3: Prepare portable directory
echo.
echo [3/4] Preparing portable package...
cd /d "%REPO_ROOT%"
if exist "release\portable" rmdir /s /q "release\portable"
mkdir "release\portable"

set "EXE_SRC=src-tauri\target\release\ZenNote.exe"
set "EXE_DST=release\portable\ZenNote.exe"

if not exist "%EXE_SRC%" (
    echo [ERROR] Built executable not found: %EXE_SRC%
    echo [ERROR] Make sure 'cargo tauri build' succeeded.
    exit /b 1
)

copy /y "%EXE_SRC%" "%EXE_DST%" >nul
echo [INFO] Copied %EXE_SRC% -> %EXE_DST%

:: Step 4: Zip the portable package
echo.
echo [4/4] Creating zip archive...
set "ZIP_PATH=%REPO_ROOT%\release\ZenNote-portable-windows.zip"
if exist "%ZIP_PATH%" del /f "%ZIP_PATH%"

powershell -NoProfile -Command "Compress-Archive -Path '%REPO_ROOT%\release\portable\*' -DestinationPath '%ZIP_PATH%' -Force"
if errorlevel 1 (
    echo [ERROR] Failed to create zip archive.
    exit /b 1
)

echo.
echo ===========================================
echo  Build complete!
echo  Output: %ZIP_PATH%
echo ===========================================

endlocal
