"""Test LTC download output - check what's actually in F8."""
import requests
import io
import zipfile
import re

# Get a token first
login_resp = requests.post("http://localhost:8000/api/auth/login", json={
    "email": "Choy@amkor.com",
    "password": "Adminn"
})
if login_resp.status_code != 200:
    # Try common credentials
    login_resp = requests.post("http://localhost:8000/api/auth/login", json={
        "email": "admin@admin.com", 
        "password": "admin"
    })

if login_resp.status_code == 200:
    token = login_resp.json().get("access_token")
    print(f"Logged in, token: {token[:20]}...")
else:
    print(f"Login failed: {login_resp.status_code} {login_resp.text}")
    # Try without auth
    token = None

# Find the request ID for RR00143406
headers = {"Authorization": f"Bearer {token}"} if token else {}
req_resp = requests.get("http://localhost:8000/api/requests", headers=headers)
if req_resp.status_code == 200:
    data = req_resp.json()
    reqs = data if isinstance(data, list) else data.get("requests", data.get("items", []))
    target = None
    for r in reqs:
        if r.get("request_number") == "RR00143406":
            target = r
            break
    if target:
        req_id = target["id"]
        print(f"Found request: id={req_id}, request_number={target['request_number']}, original_rr_number={target.get('original_rr_number')}")
        
        # Download LTC
        ltc_resp = requests.get(f"http://localhost:8000/api/requests/{req_id}/ltc", headers=headers)
        print(f"LTC response: {ltc_resp.status_code}")
        if ltc_resp.status_code == 200:
            # Parse the Excel
            data = ltc_resp.content
            with zipfile.ZipFile(io.BytesIO(data)) as z:
                sheet_xml = z.read('xl/worksheets/sheet1.xml').decode()
                
                # Find F8 cell
                f8 = re.search(r'<c r="F8"[^/]*(?:/>|>.*?</c>)', sheet_xml, re.DOTALL)
                d8 = re.search(r'<c r="D8"[^/]*(?:/>|>.*?</c>)', sheet_xml, re.DOTALL)
                print(f"D8 XML: {d8.group(0) if d8 else 'NOT FOUND'}")
                print(f"F8 XML: {f8.group(0) if f8 else 'NOT FOUND'}")
                
                # Check sharedStrings
                if 'xl/sharedStrings.xml' in z.namelist():
                    ss = z.read('xl/sharedStrings.xml').decode()
                    if 'REL202600001' in ss:
                        print("REL202600001 found in sharedStrings.xml")
                    if 'RRS# 220260256' in ss:
                        print("WARNING: Old 'RRS# 220260256' still in sharedStrings.xml")
                    if 'RR00143406' in ss:
                        print("RR00143406 found in sharedStrings.xml")
        else:
            print(f"LTC error: {ltc_resp.text[:200]}")
    else:
        print("RR00143406 not found. Available:")
        for r in reqs[:5]:
            print(f"  {r.get('request_number')} / {r.get('original_rr_number')}")
else:
    print(f"Request list failed: {req_resp.status_code}")
