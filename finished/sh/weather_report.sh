#!/bin/bash

#---------------------------------------------------------------------
#
#
#  PROJECT: Automated weather reporter
#
#  @AUTHOR: Matthew Konneck
#  @VERSION: V1.0
#  @DATE: 11-13-25
#
#  DESCRIPTION: Uses a command-line tool to fetch the current weather 
#               forecast for your location and display a simple 
#               summary using an osascript notification.
#
#  -------------------------------------------------------------------
#  USER CONFIGURATION BLOCK
#
#  @param DEFAULT_CITY: The directory to archive by default.
#  @param WEATHER_FORMAT: The destination for the archived files.  
#
#  -------------------------------------------------------------------
#
#---------------------------------------------------------------------

# --- CONFIGURATION VARIABLES ---
DEFAULT_CITY="Holland_MI"
WEATHER_FORMAT="?format=%c%C\n%t\n%p\n%w"
# -------------------------------

CITY_NAME=$(osascript -e 'display dialog "Input your current City:" default answer "'$DEFAULT_CITY'"' -e 'text returned of result')
CITY_NAME=$(echo "$CITY_NAME" | sed 's/ /_/g')
WEATHER_URL="wttr.in/$CITY_NAME$WEATHER_FORMAT"

RAW_WEATHER_DATA=$(curl -s "$WEATHER_URL")

DISPLAY_CITY_NAME=$(echo "$CITY_NAME" | tr '_' ' ')

NOTIFICATION_TITLE="Current Weather for $DISPLAY_CITY_NAME"

osascript -e "display alert \"Current Weather for $DISPLAY_CITY_NAME\" message \"$RAW_WEATHER_DATA\""

echo "Weather Fetched: $RAW_WEATHER_DATA"