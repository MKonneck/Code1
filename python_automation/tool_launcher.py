import subprocess
import sys

def launch_weather():
    subprocess.run([sys.executable, 'weather_reporter.py'])
    
def launch_autoclicker():
    subprocess.run([sys.executable, 'autoclicker.py'])
    
def main():
    while True:
        print("1. Launch Weather")
        print("2. Launch Auto Clicker")
        print("3. Exit")
    
        choice = input("Choose: ")

        if choice == "1":
            launch_weather()
        elif choice == "2":
            launch_autoclicker()
        else:
            print("Bye!")
            break  # 
    else:
            print("Invalid choice, try again.\n")
        
if __name__ == "__main__":
    main()