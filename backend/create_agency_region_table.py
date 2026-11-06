"""
Migration script to create the agency_region bridge table.
This table establishes a many-to-many relationship between agencies and regions.
"""

from database import engine
from sqlalchemy import text


def main():
    with engine.connect() as conn:
        # Drop the table if it already exists (to recreate with new schema)
        conn.execute(text("DROP TABLE IF EXISTS agency_region"))

        # Create the agency_region bridge table with id primary key
        conn.execute(text("""
            CREATE TABLE agency_region (
                id INT AUTO_INCREMENT PRIMARY KEY,
                agency_id INT NOT NULL,
                region_id INT NOT NULL,
                FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE,
                FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE CASCADE,
                UNIQUE KEY uq_agency_region (agency_id, region_id)
            )
        """))
        conn.commit()
        print("Table 'agency_region' created successfully with id primary key.")


if __name__ == "__main__":
    main()