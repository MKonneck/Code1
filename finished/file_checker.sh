#!/bin/bash

#---------------------------------------------------------------------
#
#
#  PROJECT: File Checker
#
#  @AUTHOR: Matthew Konneck
#  @VERSION: V1.0
#  @DATE: 11-12-25
#
#  DESCRIPTION: A script that cleans up old log files 
#               (or any files you choose) from a specific directory.
#               
#                            
#
#
#---------------------------------------------------------------------

if [[ $# -ne 2 || $# -ne 3 ]];
then
    echo "Usage: ./cleanup.sh <target_directory> <age_in_days> <dry_run>"
    exit 1
fi

TARGET_DIR="$1"
AGE_DAYS="$2"
DRY_RUN="$3"

echo "Searching for files in $TARGET_DIR that are older than $AGE_DAYS ..."

for FILE in $(find "$TARGET_DIR" -type f -mtime +"$AGE_DAYS"); 
do
    echo "Found old file: $FILE "
    read -p "Would you like to delete? (y/n)" REPLY
    if [[ "$REPLY" == "y" || "$REPLY" == "Y" ]];
    then 
        if [ "$DRY_RUN" = "-d" ];
        then
            echo "[DRY_RUN] would delete: $FILE";
        else
            echo "Okay, deleting $FILE"
            rm "$FILE";
    else 
        echo "Okay, will not delete $FILE !"
        continue;
    fi
done
echo "---"
echo "File cleanup success!!"