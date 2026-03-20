REM -------------------------------------------------------------------------------
REM
REM  PROJECT: Automated Project Folder Creator
REM
REM  @AUTHOR: Matthew Konneck
REM  @VERSION: 1.0
REM  @DATE: 2025/11/05
REM
REM  DESCRIPTION: This script prompts the user for a project name via a popup,
REM               creates the main folder and subfolders (src, docs, assets),
REM               and automatically opens the new directory in VS Code.
REM
REM -------------------------------------------------------------------------------

echo off
setlocal
echo set WshShell = CreateObject("WScript.Shell") > input.vbs
echo ProjectName = InputBox("Enter the name of your new project:", "New project setup", "MyNewProject") >> input.vbs
echo If ProjectName = "" Then WScript.Quit >> input.vbs 
echo set fs = CreateObject("Scripting.FileSystemObject") >> input.vbs
echo set a = fs.CreateTextFile("temp_project_name.txt", True) >> input.vbs
echo a.WriteLine ProjectName >> input.vbs
echo a.Close >> input.vbs

cscript //nologo input.vbs

set /p "project_name=" < temp_project_name.txt

del input.vbs
del temp_project_name.txt

if not defined project_name goto :EndScript

echo Creating Project Folder: %project_name%
mkdir %project_name%
echo Creating Subfolders...
mkdir %project_name%\src
mkdir %project_name%\docs
mkdir %project_name%\assets

start "" code "%project_name%"
echo msgbox "Project %project_name% has been created and opened in VSCode!", 64, "Project setup complete" > temp_popup.vbs
wscript temp_popup.vbs
del temp_popup.vbs

:EndScript
endlocal