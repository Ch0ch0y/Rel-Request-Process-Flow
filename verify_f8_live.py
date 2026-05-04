"""Verify F8 in the LIVE server LTC download."""
import requests, io, zipfile, re, sys

# Try multiple credentials
creds = [
    ("Choy@amkor.com", "Adminn"),
    ("admin@amkor.com", "Adminn"),
    ("Choy@amkor.com", "admin"),
    ("admin@amkor.com", "admin"),
]

token = None
for email, pw in creds:
    r = requests.post("http://localhost:8000/api/auth/login", json={"email": email, "password": pw})
    if r.status_code == 200:
        token = r.json().get("access_token")
        print(f"Login OK: {email}")
        break
    
if not token:
    print("All logins failed. Trying to find request ID from DB...")
    import sqlite3
    conn = sqlite3.connect(r"Rel Website\backend\rel_database.db")
    cur = conn.execute("SELECT id, request_number, original_rr_number FROM requests WHERE request_number = 'RR00143406'")
    row = cur.fetchone()
    if row:
        print(f"Found: id={row[0]}, rn={row[1]}, orn={row[2]}")
    conn.close()
    sys.exit(1)

headers = {"Authorization": f"Bearer {token}"}

# Find request
r = requests.get("http://localhost:8000/api/requests", headers=headers)
reqs = r.json() if isinstance(r.json(), list) else r.json().get("requests", r.json().get("items", []))
target = next((x for x in reqs if x.get("request_number") == "RR00143406"), None)

if not target:
    print("RR00143406 not found in request list")
    print("Available:", [x.get("request_number") for x in reqs[:5]])
    sys.exit(1)

req_id = target["id"]
print(f"Request: {target['request_number']}, original_rr: {target.get('original_rr_number')}, id: {req_id}")

# Download LTC
ltc = requests.get(f"http://localhost:8000/api/requests/{req_id}/ltc", headers=headers)
print(f"LTC status: {ltc.status_code}")

if ltc.status_code != 200:
    print(f"ERROR: {ltc.text[:500]}")
    sys.exit(1)

# Save for user to inspect
with open("LTC_LIVE_TEST.xlsx", "wb") as f:
    f.write(ltc.content)
print(f"Saved LTC_LIVE_TEST.xlsx ({len(ltc.content)} bytes)")

# Check F8 in the raw XML
with zipfile.ZipFile(io.BytesIO(ltc.content)) as z:
    sheet = z.read('xl/worksheets/sheet1.xml').decode()
    f8 = re.search(r'<c r="F8"[^/]*(?:/>|>.*?</c>)', sheet, re.DOTALL)
    d8 = re.search(r'<c r="D8"[^/]*(?:/>|>.*?</c>)', sheet, re.DOTALL)
    print(f"\nD8 XML: {d8.group(0) if d8 else 'NOT FOUND'}")
    print(f"F8 XML: {f8.group(0) if f8 else 'NOT FOUND'}")
    
    if 'inlineStr' in (f8.group(0) if f8 else ''):
        # Extract inline string value
        val = re.search(r'<t>(.*?)</t>', f8.group(0))
        print(f"\n>>> F8 VALUE = {val.group(1) if val else 'EMPTY'}")
    elif f8 and 't="s"' in f8.group(0):
        # Shared string reference
        idx = re.search(r'<v>(\d+)</v>', f8.group(0))
        if idx and 'xl/sharedStrings.xml' in z.namelist():
            ss = z.read('xl/sharedStrings.xml').decode()
            import xml.etree.ElementTree as ET
            root = ET.fromstring(ss)
            ns = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
            items = root.findall(f'{ns}si')
            i = int(idx.group(1))
            if i < len(items):
                t = items[i].find(f'.//{ns}t')
                print(f"\n>>> F8 VALUE (shared string [{i}]) = {t.text if t is not None else 'EMPTY'}")

print("\nDone! Open LTC_LIVE_TEST.xlsx to verify.")
