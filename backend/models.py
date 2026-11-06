from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Date, Time, Table, Text, UniqueConstraint, text, select
from sqlalchemy.orm import relationship, object_session
from database import Base
import datetime

class AreaServedLookup(Base):
    __tablename__ = "area_served_lookup"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False)
    region_served_id = Column(
        Integer,
        ForeignKey("region_served_lookup.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    region_served = relationship("RegionServedLookup", back_populates="area_served_items")

agency_areaServed = Table(
    "agency_areaServed",
    Base.metadata,
    Column("agency_id", Integer, ForeignKey("agencies.id"), primary_key=True),
    Column("area_served_id", Integer, ForeignKey("area_served_lookup.id"), primary_key=True),
    Column("region_served_id", Integer, ForeignKey("region_served_lookup.id"), nullable=True)
)

class Agency(Base):
    __tablename__ = "agencies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True)
    phone = Column(String(50))
    email = Column(String(255))
    website = Column(String(255))
    description = Column(String(1000), nullable=True)
    gov_inspect_profile_link = Column(String(500), nullable=True)
    region_id = Column(Integer, ForeignKey("regions.id"), nullable=True)
    date_created = Column(DateTime, default=datetime.datetime.utcnow)
    date_modified = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    region = relationship("Region", back_populates="agencies")
    providers = relationship("Provider", back_populates="agency")
    users = relationship("User", back_populates="agency")
    addresses = relationship("AgencyAddress", back_populates="agency")
    areas_served = relationship("AreaServed", back_populates="agency")
    regions = relationship("Region", secondary="agency_region", back_populates="agencies")
    area_served_items = relationship(
        "AreaServedLookup",
        secondary=agency_areaServed,
        order_by="AreaServedLookup.name",
    )

    @property
    def area_served(self):
        return [a.name for a in self.area_served_items]

    @property
    def region_served_id(self):
        session = object_session(self)
        if session is None:
            return None
        return session.execute(
            select(agency_areaServed.c.region_served_id)
            .where(agency_areaServed.c.agency_id == self.id, agency_areaServed.c.region_served_id.isnot(None))
            .limit(1)
        ).scalar()

user_provider = Table(
    "user_provider",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("provider_id", Integer, ForeignKey("providers.id"), primary_key=True),
    Column("date_created", DateTime, default=datetime.datetime.utcnow)
)

agency_region = Table(
    "agency_region",
    Base.metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("agency_id", Integer, ForeignKey("agencies.id")),
    Column("region_id", Integer, ForeignKey("regions.id"))
)

class AgesServedLookup(Base):
    __tablename__ = "ages_served_lookup"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)

class RegionServedLookup(Base):
    __tablename__ = "region_served_lookup"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False)

    area_served_items = relationship("AreaServedLookup", back_populates="region_served", order_by="AreaServedLookup.name")

    @property
    def area_served(self):
        return [a.name for a in self.area_served_items]

class ResourceTypeLookup(Base):
    __tablename__ = "resource_type_lookup"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)

class ChildcareTypeLookup(Base):
    __tablename__ = "childcare_type_lookup"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)

provider_agesServed = Table(
    "provider_agesServed",
    Base.metadata,
    Column("provider_id", Integer, ForeignKey("providers.id"), primary_key=True),
    Column("ages_served_id", Integer, ForeignKey("ages_served_lookup.id"), primary_key=True)
)

class ScheduleOptionLookup(Base):
    __tablename__ = "schedule_options_lookup"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)

provider_scheduleoptions = Table(
    "provider_scheduleoptions",
    Base.metadata,
    Column("provider_id", Integer, ForeignKey("providers.id"), primary_key=True),
    Column("schedule_option_id", Integer, ForeignKey("schedule_options_lookup.id"), primary_key=True)
)

class Provider(Base):
    __tablename__ = "providers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True)
    type = Column(String(100))
    rating = Column(Float, default=0.0)
    reviews = Column(Integer, default=0)
    location = Column(String(100))
    spots_available = Column(Integer, default=0)
    max_capacity = Column(Integer, default=0)
    meals_provided = Column(Boolean, default=False)
    snack_provided = Column(Boolean, default=False)
    image = Column(String(500))
    description = Column(String(1000))
    phone = Column(String(50), nullable=True)
    website = Column(String(500))
    date_created = Column(DateTime, default=datetime.datetime.utcnow)
    date_modified = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    agency_id = Column(Integer, ForeignKey("agencies.id"), nullable=True)
    agency = relationship("Agency", back_populates="providers")
    
    users = relationship("User", secondary=user_provider, back_populates="providers")
    
    ages_served_items = relationship(
        "AgesServedLookup",
        secondary=provider_agesServed,
        order_by="AgesServedLookup.id",
    )

    @property
    def ages_served(self):
        return [a.name for a in self.ages_served_items]

    schedule_option_items = relationship(
        "ScheduleOptionLookup",
        secondary=provider_scheduleoptions,
        order_by="ScheduleOptionLookup.id",
    )

    @property
    def schedule_options(self):
        return [s.name for s in self.schedule_option_items]

    @property
    def user_ids(self):
        return [u.id for u in self.users]

    waitlist_entries = relationship("WaitlistEntry", back_populates="provider")
    detailed_spots = relationship("SpotAvailable", back_populates="provider")
    provider_addresses = relationship("ProviderAddress", back_populates="provider")
    operating_hours = relationship(
        "OperatingHours",
        back_populates="provider",
        order_by="OperatingHours.day_of_week, OperatingHours.open_time",
        cascade="all, delete-orphan",
    )

