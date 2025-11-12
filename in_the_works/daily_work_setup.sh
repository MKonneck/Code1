#!/bin/bash

#---------------------------------------------------------------------
#
#
#  PROJECT: Daily work setup
#
#  @AUTHOR: Matthew Konneck
#  @VERSION: V1.0
#  @DATE: 11-12-25
#
#  DESCRIPTION: Create a script that, when run, will check for and 
#               create a new directory named with today's date 
#               in a specific format (e.g., YYYY-MM-DD_Daily_Work).
#                            
#
#
#---------------------------------------------------------------------

default_path="iCloud Drive/Documents/GitHub"

if [ $# -gt 0 ];
then
    target_dir="$1"
else
    target_dir="$default_path"
fi
TODAY=$(date +"%Y-%m-%d")
folder_name="${TODAY}_Daily_Work"
if [ -d "$folder_name" ];
then 
    echo "I'm sorry but this folder already exists!";
else
    cd $target_dir
    mkdir $folder_name
    echo "Congradulations your folder has been created!";
fi 