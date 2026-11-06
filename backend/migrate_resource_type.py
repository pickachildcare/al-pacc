"""
Migration script: replace Resources.resource_type with a foreign key to resource_type_lookup.

1. Creates resource_type_lookup if needed
2. Seeds it with every distinct Resources.resource_type value
3. Adds Resources.resource_type_id, fills it, and adds the foreign key
4. Drops Resources.resource_type
"""

from sqlalchemy import text, inspect
from database import SessionLocal, engine
import models


def migrate():
    models.ResourceTypeLookup.__table__.create(bind=engine, checkfirst=True)

    columns = [col["name"] for col in inspect(engine).get_columns("Resources")]
    if "resource_type" not in columns:
        print("Resources.resource_type column does not exist. No migration needed.")
        return

    db = SessionLocal()
    try:
        if "resource_type_id" not in columns:
            db.execute(text("ALTER TABLE Resources ADD COLUMN resource_type_id INT NULL"))

        names = db.execute(text(
            "SELECT DISTINCT TRIM(resource_type) FROM Resources "
            "WHERE resource_type IS NOT NULL AND TRIM(resource_type) != '' ORDER BY 1"
        )).scalars().all()
        existing = {r[0] for r in db.execute(text("SELECT name FROM resource_type_lookup")).fetchall()}
        for name in names:
            if name not in existing:
                db.execute(text("INSERT INTO resource_type_lookup (name) VALUES (:name)"), {"name": name})

        db.execute(text(
            "UPDATE Resources r JOIN resource_type_lookup l ON l.name = TRIM(r.resource_type) "
            "SET r.resource_type_id = l.id"
        ))
        missing = db.execute(text("SELECT COUNT(*) FROM Resources WHERE resource_type_id IS NULL")).scalar()
        if missing:
            db.rollback()
            print(f"Verification failed: {missing} resources have no matching type. Nothing changed.")
            return

        db.execute(text("ALTER TABLE Resources MODIFY resource_type_id INT NOT NULL"))
        db.execute(text(
            "ALTER TABLE Resources ADD CONSTRAINT fk_resources_resource_type "
            "FOREIGN KEY (resource_type_id) REFERENCES resource_type_lookup(id)"
        ))
        db.execute(text("ALTER TABLE Resources DROP COLUMN resource_type"))
        db.commit()
        print(f"Migration completed: {len(names)} resource types seeded.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
