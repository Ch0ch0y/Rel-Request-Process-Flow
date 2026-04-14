"""Call the actual server _generate_ltc_excel to verify F8."""
import sys, io, zipfile, re, json, sqlite3
from pathlib import Path
from datetime import datetime, timezone

sys.path.insert(0, str(Path('Rel Website/backend')))

# Get request data
conn = sqlite3.connect('Rel Website/backend/rel_database.db')
conn.row_factory = sqlite3.Row
cur = conn.execute("SELECT * FROM requests WHERE request_number = ?", ("RR00143406",))
row = cur.fetchone()
cols = [desc[0] for desc in cur.description]
req = dict(zip(cols, row))
req['automotive'] = bool(req.get('automotive'))
req['created_at'] = datetime.fromisoformat(req['created_at']) if req.get('created_at') else datetime.now(timezone.utc)
req['updated_at'] = datetime.fromisoformat(req['updated_at']) if req.get('updated_at') else datetime.now(timezone.utc)

step_cur = conn.execute(
    "SELECT id, step_number, step_name, leg, status, started_at, completed_at, machine_no, rack_no, operator_id, "
    "tray_no, qty_in, qty_out, notes, attachments, custom_fields FROM process_steps "
    "WHERE request_id = ? ORDER BY leg, step_number", (req['id'],)
)
steps = []
for s in step_cur.fetchall():
    steps.append({
        'id': s[0], 'step_number': s[1], 'step_name': s[2], 'leg': s[3],
        'status': s[4], 'started_at': s[5], 'completed_at': s[6],
        'machine_no': s[7], 'rack_no': s[8], 'operator_id': s[9], 'tray_no': s[10],
        'qty_in': s[11], 'qty_out': s[12], 'notes': s[13],
        'attachments': json.loads(s[14]) if s[14] else [],
        'custom_fields': json.loads(s[15]) if s[15] else {},
    })
req['steps'] = steps
conn.close()

# Import and call the actual function
from server import _generate_ltc_excel

print(f"Calling _generate_ltc_excel for {req['request_number']} (original_rr={req.get('original_rr_number')})")
excel_bytes = _generate_ltc_excel(req)

# Verify
with zipfile.ZipFile(io.BytesIO(excel_bytes)) as z:
    sheet_xml = z.read('xl/worksheets/sheet1.xml').decode()
    f8 = re.search(r'<c r="F8"[^/]*(?:/>|>.*?</c>)', sheet_xml, re.DOTALL)
    d8 = re.search(r'<c r="D8"[^/]*(?:/>|>.*?</c>)', sheet_xml, re.DOTALL)
    print(f"D8: {d8.group(0) if d8 else 'NOT FOUND'}")
    print(f"F8: {f8.group(0) if f8 else 'NOT FOUND'}")
    
    if 'xl/sharedStrings.xml' in z.namelist():
        ss = z.read('xl/sharedStrings.xml').decode()
        if 'RRS# 220260256' in ss:
            print("WARNING: Old 'RRS# 220260256' in sharedStrings")
        if 'REL202600001' in ss:
            print("OK: REL202600001 in sharedStrings")

# Save  
Path('test_ltc_server_output.xlsx').write_bytes(excel_bytes)
print(f"Saved: test_ltc_server_output.xlsx ({len(excel_bytes)} bytes)")
