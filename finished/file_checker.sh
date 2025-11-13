#!/bin/bash

#---------------------------------------------------------------------
#
#  PROJECT: File Checker
#
#  @AUTHOR: Matthew Konneck
#  @VERSION: V2.1
#  @DATE: 11-12-25
#
#  DESCRIPTION: A script that cleans up old log files 
#               (or any files you choose) from a specific directory.
#               
#  NOTES:      Changed from CLI input to display input.
#
#  -------------------------------------------------------------------
#  USER CONFIGURATION BLOCK
#
#  @param DEFAULT_AGE_DAYS: Requires a maximum amount of days since
#                           edited to start looking through.
#                           
#
#  -------------------------------------------------------------------
#
#---------------------------------------------------------------------

# --- CONFIGURATION VARIABLES ---
DEFAULT_AGE_DAYS=30
# -------------------------------



TARGET_DIR=$(osascript -e 'display dialog "Enter the FULL path to the directory to clean (e.g., /Users/me/Downloads)" default answer "/Users/'$USER'/Downloads"' -e 'text returned of result')

AGE_DAYS=$(osascript -e 'display dialog "Delete files older than (Days):" default answer "'$DEFAULT_AGE_DAYS'"' -e 'text returned of result')

DRY_RUN_RESPONSE=$(osascript -e 'display dialog "Do you want to run this in Dry Run Mode?\n\n(No files will be deleted, only displayed.)" buttons {"Yes", "No"} default button "No"' -e 'button returned of result')

IS_DRY_RUN="false"
if [ "$DRY_RUN_RESPONSE" = "Yes" ]; then
    IS_DRY_RUN="true"
    osascript -e 'display alert "DRY RUN MODE ENABLED" message "No files will be deleted. The script will only show you what WOULD be deleted."'
fi

osascript -e "display notification \"Scanning $TARGET_DIR for files older than $AGE_DAYS days.\" with title \"Cleanup Script Running\""

for FILE in $(find "$TARGET_DIR" -type f -mtime +"$AGE_DAYS"); 
   do
    RESPONSE=$(osascript -e 'display dialog "Found old file: '$FILE'\n\nWould you like to delete it?" buttons {"Yes", "No"} default button "No"' -e 'button returned of result')

    if [ "$RESPONSE" = "Yes" ]; then
        if [ "$DRY_RUN_RESPONSE" = "true" ]; then
            echo "[DRY_RUN] would have deleted: $FILE"
        else
            echo "--> Deleting $FILE..."
            rm "$FILE"
        fi
    else 
        echo "--> Skipping $FILE. Will not delete."
        continue
    fi
done
echo "---"
echo "File cleanup success!!"
if [ "$IS_DRY_RUN" = "true" ]; then
    osascript -e 'display dialog "Dry Run Complete.\n\nNo files were deleted." buttons {"OK"} default button "OK"'
else
    osascript -e 'display dialog "File Cleanup Success!\n\nCheck your terminal for details." buttons {"OK"} default button "OK"'
fi