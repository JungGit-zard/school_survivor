Option Explicit
Dim shell, command, status
If WScript.Arguments.Count <> 1 Then WScript.Quit 2
Set shell = CreateObject("WScript.Shell")
command = Chr(34) & shell.ExpandEnvironmentStrings("%ComSpec%") & Chr(34) & " /d /s /c " & Chr(34) & Chr(34) & WScript.Arguments(0) & Chr(34) & Chr(34)
status = shell.Run(command, 0, True)
WScript.Quit status
