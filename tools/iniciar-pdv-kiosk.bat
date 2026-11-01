@echo off
title Cybertech RP - Inicializador PDV Kiosk
echo =======================================================
echo     CYBERTECH RP - TERMINAL PDV COM IMPRESSAO DIRETA
echo =======================================================
echo.
echo Iniciando o PDV com impressao automatica ativada...
echo.

set TARGET_URL=http://localhost:3000/pdv

:: 1. Tentar Chrome
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --kiosk-printing --app=%TARGET_URL%
    exit
)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --kiosk-printing --app=%TARGET_URL%
    exit
)
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    start "" "%LocalAppData%\Google\Chrome\Application\chrome.exe" --kiosk-printing --app=%TARGET_URL%
    exit
)

:: 2. Tentar Microsoft Edge (nativo em qualquer Windows 10/11)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --kiosk-printing --app=%TARGET_URL%
    exit
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --kiosk-printing --app=%TARGET_URL%
    exit
)

:: Fallback padrao
start %TARGET_URL%

