"""Migration script: add agencies.gov_inspect_profile_link VARCHAR(500) column."""

from sqlalchemy import text, inspect
from database import engine

def migrate():
    columns = [col["name"] for col in inspect(engine).get_columns("agencies")]
    if "gov_inspect_profile_link" in columns:
        print("agencies.gov_inspect_profile_link already exists. No migration needed.")
        return
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE agencies ADD COLUMN gov_inspect_profile_link VARCHAR(500) NULL"))
    print("Added agencies.gov_inspect_profile_link column.")

if __name__ == "__main__":
    migrate()
