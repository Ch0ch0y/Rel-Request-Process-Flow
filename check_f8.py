"""Check database for request and test LTC generation F8 value."""
import sqlite3

conn = sqlite3.connect('Rel Website/backend/rel_database.db')
conn.row_factory = sqlite3.Row

# Find the request
cur = conn.execute("SELECT request_number, original_rr_number FROM requests WHERE request_number LIKE '%143406%' LIMIT 5")
rows = cur.fetchall()
if rows:
    for r in rows:
        print(f"FOUND: request_number={r['request_number']!r}, original_rr_number={r['original_rr_number']!r}")
else:
    print("No match for 143406, showing recent entries:")
    cur2 = conn.execute("SELECT request_number, original_rr_number FROM requests ORDER BY rowid DESC LIMIT 10")
    for r in cur2.fetchall():
        print(f"  request_number={r['request_number']!r}, original_rr_number={r['original_rr_number']!r}")

conn.close()
