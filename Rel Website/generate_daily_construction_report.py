import pandas as pd
from datetime import datetime, timedelta
import os

# Define the full period from 2/12/26 (Thursday) to 5/07/26 (Thursday)
start_date = datetime(2026, 2, 12)
end_date = datetime(2026, 5, 7)

# Philippine Holidays 2026 (Common + Specific for Amkor/NCR)
# Feb 25: People Power Anniversary
# Apr 2: Maundy Thursday
# Apr 3: Good Friday
# Apr 9: Araw ng Kagitingan
# May 1: Labor Day
ph_holidays = [
    "2026-02-25", # People Power Anniversary
    "2026-04-02", # Maundy Thursday
    "2026-04-03", # Good Friday
    "2026-04-09", # Araw ng Kagitingan
    "2026-05-01", # Labor Day
]

# Knowledge-based activity mapping (Day-by-day estimate based on project phases)
daily_activities = {
    # Phase 1: Foundation (Late Feb)
    "2026-02-12": ["Project Initialization", "Initial repository setup & folder structure"],
    "2026-02-13": ["Backend Skeleton", "Python API handlers & server.py setup"],
    "2026-02-16": ["Database Schema", "SQLite / aiosqlite integration for RR numbers"],
    "2026-02-17": ["Authentication Layer", "JWT token generation & login logic"],
    "2026-02-18": ["User Management", "User role definition & permissions setup"],
    "2026-02-19": ["Frontend Scaffolding", "Vite + React 18 installation & Tailwind setup"],
    "2026-02-20": ["Project Launcher", "Initial RELDMS_Launcher.bat creation"],
    "2026-02-23": ["API Test Suite", "Development of tests/comprehensive_test.py"],
    "2026-02-24": ["Request Creation UI", "Initial RequestNew components developed"],
    "2026-02-25": ["Dashboard Layout", "Sidebar & Layout scaffolding"],
    "2026-02-26": ["State Management", "Implementation of AuthContext and ThemeContext"],
    "2026-02-27": ["API Integration", "Axios setup and api.js utility creation"],
    
    # March: Deployment & UI Polish
    "2026-03-02": ["Form Validation", "Zod/Manual validation for request forms"],
    "2026-03-03": ["Search & Filter", "RequestFilter.jsx implementation"],
    "2026-03-04": ["Detailed View", "RequestDetail.jsx and status tracking UI"],
    "2026-03-05": ["Navigation Flow", "Framer Motion PageTransitions"],
    "2026-03-06": ["Error Boundaries", "ErrorBoundary.jsx implementation for UI stability"],
    "2026-03-09": ["Asset Management", "Icons & Lucide integration fix"],
    "2026-03-10": ["Dynamic Styling", "Theme toggle (Light/Dark) support"],
    "2026-03-11": ["Template Support", "Jinja2 server-side template compatibility"],
    "2026-03-12": ["Performance Audit", "Frontend bundle optimization (Vite)"],
    "2026-03-13": ["Security Headers", "CORS & Security policy in server.py"],
    "2026-03-16": ["Static Assets", "Logo & Amkor branding implementation"],
    "2026-03-17": ["Mobile Optimization", "Mobile-first CSS adjustments for Tailwind"],
    "2026-03-18": ["Data Formatting", "Date formatting utilities (date-fns)"],
    "2026-03-19": ["Notification System", "Toast notification implementation"],
    "2026-03-20": ["Modal Components", "Reusable modal system development"],
    "2026-03-23": ["Datetime TZ Fix", "Fixing ISOString shifts in date fields"],
    "2026-03-24": ["Report Engine", "Initial generate_reports.py structure"],
    "2026-03-25": ["Word Generation", "Docx template support in backend"],
    "2026-03-26": ["Excel Generation", "Openpyxl integration for reports"],
    "2026-03-27": ["Batch Processing", "RR number migration scripts (migrate_rr_numbers.py)"],
    "2026-03-30": ["Linux Compatibility", "Render.yaml and build.sh development"],
    "2026-03-31": ["Render Deployment", "Port binding and Linux line ending fixes"],

    # April: Automation & Specialized Monitoring
    "2026-04-01": ["RELMON Launch", "Bulk device type viewer (REL Masterlist)"],
    "2026-04-02": ["Device Tables", "Searchable device selection modal"],
    "2026-04-03": ["Test Level Detection", "Auto-test level inference from device strings"],
    "2026-04-06": ["Custom Sheets", "ATP1/ATP3 specific device sheet logic"],
    "2026-04-07": ["Data Persistence", "JSON backup system (game_scores.json fallback)"],
    "2026-04-08": ["Audit Logs", "Tracking user actions in request detail"],
    "2026-04-09": ["Status Timeline", "ProcessTimeline.jsx visualizer"],
    "2026-04-10": ["Process Monitoring", "Centralized status dashboard implementation"],
    "2026-04-13": ["Import Whisker", "ImportWhiskerModal.jsx development"],
    "2026-04-14": ["Agile RSS Import", "Multi-sheet Excel scanning logic"],
    "2026-04-15": ["Excel Mapping", "Automatic Precon -> MRT level mapping"],
    "2026-04-16": ["Duplicate Detection", "Agile import collision resolution"],
    "2026-04-17": ["Path Resolution", "Fixed dynamic script pathing for server.py"],
    "2026-04-20": ["Task Management", "Task manager view for technicians"],
    "2026-04-21": ["Completed Views", "Filtered completed requests archive"],
    "2026-04-22": ["User Guides", "Embedded UserGuide.jsx interactive help"],
    "2026-04-23": ["Profile Settings", "User settings and password hash updates"],
    "2026-04-24": ["Analytics Tool", "Recharts integration for retention monitor"],
    "2026-04-27": ["Retention Tracking", "Extended retention logic for sample aging"],
    "2026-04-28": ["Backup Viewer", "REST API for viewing Auto_Backups"],
    "2026-04-29": ["File Controls", "SatDataFileControl.jsx implementation"],
    "2026-04-30": ["LTC Logic", "Confirmed by/SN fields & 24hr timing auto-nav"],

    # May: Technician Focus & Final Completion
    "2026-05-01": ["Tray Propagation", "Syncing tray numbers across leg steps"],
    "2026-05-04": ["Masterlist UI", "Polishing the view-all status monitor"],
    "2026-05-05": ["PDF Exports", "Print-to-PDF styles for request forms"],
    "2026-05-06": ["SAT Workbench", "Dedicated queue for Scanning Acoustic Tomography"],
    "2026-05-07": ["Final Polish", "Performance optimization and stale data clearing"]
}

