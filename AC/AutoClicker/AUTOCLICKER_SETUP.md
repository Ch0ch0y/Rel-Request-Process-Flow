# Auto Clicker / Website Scroller Setup Guide

## Installation

### Prerequisites Required:
- Python 3.7 or higher installed on your system
- pip package manager

### Step 1: Install Required Libraries

Open Command Prompt or PowerShell in the workspace directory and run:

```bash
pip install pyautogui keyboard
```

Or use one of the provided batch files if available:

```bash
.\setup_auto_clicker.bat
```

## Usage

### Option 1: Using Batch File (Easiest)
Simply double-click:
```
start_auto_clicker.bat
```

This will prompt you to select a mode.

### Option 2: Command Line

```bash
# Default scroll mode
python auto_clicker.py

# Scroll mode (explicit)
python auto_clicker.py scroll

# Click mode
python auto_clicker.py click

# Move mouse mode
python auto_clicker.py move

# Mixed mode (random actions)
python auto_clicker.py mixed

# Quiet mode (minimal output)
python auto_clicker.py scroll --quiet
```

## Modes Explained

| Mode | Description | Best For |
|------|-------------|----------|
| **scroll** | Scrolls page up/down randomly | Websites, documents, feeds |
| **click** | Clicks at current mouse position | Generic activity |
| **move** | Makes small mouse movements | Keeping screen from locking |
| **mixed** | Random combination of all | Unpredictable activity |

## Controls

- **Press ESC** to stop the auto clicker gracefully
- **Move mouse to screen corner** to trigger failsafe abort

## Timing

- Actions occur at **random intervals between 1-3 seconds**
- Randomized intervals make activity appear more natural

## Safety Features

✓ Failsafe enabled (move mouse to corner to stop)
✓ ESC key binding for graceful stop
✓ Mouse position detection
✓ Error handling for failed actions

## Troubleshooting

### "ModuleNotFoundError: No module named 'pyautogui'"
**Solution:** Run `pip install pyautogui keyboard`

### "Administrator privileges required"
**Solution:** Run Command Prompt as Administrator before running the script

### Script doesn't respond to ESC key
**Solution:** Restart the application and ensure the CMD window is focused

### Mouse not moving (move mode)
**Solution:** Ensure no other application is controlling the mouse

## Important Notes

⚠️ Keep your mouse accessible for emergency stop
⚠️ Use responsibly and ensure no important dialogs require user input
⚠️ Test in --quiet mode to minimize visual distractions
⚠️ This prevents screen sleep/screensaver from activating

## Examples

### Keep website from appearing idle during presentation:
```bash
python auto_clicker.py scroll
```

### Prevent computer from locking while afk but not scrolling content:
```bash
python auto_clicker.py move
```

### Random, unpredictable activity:
```bash
python auto_clicker.py mixed --quiet
```
