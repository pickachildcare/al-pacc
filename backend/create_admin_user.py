import models
import database
import auth
from database import SessionLocal

def create_admin_user():
    db = SessionLocal()
    try:
        username = "admin"
        email = "admin@pickachildcare.com"
        
        # Delete if exists to allow rerun
        db.query(models.User).filter(models.User.username == username).delete()
        db.commit()

        print(f"Creating user '{username}' with type 'admin'...")
        
        hashed_pwd = auth.hash_password("admin123")
        
        admin_user = models.User(
            username=username,
            firstname="System",
            lastname="Administrator",
            email=email,
            password=hashed_pwd,
            type="admin"
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        print(f"User '{username}' created successfully with type '{admin_user.type}'.")
        
    except Exception as e:
        print(f"An error occurred: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()