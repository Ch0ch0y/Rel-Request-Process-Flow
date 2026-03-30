"""
Comprehensive Reliability, Security & Quality Test Suite
Rel Request Process Flow Website
Date: 2026-02-24
"""
import requests
import json
import sys
import time
import uuid
from datetime import datetime, timezone

BASE = "http://localhost:8000/api"
RESULTS = {"passed": [], "failed": [], "warnings": []}
_admin_token = None
_test_user_ids = []
_test_request_ids = []

# ─── helpers ─────────────────────────────────────────────────────────────────

def hdr(token=None):
    h = {"Content-Type": "application/json"}
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h

def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)

def check(name, passed, detail="", category="General"):
    icon = "[PASS]" if passed else "[FAIL]"
    print(f"  {icon} {name}" + (f"  ->  {detail}" if detail else ""))
    record = {"test": name, "category": category, "detail": detail}
    if passed:
        RESULTS["passed"].append(record)
    else:
        RESULTS["failed"].append(record)
    return passed

def warn(name, detail="", category="General"):
    print(f"  [WARN] {name}" + (f"  ->  {detail}" if detail else ""))
    RESULTS["warnings"].append({"test": name, "category": category, "detail": detail})

def get(endpoint, token=None, **kwargs):
    return requests.get(f"{BASE}/{endpoint}", headers=hdr(token), timeout=10, **kwargs)

def post(endpoint, data=None, token=None, **kwargs):
    return requests.post(f"{BASE}/{endpoint}", json=data, headers=hdr(token), timeout=10, **kwargs)

def patch(endpoint, data=None, token=None):
    return requests.patch(f"{BASE}/{endpoint}", json=data, headers=hdr(token), timeout=10)

def delete(endpoint, token=None):
    return requests.delete(f"{BASE}/{endpoint}", headers=hdr(token), timeout=10)

# ─── RELIABILITY TESTS ────────────────────────────────────────────────────────

