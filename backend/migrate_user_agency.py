from database import engine
from sqlalchemy import text

def migrate():
    print("Adding 'agency_id' column to 'users' table...")
    try:
        with engine.connect() as conn:
            # First check if it already exists to avoid errors
            result = conn.execute(text("SHOW COLUMNS FROM users LIKE 'agency_id'"))
            if not result.fetchone():
                conn.execute(text("ALTER TABLE users ADD COLUMN agency_id INT AFTER type"))
                conn.execute(text("ALTER TABLE users ADD CONSTRAINT fk_user_agency FOREIGN KEY (agency_id) REFERENCES agencies(id)"))
                conn.commit()
                print("Migration successful: Column 'agency_id' and foreign key added.")
            else:
                print("Migration skipped: Column 'agency_id' already exists.")
    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()