@echo off
title Generate Master Backup
py make_backup.py
if errorlevel 1 python make_backup.py
echo.
echo Backup file: MASTER_BACKUP.txt
pause