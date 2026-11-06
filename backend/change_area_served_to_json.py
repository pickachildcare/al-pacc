"""Change area_served column in agencies table from VARCHAR to JSON."""
from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Check current column type
    result = conn.execute(text("SHOW COLUMNS FROM agencies WHERE Field = 'area_served'"))
    row = result.fetchone()
    
    if row and 'varchar' in str(row[1]).lower():
        # First, convert existing string values to JSON arrays
        conn.execute(text(
            "UPDATE agencies SET area_served = JSON_ARRAY(area_served) WHERE area_served IS NOT NULL AND area_served != ''"
        ))
        print("Converted existing area_served values to JSON arrays")
        
        # Alter column type to JSON
        conn.execute(text(
            "ALTER TABLE agencies MODIFY COLUMN area_served JSON"
        ))
        print("area_served column type changed from VARCHAR to JSON")
    elif row and 'json' in str(row[1]).lower():
        print("area_served column is already JSON type")
    else:
        print("area_served column not found or unexpected type:", row)
    
    conn.commit()