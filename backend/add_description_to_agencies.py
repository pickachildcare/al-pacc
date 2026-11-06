"""Migration script: add agencies.description VARCHAR(1000) column."""

from sqlalchemy import text, inspect
from database import engine

def migrate():
    columns = [col["name"] for col in inspect(engine).get_columns("agencies")]
    if "description" in columns:
        print("agencies.description already exists. No migration needed.")
        return
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE agencies ADD COLUMN description VARCHAR(1000) NULL"))
    print("Added agencies.description column.")

if __name__ == "__main__":
    migrate()
