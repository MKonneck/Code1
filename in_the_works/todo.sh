#!/bin/bash

#---------------------------------------------------------------------
#
#
#  PROJECT: Interactive todo list
#
#  @AUTHOR: Matthew Konneck
#  @VERSION: V1.0
#  @DATE: 11-13-25
#
#  DESCRIPTION: Presents a GUI menu for three options: Add, View, or 
#               Clear tasks. 
#               
#
#---------------------------------------------------------------------

TODO_FILE="~/github/Code1/TestFiles/ToDo_List.txt"

CHOICE=$(osascript -e 'display dialog "What would you like to do with your To-do list?" buttons {"Add Task","View List","Clear List","Exit" default button "Exit"' -e 'button returned of result'})

case "$CHOICE" in
    "Add Task")    
    TASK=$(osascript -e 'display dialog "Enter the new task:" default answer ""' -e 'text returned of result')
    echo "$(date +%Y-%m-%d): $TASK" >> "$TODO_FILE"

    osascript -e "display alert \"Task Added!\" message \"$TASK\""
        ;;
    "View List")
    if [ -s "$TODO_FILE" ]; then
    LIST_CONTENT=$(cat "$TODO_FILE")
    osascript -e "display alert \"Your To-Do List\" message \"$LIST_CONTENT\""
    else
    osascript -e "display alert \"List is Empty\" message \"You have no tasks!\""
    fi
        ;;
    "Clear List")
        >  "$TODO_FILE"
        ;;
    *)
        
        exit 0
        ;;
esac