import json
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models

def populate():
    # Drop and recreate all tables to ensure schema changes (like removing user_id) are applied
    print("Dropping and recreating all tables...")
    models.Base.metadata.drop_all(bind=engine)
    models.Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:

        # Agencies data
        agencies_data = [
            { 
                "id": 1, 
                "name": "Bright Horizons Agency", 
                "phone": "514-222-3333", 
                "email": "bright@gmail.com",
                "website": "https://brighthorizons.com",
                "area_served": ["Toronto, ON"]
            },
            { 
                "id": 2, 
                "name": "Childcare Connections", 
                "phone": "514-222-3333", 
                "email": "connection@gmail.com",
                "website": "https://childcareconnections.ca",
                "area_served": ["Montreal, QC"]
            },
            { 
                "id": 3, 
                "name": "Children Choice", 
                "phone": "514-222-3333", 
                "email": "family@gmail.com",
                "website": "https://childrenchoice.ca",
                "area_served": ["Calgary, AB"]
            }
        ]

        area_lookup = {}
        for agency in agencies_data:
            areas = agency.pop("area_served")
            db_agency = models.Agency(**agency)
            for area in areas:
                if area not in area_lookup:
                    area_lookup[area] = models.AreaServedLookup(name=area)
                db_agency.area_served_items.append(area_lookup[area])
            db.add(db_agency)
        
        db.commit()
        print(f"Inserted {len(agencies_data)} agencies")

        # Providers data
        providers_data = [
            {
                "id": 1,
                "name": "Sunshine Daycare Center",
                "type": "Daycare Center",
                "rating": 4.8,
                "reviews": 120,
                "location": "Toronto",
                "spots_available": 5,
                "max_capacity": 15,
                "ages_served": ["Infant (0-17 months)", "Toddler (18 months - 2 yrs)", "Preschool (3 yrs - 4yrs)"],
                "meals_provided": True,
                "snack_provided": True,
                "image": "https://images.unsplash.com/photo-1540479859555-17af45c78602?auto=format&fit=crop&q=80&w=400",
                "description": "A bright and nurturing environment for your little ones to grow and learn in the heart of Toronto.",
                "website": "https://sunshinedaycare.com"
            },
            {
                "id": 2,
                "name": "Happy Hearts Home Childcare",
                "type": "Licensed Home-based",
                "agency_id": 3,
                "rating": 4.9,
                "reviews": 45,
                "location": "Montreal",
                "spots_available": 0,
                "max_capacity": 10,
                "ages_served": ["Toddler (18 months - 2 yrs)", "Preschool (3 yrs - 4yrs)"],
                "meals_provided": False,
                "snack_provided": True,
                "image": "https://images.unsplash.com/photo-1560510629-47607ede7567?auto=format&fit=crop&q=80&w=400",
                "description": "Warm, family-style care in a safe residential setting with a private garden.",
                "website": "https://happyheartschildcare.ca"
            },
            {
                "id": 3,
                "name": "Little Explorers Preschool",
                "type": "Preschool",
                "rating": 4.7,
                "reviews": 88,
                "location": "Ottawa",
                "spots_available": 3,
                "max_capacity": 12,
                "ages_served": ["Preschool (3 yrs - 4yrs)", "Out of School Care (5 yrs and older)"],
                "meals_provided": False,
                "snack_provided": True,
                "image": "https://images.unsplash.com/photo-1587653263995-422546a74559?auto=format&fit=crop&q=80&w=400",
                "description": "Focusing on early childhood development through play and exploration near local parks.",
                "website": "https://littleexplorersottawa.com"
            },
            {
                "id": 4,
                "name": "Tiny Tots Nursery",
                "type": "Daycare Center",
                "rating": 4.6,
                "reviews": 62,
                "location": "Quebec City",
                "spots_available": 2,
                "max_capacity": 10,
                "ages_served": ["Infant (0-17 months)", "Toddler (18 months - 2 yrs)"],
                "meals_provided": True,
                "snack_provided": True,
                "image": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=400",
                "description": "Specialized care for infants and toddlers with dedicated professionals."
            },
            {
                "id": 5,
                "name": "Creative Kids Out-Of-School-Care",
                "type": "Out-Of-School-Care",
                "rating": 4.9,
                "reviews": 34,
                "location": "Winnipeg",
                "spots_available": 0,
                "max_capacity": 20,
                "ages_served": ["Out of School Care (5 yrs and older)"],
                "meals_provided": False,
                "snack_provided": True,
                "image": "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80&w=400",
                "description": "Inspiring creativity and supporting school-aged children after hours."
            },
            {
                "id": 6,
                "name": "Blueberry Hill Montessori",
                "type": "Preschool",
                "rating": 4.8,
                "reviews": 75,
                "location": "Edmonton",
                "spots_available": 8,
                "max_capacity": 25,
                "ages_served": ["Toddler (18 months - 2 yrs)", "Preschool (3 yrs - 4yrs)", "Out of School Care (5 yrs and older)"],
                "meals_provided": False,
                "snack_provided": False,
                "image": "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&q=80&w=400",
                "description": "Cultivating independence and a love for learning in a natural environment."
            },
            {
                "id": 7,
                "name": "Park Slope Daycare",
                "type": "Daycare Center",
                "rating": 4.9,
                "reviews": 92,
                "location": "Halifax",
                "spots_available": 4,
                "max_capacity": 15,
                "ages_served": ["Toddler (18 months - 2 yrs)", "Preschool (3 yrs - 4yrs)"],
                "meals_provided": True,
                "snack_provided": True,
                "image": "https://images.unsplash.com/photo-1594608661623-aa0bd3a69d98?auto=format&fit=crop&q=80&w=400",
                "description": "Premium care with a focus on organic nutrition and outdoor exploration."
            },
            {
                "id": 8,
                "name": "Williamsburg Preschool",
                "type": "Preschool",
                "rating": 4.5,
                "reviews": 56,
                "location": "Victoria",
                "spots_available": 0,
                "max_capacity": 12,
                "ages_served": ["Preschool (3 yrs - 4yrs)"],
                "meals_provided": False,
                "snack_provided": True,
                "image": "https://images.unsplash.com/photo-1564429234817-2921bb33bb6a?auto=format&fit=crop&q=80&w=400",
                "description": "A creative learning space in vibrant Victoria."
            },
            {
                "id": 9,
                "name": "Calgary Kids Academy",
                "type": "Daycare Center",
                "rating": 4.9,
                "reviews": 25,
                "location": "Calgary",
                "spots_available": 6,
                "max_capacity": 30,
                "ages_served": ["Infant (0-17 months)", "Preschool (3 yrs - 4yrs)"],
                "meals_provided": True,
                "snack_provided": True,
                "image": "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&q=80&w=400",
                "description": "A state-of-the-art learning center located in the heart of Calgary."
            },
            {
                "id": 10,
                "name": "Vancouver Early Years",
                "type": "Preschool",
                "rating": 4.7,
                "reviews": 32,
                "location": "Vancouver",
                "spots_available": 1,
                "max_capacity": 15,
                "ages_served": ["Preschool (3 yrs - 4yrs)", "Out of School Care (5 yrs and older)"],
                "meals_provided": False,
                "snack_provided": True,
                "image": "https://images.unsplash.com/photo-1595206133361-b1fe343e5e23?auto=format&fit=crop&q=80&w=400",
                "description": "Specialized preschool program focused on nature-based learning in Kitsilano."
            },
            {
                "id": 11,
                "name": "Rocky Mountain Montessori",
                "type": "Preschool",
                "rating": 4.8,
                "reviews": 19,
                "location": "Calgary",
                "spots_available": 0,
                "max_capacity": 10,
                "ages_served": ["Toddler (18 months - 2 yrs)", "Preschool (3 yrs - 4yrs)", "Out of School Care (5 yrs and older)"],
                "meals_provided": False,
                "snack_provided": False,
                "image": "https://images.unsplash.com/photo-1566454544259-f4b94c3d758c?auto=format&fit=crop&q=80&w=400",
                "description": "Holistic Montessori education with a focus on independence and environmental stewardship in Sundance."
            },
            {
                "id": 12,
                "name": "Alina Dayhome",
                "type": "Licensed Home-based",
                "agency_id": 3,
                "rating": 4.8,
                "reviews": 19,
                "location": "Calgary",
                "spots_available": 0,
                "max_capacity": 6,
                "ages_served": ["Toddler (18 months - 2 yrs)", "Preschool (3 yrs - 4yrs)", "Out of School Care (5 yrs and older)"],
                "meals_provided": False,
                "snack_provided": True,
                "image": "https://images.unsplash.com/photo-1566454544259-f4b94c3d758c?auto=format&fit=crop&q=80&w=400",
                "description": "Licensed Home-based education with a focus on independence and environmental stewardship in Cranston."
            }
        ]

        age_lookup = {}
        for name in ["Infant (0-17 months)", "Toddler (18 months - 2 yrs)", "Preschool (3 yrs - 4yrs)", "Out of School Care (5 yrs and older)"]:
            age_lookup[name] = models.AgesServedLookup(name=name)
            db.add(age_lookup[name])
        db.commit()
        print(f"Inserted {len(age_lookup)} ages served lookup values")

        for name in ["Overnight", "Before School", "After School", "Weekend", "Drop-in", "Open Holidays"]:
            db.add(models.ScheduleOptionLookup(name=name))
        db.commit()

        for provider in providers_data:
            ages_served = provider.pop("ages_served")
            db_provider = models.Provider(**provider)
            db_provider.ages_served_items = [age_lookup[a] for a in ages_served]
            db.add(db_provider)
        
        db.commit()
        print(f"Inserted {len(providers_data)} providers")

        # Addresses data
        addresses_data = [
            { "id": 1, "full_address": "123 Sunny St, Toronto, ON M5V 2H1", "province": "Ontario", "city": "Toronto", "community": "Downtown", "latitude": 43.6426, "longitude": -79.3871 },
            { "id": 2, "full_address": "456 Quiet Ln, Montreal, QC H3B 1A2", "province": "Quebec", "city": "Montreal", "community": "Ville-Marie", "latitude": 45.5017, "longitude": -73.5673 },
            { "id": 3, "full_address": "789 Knowledge Way, Ottawa, ON K1P 5L1", "province": "Ontario", "city": "Ottawa", "community": "Centretown", "latitude": 45.4215, "longitude": -75.6972 },
            { "id": 4, "full_address": "321 Baby Steps Blvd, Quebec City, QC G1R 4P5", "province": "Quebec", "city": "Quebec City", "community": "Old Quebec", "latitude": 46.8139, "longitude": -71.2080 },
            { "id": 5, "full_address": "555 Art Circle, Winnipeg, MB R3C 1V1", "province": "Manitoba", "city": "Winnipeg", "community": "Forks", "latitude": 49.8951, "longitude": -97.1384 },
            { "id": 6, "full_address": "888 Nature Path, Edmonton, AB T5J 2R7", "province": "Alberta", "city": "Edmonton", "community": "Downtown", "latitude": 53.5461, "longitude": -113.4938 },
            { "id": 7, "full_address": "222 Park Ave, Halifax, NS B3J 1M5", "province": "Nova Scotia", "city": "Halifax", "community": "Downtown", "latitude": 44.6488, "longitude": -63.5752 },
            { "id": 8, "full_address": "444 River St, Victoria, BC V8W 1P5", "province": "BC", "city": "Victoria", "community": "Downtown", "latitude": 48.4284, "longitude": -123.3656 },
            { "id": 9, "full_address": "123 Calgary Trail, Calgary, AB T2P 2M5", "province": "Alberta", "city": "Calgary", "community": "Beltline", "latitude": 51.0447, "longitude": -114.0719 },
            { "id": 10, "full_address": "789 Ocean Drive, Vancouver, BC V6J 1Z1", "province": "BC", "city": "Vancouver", "community": "Kitsilano", "latitude": 49.2684, "longitude": -123.1678 },
            { "id": 11, "full_address": "45 Sundance Blvd, Calgary, AB T2X 2G1", "province": "Alberta", "city": "Calgary", "community": "Sundance", "latitude": 50.9022, "longitude": -114.0483 },
            { "id": 12, "full_address": "24 cranberry lane se, Calgary, AB T3M 0L5", "province": "Alberta", "city": "Calgary", "community": "Cranston", "latitude": 50.8834, "longitude": -113.9736 }
        ]

        for address in addresses_data:
            # postal code is the trailing "A1A 1A1" in full_address
            db_address = models.Address(**address, postal_code=address["full_address"][-7:].upper())
            db.add(db_address)
        
        db.commit()
        print(f"Inserted {len(addresses_data)} addresses")

        # Provider-Address bridge data
        provider_addresses_data = [
            { "id": 1, "provider_id": 1, "address_id": 1 },
            { "id": 2, "provider_id": 2, "address_id": 2 },
            { "id": 3, "provider_id": 3, "address_id": 3 },
            { "id": 4, "provider_id": 4, "address_id": 4 },
            { "id": 5, "provider_id": 5, "address_id": 5 },
            { "id": 6, "provider_id": 6, "address_id": 6 },
            { "id": 7, "provider_id": 7, "address_id": 7 },
            { "id": 8, "provider_id": 8, "address_id": 8 },
            { "id": 9, "provider_id": 9, "address_id": 9 },
            { "id": 10, "provider_id": 10, "address_id": 10 },
            { "id": 11, "provider_id": 11, "address_id": 11 },
            { "id": 12, "provider_id": 12, "address_id": 12 }
        ]

        for pa in provider_addresses_data:
            db_pa = models.ProviderAddress(**pa)
            db.add(db_pa)
        
        db.commit()
        print(f"Inserted {len(provider_addresses_data)} provider-address links")

        # Spots Available data
        spots_available_data = [
            { "id": 1, "provider_id": 1, "age_available": "Infant (0-17 months)", "part_time": 1, "full_time": 2, "start_date": "2026-03-01" },
            { "id": 2, "provider_id": 1, "age_available": "Toddler (18 months - 2 yrs)", "part_time": 0, "full_time": 2, "start_date": "2026-04-01" },
            { "id": 3, "provider_id": 3, "age_available": "Preschool (3 yrs - 4yrs)", "part_time": 1, "full_time": 2, "start_date": "2026-02-15" },
            { "id": 4, "provider_id": 4, "age_available": "Infant (0-17 months)", "part_time": 0, "full_time": 2, "start_date": "2026-05-01" },
            { "id": 5, "provider_id": 6, "age_available": "Toddler (18 months - 2 yrs)", "part_time": 2, "full_time": 2, "start_date": "2026-03-15" },
            { "id": 6, "provider_id": 6, "age_available": "Preschool (3 yrs - 4yrs)", "part_time": 2, "full_time": 2, "start_date": "2026-03-15" },
            { "id": 7, "provider_id": 7, "age_available": "Toddler (18 months - 2 yrs)", "part_time": 1, "full_time": 1, "start_date": "2026-06-01" },
            { "id": 8, "provider_id": 7, "age_available": "Preschool (3 yrs - 4yrs)", "part_time": 1, "full_time": 1, "start_date": "2026-06-01" },
            { "id": 9, "provider_id": 9, "age_available": "Infant (0-17 months)", "part_time": 2, "full_time": 2, "start_date": "2026-04-15" },
            { "id": 10, "provider_id": 9, "age_available": "Preschool (3 yrs - 4yrs)", "part_time": 1, "full_time": 1, "start_date": "2026-04-15" },
            { "id": 11, "provider_id": 10, "age_available": "Out of School Care (5 yrs and older)", "part_time": 1, "full_time": 0, "start_date": "2026-09-01" }
        ]

        for spot in spots_available_data:
            db_spot = models.SpotAvailable(**spot)
            db.add(db_spot)
        
        db.commit()
        print(f"Inserted {len(spots_available_data)} spots available records")

    except Exception as e:
        print(f"An error occurred: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    populate()
