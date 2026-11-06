from database import engine
from sqlalchemy import text

def migrate():
    print("Adding 'type' column to 'users' table...")
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN type VARCHAR(100) AFTER password"))
            conn.commit()
        print("Migration successful.")
    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()