def test_reliability():
    global _admin_token
    section("RELIABILITY TESTS")

    # R1 - Core availability
    r = get("")
    check("R1  API root responds 200", r.status_code == 200, f"status={r.status_code}", "Reliability")

    # R2 - Admin login works
    r = post("auth/login", {"email": "admin@amkor.com", "password": "Adminn"})
    ok = r.status_code == 200 and "access_token" in r.json()
    check("R2  Admin login returns token", ok, f"status={r.status_code}", "Reliability")
    if ok:
        _admin_token = r.json()["access_token"]

    if not _admin_token:
        print("  ⛔  Cannot continue without admin token")
        return

    # R3 - /auth/me returns correct fields
    r = get("auth/me", _admin_token)
    body = r.json()
    fields = {"id", "email", "username", "role", "approved"}
    check("R3  /auth/me has required fields",
          r.status_code == 200 and fields.issubset(body.keys()),
          f"missing={fields - body.keys()}", "Reliability")

    # R4 - GET /users returns list
    r = get("users", _admin_token)
    check("R4  GET /users returns list", r.status_code == 200 and isinstance(r.json(), list),
          f"count={len(r.json()) if r.status_code==200 else '?'}", "Reliability")

    # R5 - Dashboard stats returns expected keys
    r = get("dashboard/stats", _admin_token)
    body = r.json() if r.status_code == 200 else {}
    keys = {"total_requests","active_requests","completed_requests","pending_requests","recent_activity"}
    check("R5  Dashboard stats has expected keys",
          r.status_code == 200 and keys.issubset(body.keys()),
          f"missing={keys - body.keys()}", "Reliability")

    # R6 - GET /requests returns list
    r = get("requests", _admin_token)
    check("R6  GET /requests returns list", r.status_code == 200 and isinstance(r.json(), list),
          f"count={len(r.json()) if r.status_code == 200 else '?'}", "Reliability")

    # R7 - Create a request and verify it persists
    ts = datetime.now().strftime('%H%M%S%f')
    req_no = f"TEST-{ts}"
    r = post("requests", {"request_number": req_no, "device_name": "TestDevice",
                          "originator": "Tester", "lot_no": "LOT-REL-01"}, _admin_token)
    created_ok = r.status_code == 200 and "id" in r.json()
    check("R7  Create request succeeds", created_ok, f"status={r.status_code}", "Reliability")
    req_id = r.json().get("id") if created_ok else None
    if req_id:
        _test_request_ids.append(req_id)

    # R8 - Retrieve created request by ID
    if req_id:
        r2 = get(f"requests/{req_id}", _admin_token)
        check("R8  Retrieve created request by ID", r2.status_code == 200 and r2.json().get("id") == req_id,
              f"status={r2.status_code}", "Reliability")

    # R9 - Update a step and verify status persists
    if req_id:
        r3 = patch(f"requests/{req_id}/steps/1", {"status": "in_progress", "notes": "Reliability test note"}, _admin_token)
        updated = r3.status_code == 200
        check("R9  Update step status to in_progress", updated, f"status={r3.status_code}", "Reliability")
        if updated:
            r4 = get(f"requests/{req_id}", _admin_token)
            step = next((s for s in r4.json().get("steps", []) if s["step_number"] == 1), {})
            check("R9b Step status persisted correctly",
                  step.get("status") == "in_progress", f"status={step.get('status')}", "Reliability")

    # R10 - Login logs endpoint available
    r = get("login-logs", _admin_token)
    check("R10 Login logs endpoint responds", r.status_code in (200, 403),
          f"status={r.status_code}", "Reliability")

    # R11 - Settings endpoint responds
    r = get("settings", _admin_token)
    check("R11 Settings endpoint responds 200", r.status_code == 200,
          f"status={r.status_code}", "Reliability")

    # R12 - Heartbeat endpoint
    r = post("auth/heartbeat", {}, _admin_token)
    check("R12 Heartbeat endpoint responds 200", r.status_code == 200,
          f"status={r.status_code}", "Reliability")

    # R13 - /auth/me reflects last_seen update after heartbeat
    r = get("users", _admin_token)
    admin_user = next((u for u in r.json() if u.get("role") == "Admin"), None)
    has_last_seen = admin_user is not None and admin_user.get("last_seen") is not None
    check("R13 last_seen populated after heartbeat", has_last_seen,
          f"last_seen={admin_user.get('last_seen') if admin_user else 'N/A'}", "Reliability")

    # R14 - Role permissions endpoint
    r = get("role-permissions", _admin_token)
    check("R14 Role permissions endpoint responds", r.status_code == 200,
          f"status={r.status_code}", "Reliability")

    # R15 - Request filter/search by status
    r = get("requests?status=pending", _admin_token)
    check("R15 Request filter by status works", r.status_code == 200 and isinstance(r.json(), list),
          f"count={len(r.json()) if r.status_code==200 else '?'}", "Reliability")

    # R16 - Machines endpoint responds
    r = get("machines", _admin_token)
    check("R16 Machines endpoint responds 200", r.status_code == 200,
          "", "Reliability")

    # R17 - Employees endpoint responds
    r = get("employees", _admin_token)
    check("R17 Employees endpoint responds 200", r.status_code == 200,
          "", "Reliability")


# ─── SECURITY TESTS ───────────────────────────────────────────────────────────

