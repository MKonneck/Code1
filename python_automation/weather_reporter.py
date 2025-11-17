#!/usr/bin/env python3

#---------------------------------------------------------------------
#
#  PROJECT: Automated weather reporter (Python version)
#
#  @AUTHOR: Matthew Konneck
#  @VERSION: V1.0
#  @DATE: 11-17-25
#
#  DESCRIPTION: Uses Python to fetch the current weather forecast
#               for your chosen location from wttr.in and display
#               a simple summary using an osascript notification.
#
#  -------------------------------------------------------------------
#  USER CONFIGURATION BLOCK
#
#  @param DEFAULT_CITY: The default city to use if none is entered.
#  @param WEATHER_FORMAT: The wttr.in format string for output.
#
#  -------------------------------------------------------------------
#
#---------------------------------------------------------------------

import subprocess
import urllib.request
import sys

# --- CONFIGURATION VARIABLES ---
DEFAULT_CITY = "Holland_MI"
WEATHER_FORMAT = "?format=%c%C\n%t\n%p\n%w"
# -------------------------------
