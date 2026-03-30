"""Fix COUNT(*) -> MAX for request number generation in server.py"""
import re

fpath = 'backend/server.py'
content = open(fpath, encoding='utf-8').read()

# Pattern to find and replace in ALL 4 occurrences.
# Each looks like:
#   cursor = await db.execute(
#       "SELECT COUNT(*) FROM requests WHERE request_number LIKE ?",
#       (f"REL{year}%",)
#   )
#   count_row = await cursor.fetchone()
#   ... = f"REL{year}{count_row[0] + 1:05d}"
#
# We replace them with MAX(CAST(SUBSTR(...))) so gaps from deletions don't repeat numbers.

OLD_BLOCK = (
    '            "SELECT COUNT(*) FROM requests WHERE request_number LIKE ?",\n'
    "                (f\"REL{year}%\",)\n"
    "            )\n"
    "            count_row = await cursor.fetchone()\n"
    "            request_number = f\"REL{year}{count_row[0] + 1:05d}\""
)

NEW_BLOCK = (
    '            "SELECT MAX(CAST(SUBSTR(request_number, ?) AS INTEGER)) FROM requests WHERE request_number LIKE ?",\n'
    "                (len(f\"REL{year}\") + 1, f\"REL{year}%\")\n"
    "            )\n"
    "            max_row = await cursor.fetchone()\n"
    "            request_number = f\"REL{year}{(max_row[0] or 0) + 1:05d}\""
)

count = content.count(OLD_BLOCK)
print(f"Found {count} occurrences of import-loop block")
if count > 0:
    content = content.replace(OLD_BLOCK, NEW_BLOCK)

# Fix the get_next_request_number endpoint (preview/UI)
OLD_NEXT = (
    '            "SELECT COUNT(*) FROM requests WHERE request_number LIKE ?",\n'
    "            (f\"REL{year}%\",)\n"
    "        )\n"
    "        count_row = await cursor.fetchone()\n"
    "        next_number = f\"REL{year}{count_row[0] + 1:05d}\""
)
NEW_NEXT = (
    '            "SELECT MAX(CAST(SUBSTR(request_number, ?) AS INTEGER)) FROM requests WHERE request_number LIKE ?",\n'
    "            (len(f\"REL{year}\") + 1, f\"REL{year}%\")\n"
    "        )\n"
    "        max_row = await cursor.fetchone()\n"
    "        next_number = f\"REL{year}{(max_row[0] or 0) + 1:05d}\""
)
if OLD_NEXT in content:
    content = content.replace(OLD_NEXT, NEW_NEXT, 1)
    print("Fixed get_next_request_number endpoint")
else:
    print("WARNING: get_next_request_number block not found")

# Fix the create_request endpoint (manual new request)
OLD_CREATE = (
    '                "SELECT COUNT(*) FROM requests WHERE request_number LIKE ?",\n'
    "                (f\"REL{year}%\",)\n"
    "            )\n"
    "            count_row = await cursor.fetchone()\n"
    "            request_number = f\"REL{year}{count_row[0] + 1:05d}\""
)
NEW_CREATE = (
    '                "SELECT MAX(CAST(SUBSTR(request_number, ?) AS INTEGER)) FROM requests WHERE request_number LIKE ?",\n'
    "                (len(f\"REL{year}\") + 1, f\"REL{year}%\")\n"
    "            )\n"
    "            max_row = await cursor.fetchone()\n"
    "            request_number = f\"REL{year}{(max_row[0] or 0) + 1:05d}\""
)
if OLD_CREATE in content:
    content = content.replace(OLD_CREATE, NEW_CREATE, 1)
    print("Fixed create_request endpoint")
else:
    print("WARNING: create_request block not found")

# Sanity: no more COUNT(*) for request_number generation
remaining = content.count("SELECT COUNT(*) FROM requests WHERE request_number LIKE")
print(f"Remaining COUNT(*) occurrences: {remaining}")

open(fpath, 'w', encoding='utf-8').write(content)
print("Done!")