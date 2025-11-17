import subprocess

def launch_weather():
    subprocess.run(['python', 'weather_reporter.py'])
    
def launch_autoclicker():
    subprocess.run(['python', 'autoclicker.py'])
    
def main():
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
        
if __name__ == "__main__":
    main()