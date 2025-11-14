import datetime
from pathlib import Path
import os

#---------------------------------------------------------------------
#
#
#  PROJECT: Daily Work Folder Setup (Python)
#
#  @AUTHOR: Matthew Konneck
#  @VERSION: V1.0
#  @DATE: 11-14-25
#
#  DESCRIPTION: Creates a dated directory in a specified path for daily work.
#
#  -------------------------------------------------------------------
#  USER CONFIGURATION BLOCK
#
#  @param DEFAULT_ROOT_DIR: The root path where the dated folder will be created. 
#                           (e.g., /Users/username/Code/Projects)
#  @param FOLDER_SUFFIX:    The text appended to the date (e.g., "_Daily_Work").
#
#  -------------------------------------------------------------------
#
#---------------------------------------------------------------------

# -------------------------------------------------------------------
# USER CONFIGURATION BLOCK (The portable settings)
# -------------------------------------------------------------------
DEFAULT_ROOT_DIR = Path(os.path.expanduser("~/GitHub"))
FOLDER_SUFFIX = "_Daily_Work"
# -------------------------------------------------------------------

def create_daily_folder(root_dir: Path, suffix: str):
    TODAY = datetime.date.today().strftime("%Y-%m-%d")
    
    folder_name = f"{TODAY}{suffix}"
    full_path = root_dir / folder_name
    
    if full_path.exists():
        print (f"I'm sorry but this folder already exists: {full_path}")
    else:
        full_path.mkdir(parents=True)
        print (f"Congradulations, your folder has been created at: {full_path}")
        
if __name__ == "__main__":
    create_daily_folder(DEFAULT_ROOT_DIR, FOLDER_SUFFIX)
    