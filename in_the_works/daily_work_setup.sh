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

TODAY=$(date +"%Y-%m-%d")
folder_name="${TODAY}_Daily_Work"
if [-d "$folder_name"];
then echo "I'm sorry but this folder already exists!";
else make_folder= mkdir $folder_name 
    echo "Congradulations your folder has been created!";
fi