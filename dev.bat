@echo off
title LocalDrop - Dev Mode
echo Starting LocalDrop in development mode...

rem Terminate any hanging localdrop processes
taskkill /F /IM localdrop.exe >nul 2>&1

set "MINGW_DIR=C:\Users\PC\AppData\Local\Microsoft\WinGet\Packages\BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\mingw64\bin"
set "PATH=%MINGW_DIR%;%PATH%"

if not exist "src-tauri\target\debug" mkdir "src-tauri\target\debug"
copy /y "%MINGW_DIR%\libwinpthread-1.dll" "src-tauri\target\debug\" >nul 2>&1
copy /y "%MINGW_DIR%\libgcc_s_seh-1.dll" "src-tauri\target\debug\" >nul 2>&1

echo Building frontend assets for mobile devices...
call npm.cmd run build

call npx.cmd @tauri-apps/cli dev
if %ERRORLEVEL% neq 0 (
    echo.
    echo [!] Application exited with error code: %ERRORLEVEL%
)
pause
