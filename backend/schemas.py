from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
from datetime import datetime, date, time

# Shared properties
class WaitlistEntryBase(BaseModel):
    parent_names: str
    email: str
    phone: str
    child_name: str
    child_age: str
    dob_or_due_date: str
    desired_start_month: str
    desired_start_year: int
    provider_id: int

class WaitlistEntryCreate(WaitlistEntryBase):
    pass

class WaitlistEntry(WaitlistEntryBase):
    id: int
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)

class TourRequestCreate(BaseModel):
    parent_names: str = Field(min_length=1, max_length=255)
    email: str = Field(min_length=3, max_length=255)
    phone: str = Field(min_length=1, max_length=50)
    child_name: Optional[str] = Field(default=None, max_length=255)
    preferred_date: date
    preferred_time: str = Field(min_length=1, max_length=50)
    message: Optional[str] = Field(default=None, max_length=1000)
    provider_id: int

class TourRequest(TourRequestCreate):
    id: int
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)

class ProviderBase(BaseModel):
    name: str
    type: str
    rating: Optional[float] = 0.0
    reviews: Optional[int] = 0
    location: str
    spots_available: int
    max_capacity: int
    ages_served: List[str]
    schedule_options: List[str] = []
    meals_provided: bool
    snack_provided: bool
    image: Optional[str] = None
    description: str
    phone: Optional[str] = Field(default=None, max_length=50)
    website: Optional[str] = Field(default=None, max_length=500)
    agency_id: Optional[int] = None
    user_ids: List[int] = []

class AgesServedLookup(BaseModel):
    id: int
    name: str
    model_config = ConfigDict(from_attributes=True)

class ChildcareTypeLookup(BaseModel):
    id: int
    name: str
    model_config = ConfigDict(from_attributes=True)

class ScheduleOptionLookup(BaseModel):
    id: int
    name: str
    model_config = ConfigDict(from_attributes=True)

class OperatingHoursSave(BaseModel):
    day_of_week: int = Field(ge=0, le=6)  # 0 = Sunday
    open_time: time
    close_time: time

class OperatingHoursInfo(OperatingHoursSave):
    id: int
    model_config = ConfigDict(from_attributes=True)

class Provider(ProviderBase):
    id: int
    date_created: Optional[datetime] = None
    date_modified: Optional[datetime] = None
    operating_hours: List[OperatingHoursInfo] = []
    provider_addresses: List["ProviderAddressInfo"] = []
    model_config = ConfigDict(from_attributes=True)

class AreaServedLookupItem(BaseModel):
    id: int
    name: str
    region_served_id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)

class RegionServedLookupItem(BaseModel):
    id: int
    name: str
    area_served: List[str] = []
    model_config = ConfigDict(from_attributes=True)

class RegionServedLookupAdminCreate(BaseModel):
    region_served_id: Optional[int] = None
    region_name: Optional[str] = Field(default=None, max_length=255)
    areas: List[str] = Field(default_factory=list)

class AgencyBase(BaseModel):
    name: str
    phone: str
    email: str
    website: Optional[str] = None
    description: Optional[str] = Field(default=None, max_length=1000)
    gov_inspect_profile_link: Optional[str] = Field(default=None, max_length=500)
    area_served: Optional[List[str]] = None
    region_id: Optional[int] = None
    region_served_id: Optional[int] = None

class Agency(AgencyBase):
    id: int
    date_created: Optional[datetime] = None
    date_modified: Optional[datetime] = None
    providers: List[Provider] = []
    addresses: List["AgencyAddressInfo"] = []
    model_config = ConfigDict(from_attributes=True)

class AddressBase(BaseModel):
    full_address: Optional[str] = None
    province: Optional[str] = None
    city: Optional[str] = None
    community: Optional[str] = None
    postal_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class Address(AddressBase):
    id: int
    postal_code: str
    model_config = ConfigDict(from_attributes=True)

class SpotAvailableSave(BaseModel):
    age_available: str = Field(min_length=1)
    part_time: int = Field(ge=0)
    full_time: int = Field(ge=0)
    start_date: str = Field(min_length=1)

class AgencyAdminSave(AgencyBase):
    address: Optional[AddressBase] = None

class ProviderAdminSave(ProviderBase):
    address: Optional[AddressBase] = None
    detailed_spots: Optional[List[SpotAvailableSave]] = None
    operating_hours: Optional[List[OperatingHoursSave]] = None

class ProviderAddressInfo(BaseModel):
    id: int
    address_id: int
    address: Address
    model_config = ConfigDict(from_attributes=True)

class AgencyAddressInfo(BaseModel):
    id: int
    address_id: int
    address: Address
    model_config = ConfigDict(from_attributes=True)

class SpotAvailableBase(SpotAvailableSave):
    provider_id: int

class SpotAvailable(SpotAvailableBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class UserBase(BaseModel):
    username: str
    firstname: str
    lastname: str
    email: str
    type: Optional[str] = "parent"
    agency_id: Optional[int] = None

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    last_login: Optional[datetime] = None
    date_created: datetime
    date_modified: datetime
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str
    username: str
    user_type: Optional[str] = None
    agency_id: Optional[int] = None

class TokenData(BaseModel):
    username: Optional[str] = None

class RegionBase(BaseModel):
    name: str
    province_id: Optional[int] = None

class RegionCreate(RegionBase):
    pass

class Region(RegionBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class AreaServedBase(BaseModel):
    agency_id: int
    region_id: int

class AreaServedCreate(AreaServedBase):
    pass

class AreaServed(AreaServedBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class ProvinceBase(BaseModel):
    name: str

class ProvinceCreate(ProvinceBase):
    pass

class Province(ProvinceBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class CityBase(BaseModel):
    name: str
    province_id: int

class City(CityBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class CommunityBase(BaseModel):
    name: str
    city_id: int

class Community(CommunityBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class AgencyAddressBase(BaseModel):
    agency_id: int
    address_id: int

class AgencyAddressCreate(AgencyAddressBase):
    pass

class AgencyAddress(AgencyAddressBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class ProviderAddressBase(BaseModel):
    provider_id: int
    address_id: int

class ProviderAddressCreate(ProviderAddressBase):
    pass

class ProviderAddress(ProviderAddressBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class LoginRequest(BaseModel):
    username: str
    password: str

class ResourceTypeLookupItem(BaseModel):
    id: int
    name: str
    model_config = ConfigDict(from_attributes=True)

class ResourceBase(BaseModel):
    resource_name: str = Field(min_length=1, max_length=150)
    resource_type: str = Field(min_length=1, max_length=50)
    status: Optional[str] = Field(default='Available', max_length=30)
    description: Optional[str] = None
    link: Optional[str] = Field(default=None, max_length=500)
    image: Optional[str] = Field(default=None, max_length=500)

class ResourceSave(ResourceBase):
    pass

class Resource(ResourceBase):
    resource_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)
