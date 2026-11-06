import models
import database
import auth
from database import SessionLocal

def create_agency_user():
    db = SessionLocal()
    try:
        username = "agency_user"
        email = "agency@example.com"
        
        # Fetch an existing agency to associate with
        agency = db.query(models.Agency).first()
        if not agency:
            print("No agency found in database. Creating a dummy agency...")
            agency = models.Agency(name="Global Childcare Agency", phone="555-0101", email="info@globalagency.com")
            db.add(agency)
            db.commit()
            db.refresh(agency)

        # Delete if exists to allow rerun
        db.query(models.User).filter(models.User.username == username).delete()
        db.commit()

        print(f"Creating user '{username}' with type 'agency' and associating with agency '{agency.name}'...")
        
        hashed_pwd = auth.hash_password("agency123")
        
        agency_user = models.User(
            username=username,
            firstname="Agency",
            lastname="Account",
            email=email,
            password=hashed_pwd,
            type="agency",
            agency_id=agency.id
        )
        
        db.add(agency_user)
        db.commit()
        db.refresh(agency_user)
        print(f"User '{username}' created successfully with type '{agency_user.type}'.")
        
    except Exception as e:
        print(f"An error occurred: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_agency_user()