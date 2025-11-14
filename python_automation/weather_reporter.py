import subprocess
import datetime
from pathlib import Path
import os
import requests # <-- New Library for Web Connectivity

#---------------------------------------------------------------------
#
#
#  PROJECT: Automated Weather Reporter (Python)
#
#  @AUTHOR: Matthew Konneck
#  @VERSION: V2.0
#  @DATE: 11-14-25
#
#  DESCRIPTION: Fetches the current weather forecast for a user-specified 
#               location from wttr.in and displays a summary via alert box.
#
#  -------------------------------------------------------------------
#  USER CONFIGURATION BLOCK
#
#  @param DEFAULT_CITY:    The city/location that appears as the default answer (e.g., "Grand_Haven_mi").
#  @param WEATHER_FORMAT:  The format string appended to the URL (e.g., "?format=3").
#
#  -------------------------------------------------------------------
#
#---------------------------------------------------------------------

# --- CONFIGURATION VARIABLES ---
DEFAULT_CITY="Holland_mi"
WEATHER_FORMAT="?format=%c%C\n%t\n%p\n%w"
# -------------------------------
