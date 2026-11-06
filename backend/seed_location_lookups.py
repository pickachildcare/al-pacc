"""Create and populate province, city, and community lookup records from addresses."""

import models
from database import SessionLocal, engine


PROVINCE_NAMES = (
    "Alberta",
    "British Columbia",
    "Manitoba",
    "New Brunswick",
    "Newfoundland and Labrador",
    "Northwest Territories",
    "Nova Scotia",
    "Nunavut",
    "Ontario",
    "Prince Edward Island",
    "Quebec",
    "Saskatchewan",
    "Yukon",
)

PROVINCE_CODES = {
    "AB": "Alberta",
    "BC": "British Columbia",
    "MB": "Manitoba",
    "NB": "New Brunswick",
    "NL": "Newfoundland and Labrador",
    "NT": "Northwest Territories",
    "NS": "Nova Scotia",
    "NU": "Nunavut",
    "ON": "Ontario",
    "PE": "Prince Edward Island",
    "QC": "Quebec",
    "SK": "Saskatchewan",
    "YT": "Yukon",
}


def main():
    models.City.__table__.create(bind=engine, checkfirst=True)
    models.Community.__table__.create(bind=engine, checkfirst=True)

    with SessionLocal() as db:
        provinces_by_name = {
            province.name.strip().casefold(): province
            for province in db.query(models.Province).all()
        }
        for name in PROVINCE_NAMES:
            if name.casefold() not in provinces_by_name:
                province = models.Province(name=name)
                db.add(province)
                provinces_by_name[name.casefold()] = province
        db.flush()

        cities_by_key = {
            (city.province_id, city.name.strip().casefold()): city
            for city in db.query(models.City).all()
        }
        communities_by_key = {
            (community.city_id, community.name.strip().casefold()): community
            for community in db.query(models.Community).all()
        }

        for address in db.query(models.Address).all():
            province_label = (address.province or "").strip()
            city_name = (address.city or "").strip()
            community_name = (address.community or "").strip()
            if not province_label or not city_name:
                continue

            province_name = PROVINCE_CODES.get(province_label.upper(), province_label)
            province = provinces_by_name.get(province_name.casefold())
            if province is None:
                print(f"Skipped address {address.id}: unknown province {province_label!r}")
                continue

            city_key = (province.id, city_name.casefold())
            city = cities_by_key.get(city_key)
            if city is None:
                city = models.City(name=city_name, province=province)
                db.add(city)
                db.flush()
                cities_by_key[city_key] = city

            if community_name:
                community_key = (city.id, community_name.casefold())
                if community_key not in communities_by_key:
                    db.add(models.Community(name=community_name, city=city))
                    communities_by_key[community_key] = True

        db.commit()
        print(
            f"Location lookups ready: {db.query(models.Province).count()} provinces, "
            f"{db.query(models.City).count()} cities, "
            f"{db.query(models.Community).count()} communities."
        )


if __name__ == "__main__":
    main()