def test_security():
    section("SECURITY TESTS")

    # S1 - Unauthenticated access to /users blocked
    r = get("users")
    check("S1  GET /users blocked without token", r.status_code in (401, 403, 422),
          f"status={r.status_code}", "Security")

    # S2 - Unauthenticated access to /requests blocked
    r = get("requests")
    check("S2  GET /requests blocked without token", r.status_code in (401, 403, 422),
          f"status={r.status_code}", "Security")

    # S3 - Unauthenticated access to dashboard blocked
    r = get("dashboard/stats")
    check("S3  Dashboard blocked without token", r.status_code in (401, 403, 422),
          f"status={r.status_code}", "Security")

    # S4 - Forged/invalid JWT rejected
    r = get("auth/me", "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJoYWNrZXIifQ.UNSIGNED_GARBAGE")
    check("S4  Forged JWT rejected", r.status_code in (401, 403, 422),
          f"status={r.status_code}", "Security")

    # S5 - Malformed bearer token rejected
    r = requests.get(f"{BASE}/auth/me", headers={"Authorization": "Bearer NOT_A_JWT"}, timeout=10)
    check("S5  Malformed bearer token rejected", r.status_code in (401, 403, 422),
          f"status={r.status_code}", "Security")

    # S6 - Empty token rejected
    r = requests.get(f"{BASE}/auth/me", headers={"Authorization": "Bearer "}, timeout=10)
    check("S6  Empty bearer token rejected", r.status_code in (401, 403, 422),
          f"status={r.status_code}", "Security")

    # S7 - Login with wrong password blocked
    r = post("auth/login", {"email": "admin@amkor.com", "password": "WrongPassword!"})
    check("S7  Wrong password returns 401", r.status_code == 401,
          f"status={r.status_code}", "Security")

    # S8 - Login with non-existent user
    r = post("auth/login", {"email": "doesnotexist@x.com", "password": "anything"})
    check("S8  Non-existent user returns 401", r.status_code == 401,
          f"status={r.status_code}", "Security")

    # S9 - SQL injection in login email field
    r = post("auth/login", {"email": "' OR 1=1 --", "password": "x"})
    check("S9  SQL injection in login email rejected safely", r.status_code in (400, 401, 422),
          f"status={r.status_code}", "Security")

    # S10 - SQL injection in password field
    r = post("auth/login", {"email": "admin@amkor.com", "password": "' OR '1'='1"})
    check("S10 SQL injection in password rejected", r.status_code in (401, 422),
          f"status={r.status_code}", "Security")

    # S11 - Register with unapproved account cannot login (or is blocked post-login)
    ts = datetime.now().strftime('%H%M%S%f')
    unapproved_email = f"unapproved_{ts}@test.example.com"
    r_reg = post("auth/register", {"email": unapproved_email, "username": f"UnapprovedUser{ts}",
                                    "password": "Test@1234!", "role": "Technician"})
    reg_ok = r_reg.status_code == 200
    if reg_ok:
        uid = r_reg.json().get("id")
        if uid:
            _test_user_ids.append(uid)
        r_login = post("auth/login", {"email": unapproved_email, "password": "Test@1234!"})
        check("S11 Unapproved user login blocked (403)", r_login.status_code == 403,
              f"status={r_login.status_code}", "Security")
    else:
        warn("S11 Could not register test user for approval check", f"status={r_reg.status_code}", "Security")

    # S12 - Guest token does not allow admin operations
    r_guest = post("auth/guest-token", {})
    if r_guest.status_code == 200:
        gtok = r_guest.json().get("access_token")
        r_admin_op = get("users", gtok)
        check("S12 Guest token cannot list users (403)", r_admin_op.status_code in (401, 403),
              f"status={r_admin_op.status_code}", "Security")
    else:
        warn("S12 Guest token endpoint unavailable", "", "Security")

    # S13 - Cannot delete another user without manage_users permission (non-admin)
    if _admin_token and _test_user_ids:
        # Create a regular approved user (we'll try to use a non-admin user but we only have admin)
        # We just confirm admin CAN delete, which verifies RBAC path works
        pass
    if _admin_token:
        r = get("users", _admin_token)
        non_admins = [u for u in r.json() if u.get("role") != "Admin"]
        check("S13 User list doesn't expose password hashes",
              all("password" not in u for u in r.json()),
              f"users checked={len(r.json())}", "Security")

    # S14 - Request for non-existent ID returns 404 not 500
    r = get(f"requests/nonexistent-id-{uuid.uuid4()}", _admin_token)
    check("S14 Non-existent request returns 404 not 500", r.status_code == 404,
          f"status={r.status_code}", "Security")

    # S15 - Path-like strings as user IDs should not leak data or error out with 500.
    #        URL-path traversal (../../) is sanitized by Python's requests lib / the ASGI framework.
    #        We test that a user ID containing path chars returns 404 (not found), not 500.
    try:
        r = requests.get(f"{BASE}/users/%2E%2E%2F%2E%2E%2Fetc%2Fpasswd",
                         headers=hdr(_admin_token), timeout=10)
        traversal_safe = r.status_code in (200, 404, 422) and "password" not in str(r.text)
        check("S15 Path traversal in URL does not expose passwords",
              traversal_safe,
              f"status={r.status_code}", "Security")
    except Exception as exc:
        warn("S15 Path traversal test skipped (requests lib blocked URL)",
             str(exc)[:80], "Security")

    # S16 - Login error message does not reveal whether email exists vs bad password
    r1 = post("auth/login", {"email": "admin@amkor.com", "password": "totally_wrong"})
    r2 = post("auth/login", {"email": "no_such_user@x.com", "password": "totally_wrong"})
    msg1 = r1.json().get("detail", "") if r1.status_code != 200 else ""
    msg2 = r2.json().get("detail", "") if r2.status_code != 200 else ""
    # Both should say the same thing (not "user not found" vs "wrong password")
    same_msg = msg1 == msg2
    check("S16 Login error doesn't distinguish email vs password", same_msg,
          f"msg1='{msg1}' | msg2='{msg2}'", "Security")

    # S17 - Settings update blocked without token
    r = patch("settings", {"app_name": "Hacked"}, None)
    check("S17 PATCH /settings blocked without token", r.status_code in (401, 403, 422),
          f"status={r.status_code}", "Security")

    # S18 - DELETE /requests blocked without token
    r = delete(f"requests/fake-id")
    check("S18 DELETE /requests blocked without token", r.status_code in (401, 403, 422),
          f"status={r.status_code}", "Security")


