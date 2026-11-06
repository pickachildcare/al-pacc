"""Migration script: add the image column to the Resources table."""

from sqlalchemy import text, inspect
from database import engine

def migrate():
    columns = [col["name"] for col in inspect(engine).get_columns("Resources")]
    if "image" in columns:
        print("Resources.image column already exists. No migration needed.")
        return
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE Resources ADD COLUMN image VARCHAR(500) NULL"))
    print("Added Resources.image column.")

if __name__ == "__main__":
    migrate()