# Distribute generic activities for empty weekdays (placeholder)
generic_tasks = [
    ["Bug Fixes", "General maintenance and UI edge case fixes"],
    ["Documentation", "Updating code comments and README.md"],
    ["Unit Testing", "Increasing coverage for process step handlers"],
    ["Code Review", "Refactoring legacy template code to React"],
]

def get_activity_for_date(d_str, weekday):
    if d_str in daily_activities:
        return daily_activities[d_str]
    # Return a generic task if not specifically mapped
    return generic_tasks[weekday % len(generic_tasks)]

report_data = []
curr = start_date
activity_counter = 1

while curr <= end_date:
    date_str = curr.strftime('%Y-%m-%d')
    if curr.weekday() < 5 and date_str not in ph_holidays:  # Mon-Fri and NOT a holiday
        act_info = get_activity_for_date(date_str, curr.weekday())
        
        # Structure the row
        title = act_info[0]
        desc = act_info[1]
        
        # Auto-generate context based on project goals
        background = f"Requirement for {title} identified in project roadmap."
        objective = f"Implement and validate {title} functionality."
        status = "Completed"
        learnings = f"Successful integration of {title} improved system reliability/UX."
        
        # Specific override for known major milestones
        if "Deployment" in title:
            background = "Move from local development to scalable infrastructure."
            learnings = "Environment variables and port binding are critical for cloud providers."
        elif "SAT" in title:
            background = "Request for specialized technician workflow."
            learnings = "Separate API endpoints for guest tools simplifies access control."
        elif "Timing" in title:
            background = "Need for automated cycle time tracking."
            learnings = "Automated logic reduces human error in log-out timestamps."

        report_data.append({
            "Activity No.": activity_counter,
            "Date": date_str,
            "Activity Title": title,
            "Background": background,
            "Objective": objective,
            "Status": status,
            "Learnings": learnings
        })
        activity_counter += 1
    curr += timedelta(days=1)

# Create DataFrame and Export
df = pd.DataFrame(report_data)
output_file = "Daily_Construction_Report_2026.xlsx"
df.to_excel(output_file, index=False)
print(f"Daily report generated: {output_file}")
