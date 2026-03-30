import sqlite3

DB = r'C:\Users\168056\OneDrive - Amkor Technology\Documents\GitHub\Rel Request Process Flow\ca-website\backend\ca_database.db'

NEW_STEPS = [
    'External Visual Inspection',
    'X-ray Inspection',
    'SAT Inspection',
    'Chemical Decapsulation',
    'Optical Inspection',
    'Laser & Plasma Decapsulation',
    'Wire Pull Test',
    'Ball Shear Test',
    'Stitch Pull Test',
    'SEM Inspection',
    'Manual Cross-Section (SEM)',
    'Ion Mill',
]

db = sqlite3.connect(DB)

cur = db.execute('SELECT id, ca_number FROM ca_requests ORDER BY id')
requests = cur.fetchall()

for req_id, ca_num in requests:
    db.execute('DELETE FROM ca_steps WHERE request_id=?', (req_id,))
    for i, step_name in enumerate(NEW_STEPS, 1):
        db.execute(
            'INSERT INTO ca_steps (request_id, step_number, step_name, status) VALUES (?,?,?,?)',
            (req_id, i, step_name, 'not_started')
        )
    print(f'Updated steps for {ca_num} (id={req_id})')

db.commit()
db.close()
print('Done.')
