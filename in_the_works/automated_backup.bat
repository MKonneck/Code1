REM -------------------------------------------------------------------------------
REM
REM  PROJECT: A script that backs up a specific folder and uses a dedicated
REM           function to display status messages
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
echo SourceFolder = InputBox("Enter the full file path of the source folder: ", "Automated Backup Wizard") >> input.vbs
echo If SourceFolder = "" Then WScript.Quit >> input.vbs
echo DestinationFolder = InputBox("Enter the full file path of the destination folder: ", "Automated Backup Wizard") >> input.vbs
echo If DestinationFolder = "" Then WScript.Quit >> input.vbs
echo set fs = CreateObject("Scripting.FileSystemObject") > input.vbs
echo set a = fs.CreateTextFile("source_folder_path.txt", True) >> input.vbs
echo a.WriteLine SourceFolder >> input.vbs
echo set b = fs.CreateTextFile("destination_folder_path.txt", True) >> input.vbs
echo b.WriteLine DestinationFolder >> input.vbs
echo a.close>>

set /p "Source_Folder=" < source_folder_path.txt
set /p "Destination_Folder=" < destination_folder_path.txt


@REM :LogStatus
@REM     echo ------------------------------------------------
@REM     echo STATUS: %1 (Called at %time%)
@REM     echo ------------------------------------------------
@REM     goto :eof

