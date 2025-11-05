REM -------------------------------------------------------------------------------
REM
REM  PROJECT: The Interactive Code Runner
REM
REM  @AUTHOR: Matthew Konneck
REM  @VERSION: 1.0
REM  @DATE: 2025/11/05
REM
REM  DESCRIPTION: This script provides a command-line menu to the user,
REM               allowing them to select and execute various common coding tasks
REM               and system utilities using IF and GOTO commands for control flow.
REM
REM -------------------------------------------------------------------------------

echo off
setlocal
pause
:MenuStart
cls

echo ------- Code Runner Menu-------------------------------------------------------

echo [1] Start VS Code
echo [2] Open Cleanup Log Folder (ARCHIVE)
echo [3] Ping Google (Test Internet)
echo [0] Exit

echo -------------------------------------------------------------------------------

set /p "Choice=Enter your Choice: "

if "%Choice%"=="1" goto :StartVSCode
if "%Choice%"=="2" goto :OpenScriptsFolder
if "%Choice%"=="3" goto :TestConnection
if "%Choice%"=="0" goto :ExitScript
if "%Choice%" NEQ "1" if "%Choice%" NEQ "2" if "%Choice%" NEQ "3" if "%Choice%" NEQ "0" (
    echo Invalid choice. Please try again.
    pause
    goto :MenuStart
)

:StartVSCode
    echo.
    echo Launching VS Code...
    start "" code
    pause
    goto :MenuStart

:OpenScriptsFolder
    echo.
    echo Opening Current Folder
    start explorer .
    pause
    goto :MenuStart

:TestConnection
    echo.
    echo pinging Google 4 times...
    ping -n 4 google.com
    pause
    goto :MenuStart

:ExitScript
    echo.
    echo Goodbye!
    endlocal
    exit /b