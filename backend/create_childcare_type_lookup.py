from sqlalchemy import text

from database import SessionLocal, engine
import models


def migrate():
    models.ChildcareTypeLookup.__table__.create(bind=engine, checkfirst=True)
    db = SessionLocal()
    try:
        old_name = "After-School"
        new_name = "Out of School Care"
        db.execute(
            text("UPDATE providers SET type = :new_name WHERE type = :old_name"),
            {"old_name": old_name, "new_name": new_name},
        )

        old_lookup_exists = db.execute(
            text("SELECT 1 FROM childcare_type_lookup WHERE name = :name LIMIT 1"),
            {"name": old_name},
        ).first()
        new_lookup_exists = db.execute(
            text("SELECT 1 FROM childcare_type_lookup WHERE name = :name LIMIT 1"),
            {"name": new_name},
        ).first()
        if old_lookup_exists:
            if new_lookup_exists:
                db.execute(
                    text("DELETE FROM childcare_type_lookup WHERE name = :name"),
                    {"name": old_name},
                )
            else:
                db.execute(
                    text(
                        "UPDATE childcare_type_lookup SET name = :new_name "
                        "WHERE name = :old_name"
                    ),
                    {"old_name": old_name, "new_name": new_name},
                )

        names = db.execute(
            text(
                "SELECT DISTINCT type FROM providers "
                "WHERE type IS NOT NULL AND TRIM(type) != '' "
                "AND type NOT IN ('Montessori', 'Nursery') "
                "ORDER BY type"
            )
        ).scalars().all()
        existing = {
            row[0]
            for row in db.execute(text("SELECT name FROM childcare_type_lookup")).fetchall()
        }
        for name in names:
            if name not in existing:
                db.execute(
                    text("INSERT INTO childcare_type_lookup (name) VALUES (:name)"),
                    {"name": name},
                )
        db.commit()
        print(f"Childcare type lookup ready with {len(names)} provider types.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
