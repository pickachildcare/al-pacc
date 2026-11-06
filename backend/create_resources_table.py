"""Migration script: create the Resources table."""

from sqlalchemy import text, inspect
from database import engine

def migrate():
    if "Resources" in inspect(engine).get_table_names():
        print("Resources table already exists. No migration needed.")
        return
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE Resources (
                resource_id INT AUTO_INCREMENT PRIMARY KEY,
                resource_name VARCHAR(150) NOT NULL,
                resource_type_id INT NOT NULL,
                status VARCHAR(30) DEFAULT 'Available',
                description TEXT NULL,
                image VARCHAR(500) NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (resource_type_id) REFERENCES resource_type_lookup(id)
            )
        """))
    print("Created Resources table.")

if __name__ == "__main__":
    migrate()
