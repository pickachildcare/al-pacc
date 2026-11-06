"""
Migration script: Replace the providers.ages_served JSON column with a lookup table and a bridge table.

This script:
1. Creates ages_served_lookup and provider_agesServed if they don't exist
2. Fills ages_served_lookup with every distinct value found in providers.ages_served
3. Links each provider to its values through provider_agesServed
4. Verifies the links, then drops the providers.ages_served column
"""

import json
from sqlalchemy import text, inspect
from database import SessionLocal, engine
import models

# Known age groups come first so the dropdown keeps a sensible order
PREFERRED_ORDER = [
    "Infant (0-17 months)",
    "Toddler (18 months - 2 yrs)",
    "Preschool (3 yrs - 4yrs)",
    "Out of School Care (5 yrs and older)",
]

def _load_list(raw):
    if raw is None:
        return []
    value = json.loads(raw) if isinstance(raw, (str, bytes)) else raw
    return [str(v).strip() for v in value if str(v).strip()] if isinstance(value, list) else []

def migrate():
    db = SessionLocal()
    try:
        print("Creating ages_served_lookup and provider_agesServed tables if they don't exist...")
        models.AgesServedLookup.__table__.create(bind=engine, checkfirst=True)
        models.provider_agesServed.create(bind=engine, checkfirst=True)

        columns = [col["name"] for col in inspect(engine).get_columns("providers")]
        if "ages_served" not in columns:
            print("providers.ages_served column does not exist. No migration needed.")
            return

        rows = db.execute(text("SELECT id, ages_served FROM providers")).fetchall()
        provider_ages = {row[0]: _load_list(row[1]) for row in rows}

        found = {name for names in provider_ages.values() for name in names}
        ordered = [n for n in PREFERRED_ORDER if n in found] + sorted(found - set(PREFERRED_ORDER))

        existing = {r[0] for r in db.execute(text("SELECT name FROM ages_served_lookup")).fetchall()}
        for name in ordered:
            if name not in existing:
                db.execute(text("INSERT INTO ages_served_lookup (name) VALUES (:name)"), {"name": name})
        db.commit()
        print(f"Lookup table ready with {len(ordered)} values from providers.")

        lookup_ids = {r[1]: r[0] for r in db.execute(text("SELECT id, name FROM ages_served_lookup")).fetchall()}
        expected_links = 0
        for provider_id, names in provider_ages.items():
            for name in dict.fromkeys(names):
                expected_links += 1
                db.execute(
                    text(
                        "INSERT INTO provider_agesServed (provider_id, ages_served_id) "
                        "SELECT :pid, :aid FROM DUAL WHERE NOT EXISTS ("
                        "SELECT 1 FROM provider_agesServed WHERE provider_id = :pid AND ages_served_id = :aid)"
                    ),
                    {"pid": provider_id, "aid": lookup_ids[name]},
                )
        db.commit()

        actual_links = db.execute(text("SELECT COUNT(*) FROM provider_agesServed")).scalar()
        if actual_links < expected_links:
            print(f"Verification failed: expected at least {expected_links} links, found {actual_links}. Column kept.")
            return
        print(f"Linked providers to ages served ({actual_links} links).")

        db.execute(text("ALTER TABLE providers DROP COLUMN ages_served"))
        db.commit()
        print("Removed providers.ages_served column.")
        print("Migration completed successfully!")

    except Exception as e:
        print(f"An error occurred: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
