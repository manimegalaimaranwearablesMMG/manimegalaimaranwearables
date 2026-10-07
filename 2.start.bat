@echo off
title Mahadev Fashion Hub — Server
echo Starting backend server...
echo.
echo   Admin:  http://localhost:5000/admin.html
echo   Store:  http://localhost:5000/index.html
echo.
start "" http://localhost:5000/admin.html
py server.py || python server.py
pause