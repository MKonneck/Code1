#!/bin/bash

#---------------------------------------------------------------------
#
#
#  PROJECT: File Checker
#
#  @AUTHOR: Matthew Konneck
#  @VERSION: V2.0
#  @DATE: 11-12-25
#
#  DESCRIPTION: A script that cleans up old log files 
#               (or any files you choose) from a specific directory.
#               
#  NOTES:      Changed from CLI input to display input
#
#
#---------------------------------------------------------------------


TARGET_DIR=$(osascript -e 'display dialog "Enter the FULL path to the directory to clean (e.g., /Users/me/Downloads)" default answer "/Users/'$USER'/Downloads"' -e 'text returned of result')

AGE_DAYS=$(osascript -e 'display dialog "Delete files older than (Days):" default answer "30"' -e 'text returned of result')

osascript -e "display notification \"Scanning $TARGET_DIR for files older than $AGE_DAYS days.\" with title \"Cleanup Script Running\""

for FILE in $(find "$TARGET_DIR" -type f -mtime +"$AGE_DAYS"); 
   do
    RESPONSE=$(osascript -e 'display dialog "Found old file: '$FILE'\n\nWould you like to delete it?" buttons {"Yes", "No"} default button "No"' -e 'button returned of result')

    if [ "$RESPONSE" = "Yes" ]; then
        echo "--> Deleting $FILE..."
        rm "$FILE"
    else 
        echo "--> Skipping $FILE. Will not delete."
    fi
done
echo "---"
echo "File cleanup success!!"