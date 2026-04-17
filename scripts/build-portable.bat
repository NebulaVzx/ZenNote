@echo off
setlocal enabledelayedexpansion

:: ZenNote Windows Portable Build Script
:: Run this from the repository root

set "VERSION=0.2.6"

echo ===========================================
echo  ZenNote Portable Build for Windows
echo  Version: %VERSION%
echo ===========================================
echo.

:: Determine repo root (where this script lives)\..
cd /d "%~dp0\.."
set "REPO_ROOT=%cd%"
echo [INFO] Working directory: %REPO_ROOT%

:: Step 1: Build frontend
echo.
echo [1/5] Building frontend...
cd /d "%REPO_ROOT%\frontend"
call npm run build
if errorlevel 1 (
    echo [ERROR] Frontend build failed.
    exit /b 1
)

:: Step 2: Build Go backend
echo.
echo [2/5] Building Go backend...
cd /d "%REPO_ROOT%\backend"
call go run github.com/josephspurrier/goversioninfo/cmd/goversioninfo@latest -64 -icon "../src-tauri/icons/icon.ico" -o resource.syso versioninfo.json
if errorlevel 1 (
    echo [ERROR] Failed to generate version info for backend.
    exit /b 1
)
call go build -ldflags "-H=windowsgui -s -w" -o zennote-backend.exe .
set BUILD_ERR=%errorlevel%
if exist resource.syso del resource.syso
if %BUILD_ERR% neq 0 (
    echo [ERROR] Backend build failed.
    exit /b 1
)

:: Step 3: Build Tauri app
echo.
echo [3/5] Building Tauri app (release)...
cd /d "%REPO_ROOT%"
call npx tauri build
if errorlevel 1 (
    echo [ERROR] Tauri build failed.
    exit /b 1
)

:: Step 4: Prepare portable directory
echo.
echo [4/5] Preparing portable package...
cd /d "%REPO_ROOT%"
if exist "release\portable" rmdir /s /q "release\portable"
mkdir "release\portable"
mkdir "release\portable\bin"

set "EXE_SRC=%REPO_ROOT%\src-tauri\target\release\tauri-app.exe"
set "EXE_DST=%REPO_ROOT%\release\portable\ZenNote.exe"
set "BACKEND_SRC=%REPO_ROOT%\backend\zennote-backend.exe"
set "BACKEND_DST=%REPO_ROOT%\release\portable\bin\zennote-backend.exe"

if not exist "%EXE_SRC%" (
    echo [ERROR] Built executable not found: %EXE_SRC%
    echo [ERROR] Make sure 'npx tauri build' succeeded.
    exit /b 1
)
if not exist "%BACKEND_SRC%" (
    echo [ERROR] Built backend not found: %BACKEND_SRC%
    echo [ERROR] Make sure 'go build' succeeded.
    exit /b 1
)

copy /y "%EXE_SRC%" "%EXE_DST%" >nul
echo [INFO] Copied %EXE_SRC% -^> %EXE_DST%
copy /y "%BACKEND_SRC%" "%BACKEND_DST%" >nul
echo [INFO] Copied %BACKEND_SRC% -^> %BACKEND_DST%

:: Step 5: Zip the portable package
echo.
echo [5/5] Creating zip archive...
set "OUT_DIR=%REPO_ROOT%\release\v%VERSION%"
set "ZIP_PATH=%OUT_DIR%\ZenNote-%VERSION%-portable-windows.zip"
if exist "%OUT_DIR%" rmdir /s /q "%OUT_DIR%"
mkdir "%OUT_DIR%"

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

:: Clean up temporary portable folder
if exist "release\portable" rmdir /s /q "release\portable"

endlocal
