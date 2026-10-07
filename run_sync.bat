@echo off
setlocal enabledelayedexpansion
title Mahadev Fashion Studio - Code Patch and Sync
color 0b

echo ========================================================
echo    MAHADEV FASHION STUDIO AUTOMATED REPO SYNC
echo ========================================================
echo.

:: 1. Verify patch.txt exists
if not exist "patch.txt" (
    echo [ERROR] patch.txt was not found in this folder!
    echo Please make sure patch.txt is in the same folder as this .bat file.
    goto END
)

:: 2. Verify auto_patch_sync.py exists
if not exist "auto_patch_sync.py" (
    echo [ERROR] auto_patch_sync.py was not found in this folder!
    goto END
)

:: 3. Test for python command or py launcher
where py >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [OK] Running via Windows Python launcher (py)...
    py auto_patch_sync.py
    goto END
)

where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [OK] Running via python...
    python auto_patch_sync.py
    goto END
)

echo [ERROR] Python is not recognized in your system PATH!
echo To fix this:
echo 1. Open Windows Command Prompt.
echo 2. Type "py --version" or "python --version".
echo 3. If neither works, Python must be installed or added to PATH.

:END
echo.
echo ========================================================
echo Process finished.
pause