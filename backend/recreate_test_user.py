import models
import database
import auth
from database import SessionLocal

def recreate_test_user():
    db = SessionLocal()
    try:
        test_username = "testuser"
        # Delete if exists
        db.query(models.User).filter(models.User.username == test_username).delete()
        db.commit()

        print(f"Creating test user '{test_username}' with sha256_crypt...")
        
        hashed_pwd = auth.hash_password("password123")
        
        test_user = models.User(
            username=test_username,
            firstname="Test",
            lastname="User",
            email="test@example.com",
            password=hashed_pwd
        )
        
        db.add(test_user)
        db.commit()
        db.refresh(test_user)
        print("Test user recreated successfully.")
        
        # Verify immediately
        is_valid = auth.verify_password("password123", test_user.password)
        print(f"Immediate verification check: {'PASSED' if is_valid else 'FAILED'}")
        
    except Exception as e:
        print(f"An error occurred: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    recreate_test_user()