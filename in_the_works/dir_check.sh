#!/bin/bash

#TODO:
#   Add elements to make it use input boxes and visuals

# -------------------------------------------------------------------------------
#
#  PROJECT: Asks the user for a file path and checks if file path exists
#
#  @AUTHOR: Matthew Konneck
#  @VERSION: 1.0
#  @DATE: 2025/11/11
#
#  DESCRIPTION: This project asks the user for a full file path of a folder and
#               checks the computer to make sure the file is actually on the 
#               computer.
#
# -------------------------------------------------------------------------------

read -p "Enter folder path: " folder_path

if [ -d "$folder_path" ]; 
then echo "Congratulations this folder exists!!";
else echo "Oopsie daisy, this folder doesn't exist ):"
fi