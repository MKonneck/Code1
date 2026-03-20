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

def get_city_name():
    try:
        result = subprocess.run(
            [
                "osascript",
                "-e",
                f'display dialog "Input your current City:" default answer "{DEFAULT_CITY}"',
                "-e",
                "text returned of result",
            ],
            capture_output=True,
            text=True,
            check=True,
        )
        city = result.stdout.strip()
    except Exception:
        default_pretty = DEFAULT_CITY.replace("_", " ")
        user_input = input(f"Input your current City [{default_pretty}]: ").strip()
        city = user_input or default_pretty
    city = city.replace(" ", "_")
    return city

def fetch_weather(city_name: str) -> str:
    
    url = f"https://wttr.in/{city_name}{WEATHER_FORMAT}"
    with urllib.request.urlopen(url) as response:
        data = response.read().decode("utf-8")
    return data


def show_notification(city_name: str, weather_text: str) -> None:
    
    display_city = city_name.replace("_", " ")
    title = f"Current Weather for {display_city}"

    safe_text = weather_text.replace('"', "'")

    try:
        subprocess.run(
            [
                "osascript",
                "-e",
                f'display alert "{title}" message "{safe_text}"',
            ],
            check=True,
        )
    except Exception:
        # If osascript isn't available, just print to terminal
        print(title)
        print(weather_text)


def main() -> None:
    city = get_city_name()
    weather = fetch_weather(city)
    show_notification(city, weather)
    print(f"Weather Fetched: {weather}")


if __name__ == "__main__":
    main()