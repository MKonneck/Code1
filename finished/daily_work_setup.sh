#!/bin/bash

#---------------------------------------------------------------------
#
#
#  PROJECT: Daily work setup
#
#  @AUTHOR: Matthew Konneck
#  @VERSION: V2.0
#  @DATE: 11-13-25
#
#  DESCRIPTION: Create a script that, when run, will check for and 
#               create a new directory named with today's date 
#               in a specific format (e.g., YYYY-MM-DD_Daily_Work).
#
#  -------------------------------------------------------------------
#  USER CONFIGURATION BLOCK
#
#  @param DEFAULT_ROOT_DIR: The default path to use if no argument is 
#                           provided. 
#                           (e.g., /Users/username/Documents/Code)
#  @param FOLDER_SUFFIX:    The text appended to the date 
#                           (e.g., "_Daily_Work").
#
#  -------------------------------------------------------------------                            
#
#---------------------------------------------------------------------

# --- CONFIGURATION VARIABLES ---
DEFAULT_ROOT_DIR="$HOME/GitHub"
FOLDER_SUFFIX="_Daily_Work"
# -------------------------------

# The rest of the script is now DRY (Don't Repeat Yourself)

if [ $# -gt 0 ];
then
    target_dir="$1"
else
    target_dir="$DEFAULT_ROOT_DIR"
fi
TODAY=$(date +"%Y-%m-%d")
folder_name="${TODAY}${FOLDER_SUFFIX}"
full_path="$target_dir/$folder_name"
if [ -d "$full_path" ];
then 
    echo "I'm sorry but this folder already exists!";
else
    mkdir "$full_path"
    echo "Congradulations your folder has been created!";
fi 