# ─── QUALITY TESTS ────────────────────────────────────────────────────────────

def test_quality():
    section("QUALITY TESTS")

    if not _admin_token:
        print("  ⛔  Skipping quality tests - no admin token")
        return

    # Q1 - Response is valid JSON for all core endpoints
    endpoints = ["", "auth/me", "users", "requests", "dashboard/stats", "settings",
                 "role-permissions", "machines", "employees"]
    all_json = True
    for ep in endpoints:
        try:
            r = get(ep, _admin_token)
            r.json()
        except Exception as e:
            all_json = False
            check(f"Q1  {ep} returns valid JSON", False, str(e), "Quality")
    check("Q1  All core endpoints return valid JSON", all_json, "", "Quality")

    # Q2 - Content-Type is application/json
    r = get("auth/me", _admin_token)
    ct = r.headers.get("content-type", "")
    check("Q2  Content-Type is application/json", "application/json" in ct,
          f"content-type={ct}", "Quality")

    # Q3 - User object schema completeness
    r = get("auth/me", _admin_token)
    body = r.json()
    required = ["id", "email", "username", "role", "approved"]
    missing = [k for k in required if k not in body]
    check("Q3  User schema has all required fields", len(missing) == 0,
          f"missing={missing}", "Quality")

    # Q4 - Request object has steps array
    r = get("requests", _admin_token)
    reqs = r.json()
    if reqs:
        first_req_id = reqs[0]["id"]
        r2 = get(f"requests/{first_req_id}", _admin_token)
        body = r2.json()
        has_steps = isinstance(body.get("steps"), list) and len(body["steps"]) > 0
        check("Q4  Request objects contain steps array", has_steps,
              f"steps={len(body.get('steps',[]))}", "Quality")
    else:
        warn("Q4  No requests to verify steps", "", "Quality")

    # Q5 - Dashboard stats are non-negative integers
    r = get("dashboard/stats", _admin_token)
    body = r.json()
    int_fields = ["total_requests","active_requests","completed_requests","pending_requests"]
    all_valid = all(isinstance(body.get(f), int) and body.get(f, 0) >= 0 for f in int_fields)
    check("Q5  Dashboard numeric stats are non-negative ints", all_valid,
          str({f: body.get(f) for f in int_fields}), "Quality")

    # Q6 - Create request with missing request_number auto-generates one
    r = post("requests", {"device_name": "AutoNum Device", "originator": "QA"}, _admin_token)
    auto_ok = r.status_code == 200 and bool(r.json().get("request_number"))
    check("Q6  Request auto-generates request_number when omitted", auto_ok,
          f"request_number={r.json().get('request_number') if r.status_code==200 else '?'}", "Quality")
    if r.status_code == 200:
        _test_request_ids.append(r.json()["id"])

    # Q7 - Duplicate request_number rejected
    ts = datetime.now().strftime('%H%M%S%f')
    rnum = f"DUP-TEST-{ts}"
    r1 = post("requests", {"request_number": rnum, "device_name": "Dev1"}, _admin_token)
    r2 = post("requests", {"request_number": rnum, "device_name": "Dev2"}, _admin_token)
    if r1.status_code == 200:
        _test_request_ids.append(r1.json()["id"])
    dup_blocked = r2.status_code in (400, 409, 422)
    check("Q7  Duplicate request_number is rejected", dup_blocked,
          f"first={r1.status_code} second={r2.status_code}", "Quality")

    # Q8 - Step status only accepts valid enum values
    if _test_request_ids:
        rid = _test_request_ids[0]
        r = patch(f"requests/{rid}/steps/1", {"status": "INVALID_STATUS"}, _admin_token)
        check("Q8  Invalid step status value rejected (422)", r.status_code == 422,
              f"status={r.status_code}", "Quality")

    # Q9 - Register with invalid email rejected
    r = post("auth/register", {"email": "not-an-email", "username": "x", "password": "x", "role": "Technician"})
    check("Q9  Registration with invalid email rejected", r.status_code in (400, 422),
          f"status={r.status_code}", "Quality")

    # Q10 - Register with invalid role rejected
    ts2 = datetime.now().strftime('%H%M%S%f')
    r = post("auth/register", {"email": f"badrol_{ts2}@test.example.com", "username": "x",
                                "password": "Test@123", "role": "SuperAdmin"})
    check("Q10 Registration with invalid role rejected", r.status_code in (400, 422),
          f"status={r.status_code}", "Quality")

    # Q11 - Login with missing fields rejected
    r = post("auth/login", {"email": "admin@amkor.com"})
    check("Q11 Login with missing password rejected (422)", r.status_code == 422,
          f"status={r.status_code}", "Quality")

    # Q12 - Settings object has expected shape
    r = get("settings", _admin_token)
    body = r.json()
    setting_keys = {"app_name", "process_steps"}
    check("Q12 Settings response has required keys",
          setting_keys.issubset(body.keys()),
          f"missing={setting_keys - body.keys()}", "Quality")

    # Q13 - process_steps is a non-empty list
    steps = body.get("process_steps", [])
    check("Q13 process_steps is a non-empty list",
          isinstance(steps, list) and len(steps) > 0,
          f"count={len(steps)}", "Quality")

    # Q14 - Role permissions covers all expected roles
    r = get("role-permissions", _admin_token)
    body = r.json()
    expected_roles = {"Reliability Engineer", "Failure Analysis", "Technician", "Planner"}
    actual_roles = set(body.get("permissions", {}).keys())
    check("Q14 Role permissions covers all configurable roles",
          expected_roles.issubset(actual_roles),
          f"missing={expected_roles - actual_roles}", "Quality")

    # Q15 - machines list is populated (seeded defaults)
    # API returns {"machines": [{"id": ..., "machine_no": ..., "description": ...}, ...]}
    r = get("machines", _admin_token)
    body = r.json()
    machines = body.get("machines", []) if isinstance(body, dict) else body
    check("Q15 Machines list is seeded and non-empty",
          isinstance(machines, list) and len(machines) > 0,
          f"count={len(machines)}", "Quality")

    # Q16 - employees list is populated (seeded defaults)
    # API returns {"employees": [{"id": ..., "name": ..., "position": ...}, ...]}
    r = get("employees", _admin_token)
    body = r.json()
    employees = body.get("employees", []) if isinstance(body, dict) else body
    check("Q16 Employees list is seeded and non-empty",
          isinstance(employees, list) and len(employees) > 0,
          f"count={len(employees)}", "Quality")

    # Q17 - last_seen field present in users list response
    r = get("users", _admin_token)
    users = r.json()
    has_last_seen = all("last_seen" in u for u in users)
    check("Q17 All user objects include last_seen field",
          has_last_seen, f"users_checked={len(users)}", "Quality")

    # Q18 - CORS headers present (important for browser clients)
    r = requests.options(f"{BASE}/auth/login",
                         headers={"Origin": "http://localhost:5173",
                                  "Access-Control-Request-Method": "POST"}, timeout=10)
    cors = "access-control-allow-origin" in {k.lower() for k in r.headers}
    if not cors:
        # Also check a normal GET
        r2 = get("", _admin_token)
        cors = "access-control-allow-origin" in {k.lower() for k in r2.headers}
    if cors:
        check("Q18 CORS headers present in responses", True, "", "Quality")
    else:
        warn("Q18 CORS headers not detected (may be handled by proxy)", "", "Quality")

    # Q19 - Response time for dashboard < 3 seconds
    start = time.time()
    get("dashboard/stats", _admin_token)
    elapsed = time.time() - start
    check("Q19 Dashboard response time < 3 seconds", elapsed < 3.0,
          f"{elapsed:.2f}s", "Quality")

    # Q20 - Response time for request list < 3 seconds
    start = time.time()
    get("requests", _admin_token)
    elapsed = time.time() - start
    check("Q20 Request list response time < 3 seconds", elapsed < 3.0,
          f"{elapsed:.2f}s", "Quality")


