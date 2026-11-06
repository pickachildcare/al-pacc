"""Populate provinces table with all Canadian provinces and territories."""
from database import engine, SessionLocal
from sqlalchemy import text

provinces = [
    "Alberta",
    "British Columbia",
    "Manitoba",
    "New Brunswick",
    "Newfoundland and Labrador",
    "Nova Scotia",
    "Ontario",
    "Prince Edward Island",
    "Quebec",
    "Saskatchewan",
    "Northwest Territories",
    "Nunavut",
    "Yukon",
]

db = SessionLocal()
try:
    for province_name in provinces:
        # Check if already exists
        existing = db.execute(
            text("SELECT id FROM provinces WHERE name = :name"),
            {"name": province_name}
        ).fetchone()
        if not existing:
            db.execute(
                text("INSERT INTO provinces (name) VALUES (:name)"),
                {"name": province_name}
            )
            print(f"Added: {province_name}")
        else:
            print(f"Already exists: {province_name}")
    db.commit()
    print(f"\nAll {len(provinces)} Canadian provinces and territories have been added.")
finally:
    db.close()