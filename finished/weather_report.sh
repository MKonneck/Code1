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
#---------------------------------------------------------------------

CITY_NAME=$(osascript -e 'display dialog "Input your current City:" default answer "Holland_mi"' -e 'text returned of result')
CITY_NAME=$(echo "$CITY_NAME" | sed 's/ /_/g')
WEATHER_URL="wttr.in/$CITY_NAME?format=3"

RAW_WEATHER_DATA=$(curl -s "$WEATHER_URL")

CLEAN_WEATHER_DATA=$(echo "$RAW_WEATHER_DATA" | tr -d '[:cntrl:]' | sed 's/"/\\"/g')

DISPLAY_CITY_NAME=$(echo "$CITY_NAME" | tr '_' ' ')

NOTIFICATION_TITLE="Current Weather for $DISPLAY_CITY_NAME"

osascript -e "display alert \"Current Weather for $DISPLAY_CITY_NAME\" message \"$CLEAN_WEATHER_DATA\""

echo "Weather Fetched: $CLEAN_WEATHER_DATA"