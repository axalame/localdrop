@echo off
title LocalDrop - Build EXE
echo Сборка автономного EXE файла LocalDrop...
npx.cmd @tauri-apps/cli build
pause
