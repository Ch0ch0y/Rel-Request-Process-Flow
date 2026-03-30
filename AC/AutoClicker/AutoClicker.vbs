' Auto Clicker - VBScript Version (No Python Required)
' This script performs automated actions to keep your screen active
' Double-click this file to run
' Press Ctrl+C to stop

Option Explicit
Dim shell, mode, action_count, interval, choice
Dim folderName

Set shell = CreateObject("WScript.Shell")

Randomize

' Show menu
WScript.Echo ""
WScript.Echo "╔════════════════════════════════════════════════════════════╗"
WScript.Echo "║   AUTO CLICKER - NO PYTHON REQUIRED                       ║"
WScript.Echo "╚════════════════════════════════════════════════════════════╝"
WScript.Echo ""
WScript.Echo "Modes:"
WScript.Echo "   1) Scroll page (Page Up/Down keys)"
WScript.Echo "   2) Press spacebar"
WScript.Echo "   3) Arrow keys (random direction)"
WScript.Echo ""

choice = InputBox("Select mode (1-3) or press Cancel to exit:", "Auto Clicker", "1")

If choice = "" Then
    WScript.Quit
End If

action_count = 0

WScript.Echo ""
WScript.Echo "Auto Clicker Started - Mode: " & choice
WScript.Echo "Running actions every 1-3 seconds..."
WScript.Echo "Press Ctrl+C in the command window to stop"
WScript.Echo ""
WScript.Echo "Time            Action"
WScript.Echo "======================================"

On Error Resume Next

Select Case choice
    Case "1"
        Call ScrollMode()
    Case "2"
        Call SpacebarMode()
    Case "3"
        Call ArrowKeyMode()
    Case Else
        Call ScrollMode()
End Select

Sub ScrollMode()
    Do
        interval = Int(Rnd * 2000 + 1000)
        WScript.Sleep interval
        
        If Int(Rnd * 2) = 0 Then
            shell.SendKeys "{PAGEDOWN}"
            LogAction "Scrolled DOWN"
        Else
            shell.SendKeys "{PAGEUP}"
            LogAction "Scrolled UP"
        End If
    Loop
End Sub

Sub SpacebarMode()
    Do
        interval = Int(Rnd * 2000 + 1000)
        WScript.Sleep interval
        
        shell.SendKeys " "
        LogAction "Pressed SPACEBAR"
    Loop
End Sub

Sub ArrowKeyMode()
    Do
        interval = Int(Rnd * 2000 + 1000)
        WScript.Sleep interval
        
        Dim direction
        direction = Int(Rnd * 4)
        
        Select Case direction
            Case 0
                shell.SendKeys "{UP}"
                LogAction "Arrow UP"
            Case 1
                shell.SendKeys "{DOWN}"
                LogAction "Arrow DOWN"
            Case 2
                shell.SendKeys "{LEFT}"
                LogAction "Arrow LEFT"
            Case Else
                shell.SendKeys "{RIGHT}"
                LogAction "Arrow RIGHT"
        End Select
    Loop
End Sub

Sub LogAction(action)
    action_count = action_count + 1
    WScript.Echo FormatTime(Now()) & "        " & action & " (" & action_count & ")"
End Sub

Function FormatTime(timeValue)
    Dim hours, minutes, seconds
    hours = Hour(timeValue)
    minutes = Minute(timeValue)
    seconds = Second(timeValue)
    
    If hours < 10 Then hours = "0" & hours
    If minutes < 10 Then minutes = "0" & minutes
    If seconds < 10 Then seconds = "0" & seconds
    
    FormatTime = hours & ":" & minutes & ":" & seconds
End Function
