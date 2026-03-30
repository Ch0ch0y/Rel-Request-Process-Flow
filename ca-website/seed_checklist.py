"""Seed ca_checklist_items for all existing CA requests that have none."""
import sqlite3

DB = r'C:\Users\168056\OneDrive - Amkor Technology\Documents\GitHub\Rel Request Process Flow\ca-website\backend\ca_database.db'

CHECKLIST_TEMPLATE = [
    {"step": "External Visual Inspection", "items": [
        {"name": "top including marking", "requirements": "Check for mold/leadframe discoloration, mold flash, pealing or any anomaly to be heads up to Rel Engr.", "qty": "", "remarks": ""},
        {"name": "bottom", "requirements": "", "qty": "", "remarks": ""},
        {"name": "top leads", "requirements": "", "qty": "", "remarks": ""},
        {"name": "bottom leads", "requirements": "", "qty": "", "remarks": ""},
        {"name": "side leads", "requirements": "Scribe on Epad side for traceability", "qty": "", "remarks": ""},
    ]},
    {"step": "X-ray Inspection", "items": [
        {"name": "mold", "requirements": "Check for insufficient die attach coverage or any wire anomaly to be heads up to Rel Engr. Unit mark Traceability", "qty": "", "remarks": ""},
        {"name": "die attach", "requirements": "", "qty": "", "remarks": ""},
        {"name": "wires", "requirements": "", "qty": "", "remarks": ""},
    ]},
    {"step": "SAT Inspection", "items": [
        {"name": "thru-scan", "requirements": "Any unit with abnormality/void more than 300um measurement must NOT BE DESTRUCTED and to be heads up to Rel Engr.", "qty": "", "remarks": ""},
        {"name": "die top", "requirements": "", "qty": "", "remarks": ""},
        {"name": "paddle top", "requirements": "Unit mark as traceability; color map 24 and map 1 for 3-scan; 4 units maximum per Scan with nail polish", "qty": "", "remarks": ""},
        {"name": "paddle bottom", "requirements": "", "qty": "-", "remarks": ""},
        {"name": "leadframe", "requirements": "", "qty": "", "remarks": ""},
        {"name": "others: Void Measurement", "requirements": "", "qty": "", "remarks": "MAX VOID ONLY IF ANY"},
    ]},
    {"step": "Chemical Decapsulation", "items": [
        {"name": "", "requirements": "", "qty": "", "remarks": ""},
    ]},
    {"step": "Optical Inspection", "items": [
        {"name": "unit profile", "requirements": "Unit Traceability and magnification per image", "qty": "", "remarks": ""},
        {"name": "die surface", "requirements": "", "qty": "", "remarks": ""},
        {"name": "die metallization", "requirements": "", "qty": "", "remarks": ""},
        {"name": "Ball Shear Breakmode", "requirements": "", "qty": "", "remarks": ""},
        {"name": "others: Invalidated reading", "requirements": "", "qty": "", "remarks": ""},
    ]},
    {"step": "Laser & Plasma Decapsulation", "items": [
        {"name": "", "requirements": "", "qty": "", "remarks": ""},
    ]},
    {"step": "Wire Pull Test", "items": [
        {"name": "all bonds", "requirements": "Spec Limit: 6 gF", "qty": "", "remarks": ""},
        {"name": "others:", "requirements": "", "qty": "", "remarks": ""},
    ]},
    {"step": "Ball Shear Test", "items": [
        {"name": "all bonds", "requirements": "Spec Limit: 17 gF", "qty": "", "remarks": ""},
        {"name": "others:", "requirements": "", "qty": "", "remarks": ""},
    ]},
    {"step": "Stitch Pull Test", "items": [
        {"name": "all bonds", "requirements": "Spec Limit: 4 gF", "qty": "-", "remarks": ""},
        {"name": "others:", "requirements": "", "qty": "", "remarks": ""},
    ]},
    {"step": "SEM Inspection", "items": [
        {"name": "unit profile", "requirements": "Unit & Pad Traceability", "qty": "", "remarks": ""},
        {"name": "loop formation (Corner Photo)", "requirements": "SEM Image per Abnormality", "qty": "", "remarks": ""},
        {"name": "ball/bond formation/placement", "requirements": "Highest and lowest reading Breakmode SEM Image", "qty": "", "remarks": ""},
        {"name": "stitchbond formation", "requirements": "", "qty": "", "remarks": ""},
        {"name": "wpt break mode", "requirements": "", "qty": "", "remarks": ""},
        {"name": "bst break mode", "requirements": "", "qty": "", "remarks": ""},
        {"name": "spt break mode", "requirements": "", "qty": "", "remarks": ""},
        {"name": "others: Defects", "requirements": "", "qty": "", "remarks": "stitch shear (RSSB) die side"},
    ]},
    {"step": "Manual Cross-Section (SEM)", "items": [
        {"name": "Actual Cross Section", "requirements": "obvious & suspected hairline Gap", "qty": "", "remarks": ""},
        {"name": "Ball Diameter", "requirements": "", "qty": "", "remarks": ""},
        {"name": "Ball Height", "requirements": "", "qty": "", "remarks": ""},
        {"name": "Ball Bond Gap Measurement", "requirements": "", "qty": "", "remarks": ""},
        {"name": "Wedge Formation Inspection", "requirements": "", "qty": "", "remarks": ""},
        {"name": "Wedge Thickness", "requirements": "", "qty": "", "remarks": ""},
        {"name": "others:", "requirements": "", "qty": "", "remarks": ""},
    ]},
    {"step": "Ion Mill", "items": [
        {"name": "Decoration", "requirements": "", "qty": "", "remarks": ""},
    ]},
]

db = sqlite3.connect(DB)

# Create table if it doesn't exist yet
db.execute("""
    CREATE TABLE IF NOT EXISTS ca_checklist_items (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        request_id   INTEGER NOT NULL,
        step_name    TEXT NOT NULL,
        sort_order   INTEGER NOT NULL DEFAULT 0,
        item_name    TEXT DEFAULT '',
        requirements TEXT DEFAULT '',
        time_in      TEXT DEFAULT '',
        time_out     TEXT DEFAULT '',
        technician   TEXT DEFAULT '',
        qty          TEXT DEFAULT '',
        remarks      TEXT DEFAULT '',
        FOREIGN KEY (request_id) REFERENCES ca_requests(id) ON DELETE CASCADE
    )
""")
cur = db.execute('SELECT id, ca_number FROM ca_requests ORDER BY id')
requests = cur.fetchall()

for req_id, ca_num in requests:
    existing = db.execute('SELECT COUNT(*) FROM ca_checklist_items WHERE request_id=?', (req_id,)).fetchone()[0]
    if existing > 0:
        print(f'Skipped {ca_num} (already has {existing} items)')
        continue
    sort = 0
    for tpl in CHECKLIST_TEMPLATE:
        for item in tpl['items']:
            sort += 1
            db.execute(
                'INSERT INTO ca_checklist_items (request_id,step_name,sort_order,item_name,requirements,qty,remarks) VALUES (?,?,?,?,?,?,?)',
                (req_id, tpl['step'], sort, item['name'], item['requirements'], item['qty'], item['remarks'])
            )
    print(f'Seeded {sort} checklist items for {ca_num} (id={req_id})')

db.commit()
db.close()
print('Done.')
