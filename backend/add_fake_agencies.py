from sqlalchemy.orm import Session
from database import SessionLocal
import models

def add_fake_agencies():
    db = SessionLocal()
    try:
        # Agencies data
        agencies_data = [
            { 
                "name": "Starlight Childcare Network", 
                "phone": "403-555-0101", 
                "email": "info@starlight.ca",
                "website": "https://starlightchildcare.ca",
                "area_served": ["Calgary, AB"]
            },
            { 
                "name": "Pacific Early Learning", 
                "phone": "604-555-0202", 
                "email": "contact@pacificlearning.com",
                "website": "https://pacificlearning.com",
                "area_served": ["Vancouver, BC"]
            },
            { 
                "name": "Maple Leaf Daycare Services", 
                "phone": "416-555-0303", 
                "email": "services@mapleleafdaycare.ca",
                "website": "https://mapleleafdaycare.ca",
                "area_served": ["Toronto, ON"]
            },
            { 
                "name": "Prairie Roots Childcare", 
                "phone": "306-555-0404", 
                "email": "admin@prairieroots.ca",
                "website": "https://prairieroots.ca",
                "area_served": ["Saskatoon, SK"]
            },
            { 
                "name": "Atlantic Care Collective", 
                "phone": "902-555-0505", 
                "email": "hello@atlanticcare.ca",
                "website": "https://atlanticcare.ca",
                "area_served": ["Halifax, NS"]
            }
        ]

        for agency in agencies_data:
            # Check if agency already exists
            existing_agency = db.query(models.Agency).filter(models.Agency.name == agency["name"]).first()
            if not existing_agency:
                agency = dict(agency)
                areas = agency.pop("area_served", [])
                db_agency = models.Agency(**agency)
                for area in areas:
                    lookup = db.query(models.AreaServedLookup).filter(models.AreaServedLookup.name == area).first()
                    if not lookup:
                        lookup = models.AreaServedLookup(name=area)
                    db_agency.area_served_items.append(lookup)
                db.add(db_agency)
                db.flush()
                print(f"Adding agency: {agency['name']}")
            else:
                print(f"Agency already exists: {agency['name']}")
        
        db.commit()
        print("Done.")

    except Exception as e:
        print(f"An error occurred: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_fake_agencies()