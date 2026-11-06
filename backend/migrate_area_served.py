"""
Migration script: Replace the agencies.area_served JSON column with a lookup table and a bridge table.

This script:
1. Creates area_served_lookup and agency_areaServed if they don't exist
2. Fills area_served_lookup with every distinct value found in agencies.area_served
3. Links each agency to its values through agency_areaServed
4. Verifies the links, then drops the agencies.area_served column
"""

import json
from sqlalchemy import text, inspect
from database import SessionLocal, engine
import models

def _load_list(raw):
    if raw is None:
        return []
    value = json.loads(raw) if isinstance(raw, (str, bytes)) else raw
    return [str(v).strip() for v in value if str(v).strip()] if isinstance(value, list) else []

def migrate():
    db = SessionLocal()
    try:
        print("Creating area_served_lookup and agency_areaServed tables if they don't exist...")
        models.AreaServedLookup.__table__.create(bind=engine, checkfirst=True)
        models.agency_areaServed.create(bind=engine, checkfirst=True)

        columns = [col["name"] for col in inspect(engine).get_columns("agencies")]
        if "area_served" not in columns:
            print("agencies.area_served column does not exist. No migration needed.")
            return

        rows = db.execute(text("SELECT id, area_served FROM agencies")).fetchall()
        agency_areas = {row[0]: _load_list(row[1]) for row in rows}

        found = sorted({name for names in agency_areas.values() for name in names})
        existing = {r[0] for r in db.execute(text("SELECT name FROM area_served_lookup")).fetchall()}
        for name in found:
            if name not in existing:
                db.execute(text("INSERT INTO area_served_lookup (name) VALUES (:name)"), {"name": name})
        db.commit()
        print(f"Lookup table ready with {len(found)} values from agencies.")

        lookup_ids = {r[1]: r[0] for r in db.execute(text("SELECT id, name FROM area_served_lookup")).fetchall()}
        expected_links = 0
        for agency_id, names in agency_areas.items():
            for name in dict.fromkeys(names):
                expected_links += 1
                db.execute(
                    text(
                        "INSERT INTO agency_areaServed (agency_id, area_served_id) "
                        "SELECT :aid, :sid FROM DUAL WHERE NOT EXISTS ("
                        "SELECT 1 FROM agency_areaServed WHERE agency_id = :aid AND area_served_id = :sid)"
                    ),
                    {"aid": agency_id, "sid": lookup_ids[name]},
                )
        db.commit()

        actual_links = db.execute(text("SELECT COUNT(*) FROM agency_areaServed")).scalar()
        if actual_links < expected_links:
            print(f"Verification failed: expected at least {expected_links} links, found {actual_links}. Column kept.")
            return
        print(f"Linked agencies to areas served ({actual_links} links).")

        db.execute(text("ALTER TABLE agencies DROP COLUMN area_served"))
        db.commit()
        print("Removed agencies.area_served column.")
        print("Migration completed successfully!")

    except Exception as e:
        print(f"An error occurred: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
