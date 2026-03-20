REM -------------------------------------------------------------------------------
REM
REM  PROJECT: Organization of a specific folder
REM
REM  @AUTHOR: Matthew Konneck
REM  @VERSION: 1.0
REM  @DATE: 2025/11/05
REM
REM  DESCRIPTION: This script prompts the user for a specific file to organize
REM               
REM               
REM
REM -------------------------------------------------------------------------------

echo off
setlocal

echo set WshShell = CreateObject("WScript.Shell") > input.vbs
echo FolderPath = InputBox("Enter the full path to the folder you would like to clean", "Automated Folder Cleaner", "C:\Users") >> input.vbs
echo If FolderPath = "" Then WScript.Quit >> input.vbs
echo set fs = CreateObject("Scripting.FileSystemObject") >> input.vbs
echo set a = fs.CreateTextFile("temp_Folder_Path.txt", True) >> input.vbs
echo a.WriteLine FolderPath >> input.vbs
echo a.close >> input.vbs

cscript //nologo input.vbs

set /p "Folder_Path=" < temp_Folder_Path.txt

if not defined Folder_Path (
    del input.vbs 2>nul
    del temp_Folder_Path.txt 2>nul
    goto :CleanupEnd
)

set "Archive_Path=%Folder_Path%\ARCHIVE"

mkdir "%Archive_Path%" 2>nul

for /f "tokens=1-3 delims=/ " %%a in ("%date%") do (
    set CurrentDate=%%c-%%a-%%b
)

set "Log_File=%Archive_Path%\cleanup_log_%CurrentDate%.txt"

echo --- Cleanup Log Started on %date% at %time% --- > "%Log_File%"

echo. >> "%Log_File%"

for %%f in ("%Folder_Path%\*.tmp" "%Folder_Path%\*.txt") do (
    if exist "%%f" (
        move "%%f" "%Archive_Path%" >nul
        echo %time% - MOVED: "%%f" >> "%Log_File%"
    )
)
echo Cleanup complete! Check "%Archive_Path%" for moved files and the log file.

:CleanupEnd
pause
del input.vbs 2>nul
del temp_Folder_Path.txt 2>nul
endlocal