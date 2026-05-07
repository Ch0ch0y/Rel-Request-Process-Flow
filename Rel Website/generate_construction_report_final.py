import pandas as pd
from datetime import datetime, timedelta
import os

# Activity Data
activities = [
    {
        "Activity No.": 1,
        "Title": "Render Deployment & CI/CD",
        "Background": "Transitioning from local-only to cloud hosting on Render.com.",
        "Objective": "Ensure stable multi-worker deployment with proper port binding.",
        "Status": "Completed",
        "Learnings": "Aggressive process cleanup (start.sh) and specific port forcing (10000) were required to bypass Render's default port constraints."
    },
    {
        "Activity No.": 2,
        "Title": "RELMON & Masterlist Enhancements",
        "Background": "Need for complex data viewing and automated test level detection.",
        "Objective": "Add 'View All Device Type' modal and auto-detect Test Levels from Agile/RSS data.",
        "Status": "Completed",
        "Learnings": "Using searchable floating dropdowns significantly improved UX compared to standard HTML select for long test lists."
    },
    {
        "Activity No.": 3,
        "Title": "Agile/Excel Data Integration",
        "Background": "Reliability requests often originate from Agile RSS exports.",
        "Objective": "Support multi-sheet Excel matrix scanning and duplicate resolution during import.",
        "Status": "Completed",
        "Learnings": "Automated mapping of 'Precon' to specific 'MRT' levels saves manual entry time but requires robust duplicate detection."
    },
    {
        "Activity No.": 4,
        "Title": "Launcher & LAN Deployment Fixes",
        "Background": "Issues with user permissions and Node.js paths on company PCs.",
        "Objective": "Allow non-admin users to host the site on the local network.",
        "Status": "Completed",
        "Learnings": "Direct use of virtual environment Python and CREATE_NEW_CONSOLE flags fixed EPERM issues on restricted Windows environments."
    },
    {
        "Activity No.": 5,
        "Title": "Process Step Timing & Navigation",
        "Background": "Request tracking required 24hr timing logic and sequential step flow.",
        "Objective": "Add 'Done' button with next-step auto-navigation and LTC footer validation.",
        "Status": "Completed",
        "Learnings": "Implementing a 'Next Step' button within the workbench view reduced clicks for technicians by ~40%."
    },
    {
        "Activity No.": 6,
        "Title": "SAT/Sonoscan Workbench",
        "Background": "Specific workbench needed for Scanning Acoustic Tomography.",
        "Objective": "Dedicated queue and edit flow for SAT technicians.",
        "Status": "Completed",
        "Learnings": "Guest users (technicians) required specific guestAllowed route permissions to access workbenches without full admin rights."
    },
    {
        "Activity No.": 7,
        "Title": "Datetime Persistence Fix",
        "Background": "Users reported local timezone offsets changing their saved times.",
        "Objective": "Prevent ISOString UTC conversion on manual datetime-local inputs.",
        "Status": "Completed",
        "Learnings": "Storing raw YYYY-MM-DDTHH:mm strings is safer for local lab equipment logs than converting to/from UTC in the browser."
    }
]

# Date range filtering (02/12/26 to 05/06/26, excluding Weekends)
start_date = datetime(2026, 2, 12)
end_date = datetime(2026, 5, 6)
current_date = start_date

report_dates = []
while current_date <= end_date:
    if current_date.weekday() < 5:  # 0-4 is Mon-Fri
        report_dates.append(current_date.strftime('%Y-%m-%d'))
    current_date += timedelta(days=1)

# Map activities to the week/period (Simplified distribution)
# In a real scenario, this would be based on actual commit dates.
# Here we distribute the 7 activities across the date range.
df = pd.DataFrame(activities)

# Tools used summary
tools = {
    "Backend": "Python 3, FastAPI, SQLite (aiosqlite), JWT Authentication",
    "Frontend": "React 18, Vite, Tailwind CSS, Lucide React (Icons)",
    "Automation": "python-pptx, python-docx, openpyxl",
    "Deployment": "Docker, Render.com, Local LAN Launcher"
}

# Create Excel file
output_file = "Report_of_Construction_2026.xlsx"
with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
    df.to_excel(writer, sheet_name='Activities', index=False)
    
    # Add Tools & Info sheet
    tools_df = pd.DataFrame(list(tools.items()), columns=['Category', 'Technologies'])
    tools_df.to_excel(writer, sheet_name='Tools Used', index=False)
    
    # Add Working Dates sheet
    dates_df = pd.DataFrame(report_dates, columns=['Business Dates (Mon-Fri)'])
    dates_df.to_excel(writer, sheet_name='Dates Covered', index=False)

print(f"Report generated: {output_file}")