class OperatingHours(Base):
    __tablename__ = "operating_hours"
    __table_args__ = (UniqueConstraint("provider_id", "day_of_week", "open_time", name="unique_day"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    provider_id = Column(Integer, ForeignKey("providers.id"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0 (Sunday) to 6 (Saturday)
    open_time = Column(Time, nullable=False)
    close_time = Column(Time, nullable=False)

    provider = relationship("Provider", back_populates="operating_hours")

class TourRequest(Base):
    __tablename__ = "tour_requests"

    id = Column(Integer, primary_key=True, index=True)
    parent_names = Column(String(255))
    email = Column(String(255))
    phone = Column(String(50))
    child_name = Column(String(255), nullable=True)
    preferred_date = Column(Date)
    preferred_time = Column(String(50))
    message = Column(String(1000), nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    provider_id = Column(Integer, ForeignKey("providers.id"))
    provider = relationship("Provider")

class WaitlistEntry(Base):
    __tablename__ = "waitlist"

    id = Column(Integer, primary_key=True, index=True)
    parent_names = Column(String(255))
    email = Column(String(255))
    phone = Column(String(50))
    child_name = Column(String(255))
    child_age = Column(String(100))
    dob_or_due_date = Column(String(100))
    desired_start_month = Column(String(50))
    desired_start_year = Column(Integer)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    provider_id = Column(Integer, ForeignKey("providers.id"))
    provider = relationship("Provider", back_populates="waitlist_entries")

class Address(Base):
    __tablename__ = "addresses"

    id = Column(Integer, primary_key=True, index=True)
    full_address = Column(String(500))
    province = Column(String(100))
    city = Column(String(100))
    community = Column(String(100))
    postal_code = Column(String(20), nullable=False)
    latitude = Column(Float)
    longitude = Column(Float)

    agency_addresses = relationship("AgencyAddress", back_populates="address")
    provider_addresses = relationship("ProviderAddress", back_populates="address")

class AgencyAddress(Base):
    __tablename__ = "agency_addresses"

    id = Column(Integer, primary_key=True, index=True)
    agency_id = Column(Integer, ForeignKey("agencies.id"))
    address_id = Column(Integer, ForeignKey("addresses.id"))

    agency = relationship("Agency", back_populates="addresses")
    address = relationship("Address", back_populates="agency_addresses")

class ProviderAddress(Base):
    __tablename__ = "provider_addresses"

    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, ForeignKey("providers.id"))
    address_id = Column(Integer, ForeignKey("addresses.id"))

    provider = relationship("Provider", back_populates="provider_addresses")
    address = relationship("Address", back_populates="provider_addresses")

class SpotAvailable(Base):
    __tablename__ = "spots_available"

    id = Column(Integer, primary_key=True, index=True)
    age_available = Column(String(100))
    part_time = Column(Integer, default=0)
    full_time = Column(Integer, default=0)
    start_date = Column(String(100))

    provider_id = Column(Integer, ForeignKey("providers.id"))
    provider = relationship("Provider", back_populates="detailed_spots")

class Region(Base):
    __tablename__ = "regions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True)
    province_id = Column(Integer, ForeignKey("provinces.id"))

    province = relationship("Province", back_populates="regions")
    areas_served = relationship("AreaServed", back_populates="region")
    agencies = relationship("Agency", back_populates="region")

class AreaServed(Base):
    __tablename__ = "area_served"

    id = Column(Integer, primary_key=True, index=True)
    agency_id = Column(Integer, ForeignKey("agencies.id"))
    region_id = Column(Integer, ForeignKey("regions.id"))

    agency = relationship("Agency", back_populates="areas_served")
    region = relationship("Region", back_populates="areas_served")

class Province(Base):
    __tablename__ = "provinces"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True)

    regions = relationship("Region", back_populates="province")
    cities = relationship("City", back_populates="province", cascade="all, delete-orphan")

class City(Base):
    __tablename__ = "cities"
    __table_args__ = (UniqueConstraint("province_id", "name", name="uq_cities_province_name"),)

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    province_id = Column(Integer, ForeignKey("provinces.id", ondelete="CASCADE"), nullable=False, index=True)

    province = relationship("Province", back_populates="cities")
    communities = relationship("Community", back_populates="city", cascade="all, delete-orphan")

class Community(Base):
    __tablename__ = "communities"
    __table_args__ = (UniqueConstraint("city_id", "name", name="uq_communities_city_name"),)

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    city_id = Column(Integer, ForeignKey("cities.id", ondelete="CASCADE"), nullable=False, index=True)

    city = relationship("City", back_populates="communities")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(255), unique=True, index=True)
    firstname = Column(String(255))
    lastname = Column(String(255))
    email = Column(String(255), unique=True, index=True)
    password = Column(String(255))
    type = Column(String(100))
    last_login = Column(DateTime)
    date_created = Column(DateTime, default=datetime.datetime.utcnow)
    date_modified = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    agency_id = Column(Integer, ForeignKey("agencies.id"), nullable=True)
    agency = relationship("Agency", back_populates="users")
    providers = relationship("Provider", secondary=user_provider, back_populates="users")

class Resource(Base):
    __tablename__ = "Resources"

    resource_id = Column(Integer, primary_key=True, autoincrement=True)
    resource_name = Column(String(150), nullable=False)
    resource_type_id = Column(Integer, ForeignKey("resource_type_lookup.id"), nullable=False)
    status = Column(String(30), server_default="Available")
    description = Column(Text, nullable=True)
    link = Column(String(500), nullable=True)
    image = Column(String(500), nullable=True)
    created_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))

    resource_type_item = relationship("ResourceTypeLookup", lazy="joined")

    @property
    def resource_type(self):
        return self.resource_type_item.name if self.resource_type_item else None
