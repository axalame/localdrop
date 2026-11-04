@echo off
title LocalDrop - Clean Cache
echo Cleaning build cache...

rem Terminate any hanging localdrop processes
taskkill /F /IM localdrop.exe >nul 2>&1

echo Removing Rust build cache (src-tauri\target)...
if exist "src-tauri\target" rmdir /s /q "src-tauri\target"

echo Removing frontend dist...
if exist "dist" rmdir /s /q "dist"

echo.
echo [OK] Cache successfully cleaned! Disk space freed.
pause
