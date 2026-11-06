"""Migration script: add Resources.link VARCHAR(500) column."""

from sqlalchemy import text, inspect
from database import engine

def migrate():
    columns = [col["name"] for col in inspect(engine).get_columns("Resources")]
    if "link" in columns:
        print("Resources.link already exists. No migration needed.")
        return
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE Resources ADD COLUMN link VARCHAR(500) NULL"))
    print("Added Resources.link column.")

if __name__ == "__main__":
    migrate()
