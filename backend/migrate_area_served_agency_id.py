"""Migrate area_served table: replace sub_region column with agency_id foreign key."""
from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Check if sub_region column still exists
    result = conn.execute(text("SHOW COLUMNS FROM area_served LIKE 'sub_region'"))
    if result.fetchone():
        conn.execute(text("ALTER TABLE area_served DROP COLUMN sub_region"))
        print("Dropped sub_region column from area_served table")
    else:
        print("sub_region column does not exist in area_served table")

    # Check if agency_id column already exists
    result = conn.execute(text("SHOW COLUMNS FROM area_served LIKE 'agency_id'"))
    if not result.fetchone():
        conn.execute(text(
            "ALTER TABLE area_served ADD COLUMN agency_id INTEGER, "
            "ADD CONSTRAINT fk_area_served_agency FOREIGN KEY (agency_id) REFERENCES agencies(id)"
        ))
        print("Added agency_id column with foreign key to agencies table")
    else:
        print("agency_id column already exists in area_served table")

    conn.commit()
    print("Migration completed successfully")