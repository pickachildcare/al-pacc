"""
Migration script: Remove provider_id from addresses table and use provider_addresses bridge table instead.

This script:
1. Creates the provider_addresses table if it doesn't exist
2. Migrates existing provider_id data from addresses to provider_addresses
3. Drops the provider_id column from addresses (if MySQL allows it, otherwise recreates the table)
"""

from sqlalchemy import text, inspect
from database import SessionLocal, engine
import models

def migrate():
    db = SessionLocal()
    try:
        # Step 1: Create provider_addresses table if it doesn't exist
        print("Creating provider_addresses table if it doesn't exist...")
        models.ProviderAddress.__table__.create(bind=engine, checkfirst=True)
        print("provider_addresses table ready.")

        # Step 2: Migrate data from addresses.provider_id to provider_addresses
        # Check if provider_id column still exists in addresses table
        inspector = inspect(engine)
        columns = [col['name'] for col in inspector.get_columns('addresses')]
        
        if 'provider_id' in columns:
            print("Migrating provider_id from addresses to provider_addresses...")
            
            # Get all addresses with provider_id
            result = db.execute(text("SELECT id, provider_id FROM addresses WHERE provider_id IS NOT NULL"))
            rows = result.fetchall()
            
            migrated = 0
            for row in rows:
                address_id = row[0]
                provider_id = row[1]
                
                # Check if this link already exists
                existing = db.execute(
                    text("SELECT id FROM provider_addresses WHERE provider_id = :pid AND address_id = :aid"),
                    {"pid": provider_id, "aid": address_id}
                ).fetchone()
                
                if not existing:
                    db.execute(
                        text("INSERT INTO provider_addresses (provider_id, address_id) VALUES (:pid, :aid)"),
                        {"pid": provider_id, "aid": address_id}
                    )
                    migrated += 1
            
            db.commit()
            print(f"Migrated {migrated} provider-address links. {len(rows)} total addresses with provider_id.")
            
            # Step 3: Remove provider_id column from addresses
            # MySQL requires dropping the foreign key constraint first
            print("Removing provider_id column from addresses table...")
            try:
                # First, find and drop the foreign key constraint on provider_id
                fk_result = db.execute(text(
                    "SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE "
                    "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'addresses' "
                    "AND COLUMN_NAME = 'provider_id' AND REFERENCED_TABLE_NAME IS NOT NULL"
                ))
                fk_row = fk_result.fetchone()
                if fk_row:
                    fk_name = fk_row[0]
                    print(f"Dropping foreign key constraint: {fk_name}")
                    db.execute(text(f"ALTER TABLE addresses DROP FOREIGN KEY {fk_name}"))
                    db.commit()
                    print(f"Dropped foreign key constraint: {fk_name}")
                
                # Also drop the index on provider_id if it exists
                idx_result = db.execute(text(
                    "SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS "
                    "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'addresses' "
                    "AND COLUMN_NAME = 'provider_id' AND INDEX_NAME != 'PRIMARY'"
                ))
                idx_rows = idx_result.fetchall()
                seen = set()
                for idx_row in idx_rows:
                    idx_name = idx_row[0]
                    if idx_name not in seen:
                        seen.add(idx_name)
                        print(f"Dropping index: {idx_name}")
                        db.execute(text(f"ALTER TABLE addresses DROP INDEX {idx_name}"))
                        db.commit()
                
                # Now drop the column
                db.execute(text("ALTER TABLE addresses DROP COLUMN provider_id"))
                db.commit()
                print("Successfully removed provider_id column from addresses table.")
            except Exception as e:
                print(f"Note: Could not drop provider_id column: {e}")
                print("You may need to drop it manually or recreate the table.")
        else:
            print("provider_id column does not exist in addresses table. No migration needed.")
        
        print("Migration completed successfully!")
        
    except Exception as e:
        print(f"An error occurred: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate()