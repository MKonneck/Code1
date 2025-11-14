import subprocess
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
        message=f"I'm sorry but this folder already exists: {full_path}"
        print(message)
        show_gui_alert("Folder Exists!", message)
    else:
        try:
            full_path.mkdir(parents=True)
            message=f"Congratulations, your folder has been created at: {full_path}"
            print(message)
            show_gui_alert("Your folder has been created!", message)
        except Exception as e:
            error_msg = f"Failed to create folder: {e}"
            print(error_msg)
            show_gui_alert("Creation Failed!", error_msg)
        
        
def get_gui_input(prompt: str, default_answer: str) -> str:
    script = f'display dialog "{prompt}" default answer "{default_answer}"'

    try:
        result = subprocess.run(
         ['osascript', '-e', f'text returned of (display dialog "{prompt}" default answer "{default_answer}")'],
            capture_output=True,
            text=True,
            check=True   
        )
        
        return result.stdout.strip()
    except subprocess.CalledProcessError:
        return default_answer
    except Exception as e:
        print (f'Unexpected error occured with the GUI: {e}')
        return default_answer
            
def show_gui_alert(title:str,message:str):
    try:
        subprocess.run(
        ['osascript', '-e', f'display alert "{title}" message "{message}"'],
        check=True,
        capture_output=True,
    )
    except subprocess.CalledProcessError as e:
        print (f'Error showing alert: {e.stderr}')
    except Exception as e:
        print (f'An unexpected error occured: {e}')
            
if __name__ == "__main__":
    user_root_str = get_gui_input(
        prompt="Enter the FULL path for your work folder:",
        default_answer=str(DEFAULT_ROOT_DIR)
    )
    
    final_root_directory= Path(user_root_str)
    
    create_daily_folder(final_root_directory, FOLDER_SUFFIX)
    