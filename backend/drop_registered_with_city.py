from database import engine
from sqlalchemy import text

def migrate():
    print("Dropping 'registered_with_city' column from 'providers' table...")
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE providers DROP COLUMN registered_with_city"))
            conn.commit()
        print("Migration successful.")
    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
