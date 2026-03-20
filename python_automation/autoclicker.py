import time
import threading
from pynput.mouse import Button, Controller as MouseController
from pynput.keyboard import Key, Listener as KeyboardListener

# --- CONFIGURATION ---

# 1. Clicks Per Second (CPS): Change this value to adjust the speed.
#    Example: 10 CPS means 1 click every 0.1 seconds.
CLICKS_PER_SECOND = 10

# 2. Toggle Key: Press this key to start and stop the autoclicker.
#    pynput key codes:
#    - For Function keys: Key.f6, Key.f7, etc.
#    - For middle mouse button: Button.middle (If you wanted to use a mouse button)
TOGGLE_KEY = Key.f6

# --- CORE LOGIC ---

# Calculate the time delay required between each click
DELAY_TIME = 1.0 / CLICKS_PER_SECOND

# Initialize mouse controller and a flag to control the clicking state
mouse = MouseController()
clicking = False

# The function that runs in a separate thread and performs the clicks
def clicker_function():
    """Continuously clicks the left mouse button while the 'clicking' flag is True."""
    print(f"--- Clicker Started at {CLICKS_PER_SECOND} CPS ---")
    while clicking:
        # Simulate a left click at the mouse's current position
        mouse.click(Button.left)
        # Wait for the calculated delay time
        time.sleep(DELAY_TIME)
    print("--- Clicker Stopped ---")

# The function that listens for the toggle key press
def on_press(key):
    """Handles key presses to start/stop the autoclicker thread."""
    global clicking
    
    if key == TOGGLE_KEY:
        if not clicking:
            # Start clicking
            clicking = True
            # Create and start the clicking thread
            click_thread = threading.Thread(target=clicker_function)
            click_thread.start()
        else:
            # Stop clicking
            clicking = False
            
    # Optional: Press ESC to exit the entire program
    if key == Key.esc:
        print("\nExiting program...")
        # Stop the keyboard listener
        return False
        
# Main function to set up and run the keyboard listener
def main():
    print(f"Autoclicker Ready! Configuration:")
    print(f"  - Speed: {CLICKS_PER_SECOND} CPS")
    print(f"  - Toggle Key: {TOGGLE_KEY}")
    print("Press the TOGGLE KEY to start/stop clicking.")
    print("Press ESC to exit the program.")
    
    time.sleep(1)
    
    # Start the keyboard listener and keep the main thread alive
    with KeyboardListener(on_press=on_press) as listener:  # type: ignore[reportArgumentType]
        listener.join()

if __name__ == "__main__":
    main()