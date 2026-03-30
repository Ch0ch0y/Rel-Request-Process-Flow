#!/usr/bin/env python3
"""
Auto Clicker / Website Scroller
Prevents screen from appearing idle by performing automated clicks or scrolls
Run with: python auto_clicker.py [mode] [--quiet]
"""

import pyautogui
import time
import random
import sys
import keyboard
import os
from datetime import datetime

# Safety settings
pyautogui.FAILSAFE = True  # Move mouse to corner to abort

class AutoClicker:
    def __init__(self, mode='scroll', quiet=False):
        """
        Initialize the auto clicker
        Args:
            mode: 'click' or 'scroll'
            quiet: If True, minimal output
        """
        self.mode = mode
        self.quiet = quiet
        self.running = False
        self.action_count = 0
        
    def log(self, message):
        """Print message if not in quiet mode"""
        if not self.quiet:
            timestamp = datetime.now().strftime("%H:%M:%S")
            print(f"[{timestamp}] {message}")
    
    def perform_scroll(self):
        """Perform a scroll action"""
        try:
            scroll_direction = random.choice([1, -1])  # 1 = up, -1 = down
            scroll_amount = random.randint(3, 5)
            pyautogui.scroll(scroll_direction * scroll_amount)
            self.action_count += 1
            self.log(f"Scrolled {'up' if scroll_direction > 0 else 'down'} ({self.action_count} actions)")
        except Exception as e:
            self.log(f"Scroll failed: {e}")
    
    def perform_click(self):
        """Perform a single click at current mouse position"""
        try:
            pyautogui.click()
            self.action_count += 1
            self.log(f"Clicked at current position ({self.action_count} actions)")
        except Exception as e:
            self.log(f"Click failed: {e}")
    
    def perform_move(self):
        """Perform a small mouse movement to keep screen active"""
        try:
            x, y = pyautogui.position()
            # Move slightly and back
            offset = random.randint(1, 3)
            pyautogui.moveTo(x + offset, y + offset, duration=0.1)
            pyautogui.moveTo(x, y, duration=0.1)
            self.action_count += 1
            self.log(f"Moved mouse slightly ({self.action_count} actions)")
        except Exception as e:
            self.log(f"Move failed: {e}")
    
    def run(self):
        """Main loop for auto clicking"""
        self.running = True
        self.log(f"✓ Auto Clicker Started - Mode: {self.mode.upper()}")
        self.log("✓ Press ESC to stop, or move mouse to corner for safety failsafe")
        self.log("")
        
        try:
            while self.running:
                # Random interval between 1-3 seconds
                interval = random.uniform(1.0, 3.0)
                time.sleep(interval)
                
                # Check for ESC key press
                if keyboard.is_pressed('esc'):
                    self.log("\n✓ ESC pressed - Stopping...")
                    self.running = False
                    break
                
                # Perform action based on mode
                if self.mode == 'scroll':
                    self.perform_scroll()
                elif self.mode == 'click':
                    self.perform_click()
                elif self.mode == 'move':
                    self.perform_move()
                else:
                    # Mixed mode (random actions)
                    action = random.choice(['scroll', 'click', 'move'])
                    if action == 'scroll':
                        self.perform_scroll()
                    elif action == 'click':
                        self.perform_click()
                    else:
                        self.perform_move()
                        
        except KeyboardInterrupt:
            self.log("\n✓ Interrupted - Stopping...")
        finally:
            self.log(f"\n✓ Auto Clicker Stopped - Total actions: {self.action_count}")
    
    @staticmethod
    def show_help():
        """Display help information"""
        help_text = """
╔════════════════════════════════════════════════════════════╗
║          AUTO CLICKER / WEBSITE SCROLLER v1.0             ║
╚════════════════════════════════════════════════════════════╝

USAGE:
  python auto_clicker.py [MODE] [OPTIONS]

MODES:
  scroll    - Scroll the page up/down (default)
  click     - Click at current mouse position
  move      - Move mouse slightly to keep screen active
  mixed     - Random selection of above actions

OPTIONS:
  --quiet   - Minimal output
  --help    - Show this help message

EXAMPLES:
  python auto_clicker.py                 # Scroll mode
  python auto_clicker.py click --quiet   # Click mode, quiet
  python auto_clicker.py mixed           # Mixed mode

CONTROLS:
  • Press ESC to stop the auto clicker
  • Move mouse to screen corner (failsafe) to abort

INTERVAL:
  • Actions occur randomly between 1-3 seconds

SAFETY:
  • Keep your mouse available for emergency stop
  • Ensure no important dialogs require user input
  • Test with --quiet mode to minimize distractions
"""
        print(help_text)


def main():
    """Main entry point"""
    mode = 'scroll'  # Default mode
    quiet = False
    
    # Parse command line arguments
    if len(sys.argv) > 1:
        for arg in sys.argv[1:]:
            if arg.lower() in ['scroll', 'click', 'move', 'mixed']:
                mode = arg.lower()
            elif arg == '--quiet':
                quiet = True
            elif arg in ['--help', '-h', '?']:
                AutoClicker.show_help()
                return
    
    # Create and run auto clicker
    clicker = AutoClicker(mode=mode, quiet=quiet)
    clicker.run()


if __name__ == "__main__":
    main()
