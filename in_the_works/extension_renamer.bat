REM -------------------------------------------------------------------------------
REM
REM  PROJECT: The file extension renamer
REM
REM  @AUTHOR: Matthew Konneck
REM  @VERSION: 1.0
REM  @DATE: 2025/11/06
REM
REM  DESCRIPTION: This script checks if a command worked correctly and uses the 
REM               for command to rename files in bulk.
REM               
REM -------------------------------------------------------------------------------

echo off
setlocal

echo set WshShell = CreateObject("WScript.Shell") > input.vbs
echo Folder_Path = InputBox("Enter the full source folder path: ", "File Extension Renamer") >> input.vbs
echo If Folder_Path = "" Then WScript.Quit >> input.vbs
echo Old_Extension = InputBox("Enter the Old Extension you want to rename: ", "File Extension Renamer") >> input.vbs
echo If Old_Extension = "" Then WScript.Quit >> input.vbs
echo New_Extension = InputBox("Enter the New Extension you want to be renamed to", "File Extension Renamer") >> input.vbs
echo If New_Extension = "" Then WScript.Quit >> input.vbs

echo set fs = CreateObject("Scripting.FileSystemObject") >> input.vbs
echo set a = fs.CreateTextFile("Source_Folder_Path.txt", True) >> input.vbs
echo a.WriteLine Folder_Path >> input.vbs
echo a.Close >> input.vbs
echo set b = fs.CreateTextFile("Old_Extension.txt", True) >> input.vbs
echo b.WriteLine Old_Extension >> input.vbs
echo b.Close >> input.vbs
echo set c = fs.CreateTextFile("New_Extension.txt", True) >> input.vbs
echo c.WriteLine New_Extension >> input.vbs
echo c.Close >> input.vbs

cscript //nologo input.vbs

