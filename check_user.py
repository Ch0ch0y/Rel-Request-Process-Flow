import sqlite3
conn = sqlite3.connect('Rel Website/backend/rel_database.db')
cur = conn.execute("SELECT email, password, role, approved FROM users WHERE email = ?", ("Choy@amkor.com",))
r = cur.fetchone()
if r: 
    print(f"email={r[0]}, pw_hash={r[1][:30]}..., role={r[2]}, approved={r[3]}")
else: 
    print("not found")

# Also try admin
cur2 = conn.execute("SELECT email, password, role, approved FROM users WHERE email = ?", ("admin@amkor.com",))
r2 = cur2.fetchone()
if r2: 
    print(f"email={r2[0]}, pw_hash={r2[1][:30]}..., role={r2[2]}, approved={r2[3]}")

conn.close()
