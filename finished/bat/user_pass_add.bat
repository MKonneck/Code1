REM -------------------------------------------------------------------------------
REM
REM  PROJECT: Adding a user with admin privileges and assigning a password via a 
REM           batch script.
REM
REM  @AUTHOR: Matthew Konneck
REM  @VERSION: 1.0
REM  @DATE: 2025/11/05
REM
REM  DESCRIPTION: This script prompts for a username and password, and then adds
REM               the user to the system with administrative privileges.
REM           
REM
REM -------------------------------------------------------------------------------

echo off

set /p username=Enter the username: 
set /p password=Enter the password: 
net user "%username%" "%password%" /add

net localgroup Administrators "%username%" /add

echo User "%username%" has been added and given admin privileges.

pause