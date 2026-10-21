@echo off
title Mahadev Fashion Hub — Sync
py auto_patch_sync.py
if errorlevel 1 python auto_patch_sync.py
pause