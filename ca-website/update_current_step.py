import sqlite3
db = sqlite3.connect(r'backend\ca_database.db')
db.execute("UPDATE ca_requests SET current_step='External Visual Inspection' WHERE ca_number='CA-2026-0001'")
db.commit()
db.close()
print('current_step updated')
