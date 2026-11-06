"""Add province_id foreign key column to regions table."""
from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Check if province_id column already exists
    result = conn.execute(text("SHOW COLUMNS FROM regions LIKE 'province_id'"))
    exists = result.fetchone() is not None
    
    if not exists:
        conn.execute(text(
            "ALTER TABLE regions ADD COLUMN province_id INTEGER, "
            "ADD CONSTRAINT fk_regions_province FOREIGN KEY (province_id) REFERENCES provinces(id)"
        ))
        print("province_id column added to regions table with foreign key to provinces")
    else:
        print("province_id column already exists in regions table")
    
    conn.commit()