# -------------------------------------------------------------------------------
#
#  PROJECT: The Interactive Code Runner
#
#  @AUTHOR: Matthew Konneck
#  @VERSION: 1.0
#  @DATE: 2025/11/05
#
#  DESCRIPTION: This script provides a command-line menu to the user,
#               allowing them to select and execute various common coding tasks
#               and system utilities using IF and GOTO commands for control flow.
#
# -------------------------------------------------------------------------------

#!/bin/bash

read -p "What is the name of the new file?: " project_name
echo "Creating Main Folder..."
mkdir -p "$project_name"
echo "Project Created!"
cd "$project_name"
echo "Creating Sub-Folders..."
mkdir -p "src"
mkdir -p "docs"
mkdir -p "assets"
echo "Sub-Folders have been created!"
