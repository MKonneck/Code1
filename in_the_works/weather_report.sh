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

CITY_NAME="GRAND_HAVEN"
WEATHER_URL="wttr.in/$CITY_NAME?format=3"

WEATHER_DATA=$(curl "$WEATHER_URL")

NOTIFICATION_TITLE="Current weather for $CITY_NAME"

osascript -e "display notification \"$WEATHER_DATA\" with title \"$NOTIFICATION_TITLE\"

echo "Weather Fetched: $WEATHER_DATA"