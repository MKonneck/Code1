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

set WshShell = CreateObject("WScript.Shell") > input.vbs
if Choice = "" Then WScript.Quit >> input.vbs
set fs = CreateObject("Scripting.FileSystemObject") >> input.vbs
set a = fs.CreateTextFile("temp_user_choice.txt", True) >> input.vbs
a.WriteLine Choice >> input.vbs
a.Close >> input.vbs

cscript //nologo input.vbs

set /p "Choice=" < Temp_User_Choice.txt

del input.vbs

endlocal