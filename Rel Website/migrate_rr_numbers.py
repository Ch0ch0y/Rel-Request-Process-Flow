"""
migrate_rr_numbers.py
─────────────────────
One-time migration for existing database records.

BEFORE (old behaviour):
  request_number     = REL202600042  (auto-generated)
  original_rr_number = RR-2026-0010  (original RR# from Excel/Word file)
  classification     = "3.0 Qual | RRS# 220260103"

AFTER (new behaviour, matching the new import logic):
  request_number     = RR-2026-0010  (original RR# — restored as primary key)
  original_rr_number = REL202600042  (auto-generated REL# — stored for reference)
  classification     = "3.0 Qual | REL202600042"  (RRS# replaced with REL#)

Only requests that look like they were imported are touched:
  • original_rr_number IS NOT NULL  (was set by the old importer)
  • request_number starts with REL20… or RMS20… (is an auto-generated number)

Run from the "Rel Website" folder:
  python migrate_rr_numbers.py
"""

import re
import shutil
import sqlite3
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).parent / "backend" / "rel_database.db"


def main():
    if not DB_PATH.exists():
        print(f"ERROR: Database not found at {DB_PATH}")
        return

    # ── 1. Safety backup ─────────────────────────────────────────────────────
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = DB_PATH.with_name(f"rel_database_pre_rr_migration_{timestamp}.db")
    shutil.copy2(DB_PATH, backup_path)
    print(f"Backup created : {backup_path}\n")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    try:
        cur = conn.cursor()

        # ── 2. Find candidate rows ────────────────────────────────────────────
        cur.execute("""
            SELECT id, request_number, original_rr_number, classification
            FROM requests
            WHERE original_rr_number IS NOT NULL
              AND original_rr_number != ''
              AND (request_number LIKE 'REL20%' OR request_number LIKE 'RMS20%')
        """)
        rows = cur.fetchall()

        if not rows:
            print("No records found that need migration. Nothing to do.")
            return

        print(f"Found {len(rows)} record(s) to migrate:\n")
        print(f"  {'OLD request_number':<22}  {'NEW request_number':<22}  {'REL# stored as ref'}")
        print(f"  {'-'*22}  {'-'*22}  {'-'*22}")

        updated = 0
        skipped = 0

        for row in rows:
            req_id          = row["id"]
            old_req_number  = row["request_number"]       # auto-generated REL#
            old_original_rr = row["original_rr_number"]  # original RR# from file
            classification  = row["classification"] or ""

            new_req_number  = old_original_rr   # restore RR# as the primary identifier
            new_original_rr = old_req_number    # move auto REL# to reference field

            # ── Check for collision ───────────────────────────────────────────
            cur.execute(
                "SELECT id FROM requests WHERE request_number = ? AND id != ?",
                (new_req_number, req_id)
            )
            if cur.fetchone():
                print(f"  SKIP  {old_req_number:<22}  target '{new_req_number}' already used by another request.")
                skipped += 1
                continue

            # ── Replace RRS# in classification with the auto REL# ─────────────
            # Handles: "3.0 Qual | RRS# 220260103"  →  "3.0 Qual | REL202600042"
            # Handles: "RRS# 220260103"              →  "REL202600042"
            new_classification = re.sub(
                r'\s*\|\s*RRS#\s*\S+',
                f" | {new_original_rr}",
                classification
            )
            if new_classification == classification:
                # standalone (no pipe before it)
                new_classification = re.sub(
                    r'^RRS#\s*\S+',
                    new_original_rr,
                    classification.strip()
                )

            cur.execute(
                """UPDATE requests
                   SET request_number = ?,
                       original_rr_number = ?,
                       classification = ?
                   WHERE id = ?""",
                (new_req_number, new_original_rr, new_classification, req_id)
            )

            print(f"  OK    {old_req_number:<22}  {new_req_number:<22}  {new_original_rr}")
            updated += 1

        conn.commit()
        print(f"\nMigration complete.  Updated: {updated}  |  Skipped: {skipped}")
        if skipped:
            print(f"Skipped rows were NOT changed — resolve duplicates manually if needed.")

    except Exception as exc:
        conn.rollback()
        print(f"\nERROR — rolled back all changes: {exc}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
