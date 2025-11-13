#!/bin/bash

#---------------------------------------------------------------------
#
#
#  PROJECT: Automated Local Backup
#
#  @AUTHOR: Matthew Konneck
#  @VERSION: V1.0
#  @DATE: 11-13-25
#
#  DESCRIPTION: Creates a compressed .tar.gz archive of a source directory 
#               and saves it to a user-specified destination.
#
#---------------------------------------------------------------------

SOURCE_DIR=$(osascript -e 'display dialog "Enter the FULL path of the directory to BACKUP:" default answer "/Users/'$USER'/Documents"' -e 'text returned of result')

if [ ! -d "$SOURCE_DIR" ]; then
    osascript -e "display alert \"Backup Failed!\" message \"Source directory not found: $SOURCE_DIR\" buttons {\"OK\"}"
    exit 1
fi

BACKUP_DIR=$(osascript -e 'display dialog "Enter the FULL path for the backup destination:" default answer "/Users/'$USER'/Backups"' -e 'text returned of result')

DATE_SUFFIX=$(date +%Y%m%d_%H)
FILENAME="backup_${DATE_SUFFIX}.tar.gz"

ARCHIVE_PATH="$BACKUP_DIR/$FILENAME"

if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    echo "Created backup directory: $BACKUP_DIR"
fi

echo "Starting backup of $SOURCE_DIR to $BACKUP_DIR ..."

tar -czf "$ARCHIVE_PATH" -C "$(dirname "$SOURCE_DIR")" "$(basename "$SOURCE_DIR")"

echo "Backup Completed!"

if [ $? -eq 0 ]; then
    echo "Backup finished successfully. Saved to: $ARCHIVE_PATH"
else
    echo "Backup failed!"
fi
