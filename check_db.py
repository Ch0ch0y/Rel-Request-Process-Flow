import sqlite3, json

conn = sqlite3.connect('Rel Website/backend/rel_database.db')
conn.row_factory = sqlite3.Row

cur = conn.execute('SELECT * FROM requests ORDER BY created_at DESC LIMIT 1')
row = cur.fetchone()
if row:
    print('=== REQUEST FIELDS ===')
    for k in row.keys():
        v = row[k]
        print(f'  {k}: {repr(str(v))[:70]}')

    print('\n=== STEPS ===')
    cur2 = conn.execute(
        'SELECT step_name, leg, step_number, custom_fields FROM process_steps WHERE request_id = ? LIMIT 5',
        (row['id'],)
    )
    for s in cur2.fetchall():
        cf = json.loads(s['custom_fields']) if s['custom_fields'] else {}
        print(f'  [{s["leg"]}] {s["step_name"]} cf_keys={list(cf.keys())}')
        for k2, v2 in cf.items():
            print(f'       {k2}: {repr(str(v2))[:50]}')
else:
    print('No requests found in rel_database.db')
    # Try the other DB
    conn.close()
    conn = sqlite3.connect('Rel Website/backend/rel_requests.db')
    conn.row_factory = sqlite3.Row
    cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
    print('Tables in rel_requests.db:', [r[0] for r in cur.fetchall()])

conn.close()
