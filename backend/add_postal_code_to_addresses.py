"""
Migration script: add addresses.postal_code VARCHAR(20) NOT NULL.

Existing rows are backfilled with a Canadian postal code parsed from full_address
(empty string when none is found).
"""

import re
from sqlalchemy import text, inspect
from database import SessionLocal, engine

POSTAL_RE = re.compile(r"\b([A-Za-z]\d[A-Za-z])[ -]?(\d[A-Za-z]\d)\b")

def migrate():
    columns = [col["name"] for col in inspect(engine).get_columns("addresses")]
    if "postal_code" in columns:
        print("postal_code column already exists. No migration needed.")
        return

    db = SessionLocal()
    try:
        db.execute(text("ALTER TABLE addresses ADD COLUMN postal_code VARCHAR(20) NOT NULL DEFAULT ''"))
        rows = db.execute(text("SELECT id, full_address FROM addresses")).fetchall()
        filled = 0
        for address_id, full_address in rows:
            match = POSTAL_RE.search(full_address or "")
            if match:
                db.execute(
                    text("UPDATE addresses SET postal_code = :pc WHERE id = :id"),
                    {"pc": f"{match.group(1)} {match.group(2)}".upper(), "id": address_id},
                )
                filled += 1
        db.execute(text("ALTER TABLE addresses ALTER COLUMN postal_code DROP DEFAULT"))
        db.commit()
        print(f"Added postal_code. Backfilled {filled} of {len(rows)} existing addresses.")
    except Exception as e:
        db.rollback()
        print(f"An error occurred: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
