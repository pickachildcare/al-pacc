"""
Migration script: Create schedule_options_lookup and provider_scheduleoptions tables
and fill the lookup table with the default schedule options.
"""

from database import SessionLocal, engine
import models

SCHEDULE_OPTIONS = [
    "Overnight",
    "Before School",
    "After School",
    "Weekend",
    "Drop-in",
    "Open Holidays",
]

def migrate():
    db = SessionLocal()
    try:
        models.ScheduleOptionLookup.__table__.create(bind=engine, checkfirst=True)
        models.provider_scheduleoptions.create(bind=engine, checkfirst=True)

        existing = {r.name for r in db.query(models.ScheduleOptionLookup).all()}
        for name in SCHEDULE_OPTIONS:
            if name not in existing:
                db.add(models.ScheduleOptionLookup(name=name))
        db.commit()
        print("Schedule options tables ready.")
    except Exception as e:
        print(f"An error occurred: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