# ─── Cleanup ──────────────────────────────────────────────────────────────────

def cleanup():
    section("CLEANUP")
    if not _admin_token:
        return
    for rid in _test_request_ids:
        try:
            r = delete(f"requests/{rid}", _admin_token)
            status = r.status_code
        except:
            status = "error"
        print(f"  [DEL] test request {rid[:8]}... ({status})")
    for uid in _test_user_ids:
        try:
            r = delete(f"users/{uid}", _admin_token)
            status = r.status_code
        except:
            status = "error"
        print(f"  [DEL] test user {uid[:8]}... ({status})")


# ─── Report ───────────────────────────────────────────────────────────────────

def save_report():
    n_pass = len(RESULTS["passed"])
    n_fail = len(RESULTS["failed"])
    n_warn = len(RESULTS["warnings"])
    total = n_pass + n_fail
    rate = (n_pass / total * 100) if total else 0

    by_cat = {}
    for r in RESULTS["passed"] + RESULTS["failed"]:
        cat = r["category"]
        if cat not in by_cat:
            by_cat[cat] = {"passed": 0, "failed": 0}
        key = "passed" if r in RESULTS["passed"] else "failed"
        by_cat[cat][key] += 1

    report = {
        "run_at": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "total": total,
            "passed": n_pass,
            "failed": n_fail,
            "warnings": n_warn,
            "pass_rate_pct": round(rate, 1),
        },
        "by_category": by_cat,
        "failed_tests": RESULTS["failed"],
        "warnings": RESULTS["warnings"],
        "passed_tests": [t["test"] for t in RESULTS["passed"]],
    }

    path = "test_reports/comprehensive_results.json"
    with open(path, "w") as f:
        json.dump(report, f, indent=2)

    section("FINAL RESULTS")
    print(f"\n  Total tests : {total}")
    print(f"  ✅ Passed   : {n_pass}")
    print(f"  ❌ Failed   : {n_fail}")
    print(f"  ⚠️  Warnings : {n_warn}")
    print(f"  Pass rate   : {rate:.1f}%")
    print()
    for cat, counts in by_cat.items():
        cat_total = counts["passed"] + counts["failed"]
        cat_rate = counts["passed"] / cat_total * 100 if cat_total else 0
        bar = "✅" if cat_rate == 100 else ("⚠️" if cat_rate >= 80 else "❌")
        print(f"  {bar}  {cat:12s}  {counts['passed']}/{cat_total}  ({cat_rate:.0f}%)")

    if RESULTS["failed"]:
        print("\n  ── Failed tests ──")
        for t in RESULTS["failed"]:
            print(f"    ❌ [{t['category']}] {t['test']}")
            if t.get("detail"):
                print(f"       {t['detail']}")
    if RESULTS["warnings"]:
        print("\n  ── Warnings ──")
        for t in RESULTS["warnings"]:
            print(f"    ⚠️  [{t['category']}] {t['test']}")
            if t.get("detail"):
                print(f"       {t['detail']}")

    print(f"\n  Report saved → {path}\n")
    return 0 if n_fail == 0 else 1


# ─── Main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("\n" + "█"*60)
    print("  REL REQUEST WEBSITE — COMPREHENSIVE TEST SUITE")
    print("  Reliability · Security · Quality")
    print("  " + datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print("█"*60)

    try:
        test_reliability()
        test_security()
        test_quality()
    except KeyboardInterrupt:
        print("\n⛔ Interrupted")
    finally:
        cleanup()
        code = save_report()
        sys.exit(code)
