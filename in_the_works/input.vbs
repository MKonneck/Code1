set fs = CreateObject("Scripting.FileSystemObject") 
set a = fs.CreateTextFile("source_folder_path.txt", True) 
a.WriteLine SourceFolder 
set b = fs.CreateTextFile("destination_folder_path.txt", True) 
b.WriteLine DestinationFolder 
