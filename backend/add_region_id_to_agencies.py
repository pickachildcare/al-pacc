"""Add region_id foreign key column to agencies table."""
from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Check if region_id column already exists
    result = conn.execute(text("SHOW COLUMNS FROM agencies LIKE 'region_id'"))
    exists = result.fetchone() is not None
    
    if not exists:
        conn.execute(text(
            "ALTER TABLE agencies ADD COLUMN region_id INTEGER, "
            "ADD CONSTRAINT fk_agencies_region FOREIGN KEY (region_id) REFERENCES regions(id)"
        ))
        print("region_id column added to agencies table with foreign key to regions")
    else:
        print("region_id column already exists in agencies table")
    
    conn.commit()