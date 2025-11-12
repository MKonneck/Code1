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
mkdir "${TODAY}_Daily_Work"
