from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, selectinload, object_session
from typing import List, Optional
from pathlib import Path
import uuid
import models, schemas, database, auth
from database import engine, get_db
from datetime import timedelta, datetime, date

# Create tables in MySQL
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Pick A Childcare API")

UPLOAD_DIR = Path(__file__).with_name("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
MAX_UPLOAD_BYTES = 5 * 1024 * 1024
# Detected from file content, not the client-supplied filename or content type
IMAGE_SIGNATURES = [
    (b"\xff\xd8\xff", ".jpg"),
    (b"\x89PNG\r\n\x1a\n", ".png"),
    (b"GIF87a", ".gif"),
    (b"GIF89a", ".gif"),
]

def _detect_image_ext(data: bytes) -> Optional[str]:
    for signature, ext in IMAGE_SIGNATURES:
        if data.startswith(signature):
            return ext
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return ".webp"
    return None

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Enable CORS for React frontend
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://pickachildcare.github.io",
    "https://pickachildcare.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Pick A Childcare API"}

# --- AGES SERVED LOOKUP ---

@app.get("/childcare-types", response_model=List[schemas.ChildcareTypeLookup])
def get_childcare_types(db: Session = Depends(get_db)):
    return db.query(models.ChildcareTypeLookup).order_by(models.ChildcareTypeLookup.id).all()

@app.get("/ages-served", response_model=List[schemas.AgesServedLookup])
def get_ages_served(db: Session = Depends(get_db)):
    return db.query(models.AgesServedLookup).order_by(models.AgesServedLookup.id).all()

def _resolve_ages_served(db: Session, names: List[str]) -> List[models.AgesServedLookup]:
    unique_names = list(dict.fromkeys(names))
    items = db.query(models.AgesServedLookup).filter(models.AgesServedLookup.name.in_(unique_names)).all() if unique_names else []
    if len(items) != len(unique_names):
        unknown = sorted(set(unique_names) - {i.name for i in items})
        raise HTTPException(status_code=400, detail=f"Invalid ages served: {', '.join(unknown)}")
    return items

# --- SCHEDULE OPTIONS LOOKUP ---

@app.get("/schedule-options", response_model=List[schemas.ScheduleOptionLookup])
def get_schedule_options(db: Session = Depends(get_db)):
    return db.query(models.ScheduleOptionLookup).order_by(models.ScheduleOptionLookup.id).all()

def _resolve_schedule_options(db: Session, names: List[str]) -> List[models.ScheduleOptionLookup]:
    unique_names = list(dict.fromkeys(names))
    items = db.query(models.ScheduleOptionLookup).filter(models.ScheduleOptionLookup.name.in_(unique_names)).all() if unique_names else []
    if len(items) != len(unique_names):
        unknown = sorted(set(unique_names) - {i.name for i in items})
        raise HTTPException(status_code=400, detail=f"Invalid schedule options: {', '.join(unknown)}")
    return items

# --- PROVIDERS ---

@app.get("/providers", response_model=List[schemas.Provider])
def get_providers(db: Session = Depends(get_db)):
    return db.query(models.Provider).options(
        selectinload(models.Provider.provider_addresses).joinedload(models.ProviderAddress.address)
    ).all()

@app.get("/providers/{provider_id}", response_model=schemas.Provider)
def get_provider(provider_id: int, db: Session = Depends(get_db)):
    db_provider = db.query(models.Provider).filter(models.Provider.id == provider_id).first()
    if db_provider is None:
        raise HTTPException(status_code=404, detail="Provider not found")
    return db_provider

# Helper to get current user from JWT
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = schemas.TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.username == token_data.username).first()
    if user is None:
        raise credentials_exception
    return user

@app.get("/users/me", response_model=schemas.User)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.get("/my-provider", response_model=schemas.Provider)
def get_my_provider(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Fetch the first provider associated with the current user
    if not current_user.providers:
        raise HTTPException(status_code=404, detail="No provider profile found for this user")
    return current_user.providers[0]

# --- RESOURCES ---

@app.get("/resource-type-lookup", response_model=List[schemas.ResourceTypeLookupItem])
def get_resource_type_lookup(db: Session = Depends(get_db)):
    return db.query(models.ResourceTypeLookup).order_by(models.ResourceTypeLookup.name).all()

def _resource_values(db: Session, resource: schemas.ResourceSave) -> dict:
    values = resource.model_dump()
    type_name = values.pop("resource_type").strip()
    lookup = db.query(models.ResourceTypeLookup).filter(models.ResourceTypeLookup.name == type_name).first()
    if not lookup:
        lookup = models.ResourceTypeLookup(name=type_name)
        db.add(lookup)
        db.flush()
    values["resource_type_id"] = lookup.id
    return values

@app.get("/resources", response_model=List[schemas.Resource])
def get_resources(db: Session = Depends(get_db)):
    return db.query(models.Resource).order_by(models.Resource.resource_name).all()

# --- AGENCIES ---

@app.get("/areas-served-lookup", response_model=List[schemas.AreaServedLookupItem])
def get_areas_served_lookup(db: Session = Depends(get_db)):
    return db.query(models.AreaServedLookup).order_by(models.AreaServedLookup.name).all()

def _resolve_area_served(db: Session, names: Optional[List[str]]) -> List[models.AreaServedLookup]:
    unique_names = list(dict.fromkeys(names or []))
    items = db.query(models.AreaServedLookup).filter(models.AreaServedLookup.name.in_(unique_names)).all() if unique_names else []
    if len(items) != len(unique_names):
        unknown = sorted(set(unique_names) - {i.name for i in items})
        raise HTTPException(status_code=400, detail=f"Invalid areas served: {', '.join(unknown)}")
    return items

def _apply_region_served(db: Session, agency: models.Agency, region_served_id: Optional[int]):
    if region_served_id is not None:
        if not db.query(models.RegionServedLookup).filter(models.RegionServedLookup.id == region_served_id).first():
            raise HTTPException(status_code=400, detail="Invalid region served")
        if not agency.area_served_items:
            raise HTTPException(status_code=400, detail="Select at least one area served before choosing a region served")
        if any(area.region_served_id != region_served_id for area in agency.area_served_items):
            raise HTTPException(status_code=400, detail="Selected areas served must belong to the selected region served")
    db.flush()
    db.execute(
        models.agency_areaServed.update()
        .where(models.agency_areaServed.c.agency_id == agency.id)
        .values(region_served_id=region_served_id)
    )

@app.get("/regions-served-lookup", response_model=List[schemas.RegionServedLookupItem])
def get_regions_served_lookup(db: Session = Depends(get_db)):
    return db.query(models.RegionServedLookup).order_by(models.RegionServedLookup.name).all()

@app.get("/agencies", response_model=List[schemas.Agency])
def get_agencies(db: Session = Depends(get_db)):
    return db.query(models.Agency).options(
        selectinload(models.Agency.addresses).joinedload(models.AgencyAddress.address),
        selectinload(models.Agency.providers).selectinload(models.Provider.users),
    ).all()

# --- AGENCY ADDRESSES ---

@app.get("/agency-addresses", response_model=List[schemas.AgencyAddress])
def get_agency_addresses(db: Session = Depends(get_db)):
    return db.query(models.AgencyAddress).all()

@app.post("/agency-addresses", response_model=schemas.AgencyAddress)
def create_agency_address(agency_address: schemas.AgencyAddressCreate, db: Session = Depends(get_db)):
    db_agency = db.query(models.Agency).filter(models.Agency.id == agency_address.agency_id).first()
    if not db_agency:
        raise HTTPException(status_code=400, detail="Invalid agency ID")
    db_address = db.query(models.Address).filter(models.Address.id == agency_address.address_id).first()
    if not db_address:
        raise HTTPException(status_code=400, detail="Invalid address ID")
    existing = db.query(models.AgencyAddress).filter(
        models.AgencyAddress.agency_id == agency_address.agency_id,
        models.AgencyAddress.address_id == agency_address.address_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="This agency-address association already exists")
    db_agency_address = models.AgencyAddress(**agency_address.model_dump())
    db.add(db_agency_address)
    db.commit()
    db.refresh(db_agency_address)
    return db_agency_address

# --- PROVIDER ADDRESSES ---

@app.get("/provider-addresses", response_model=List[schemas.ProviderAddress])
def get_provider_addresses(db: Session = Depends(get_db)):
    return db.query(models.ProviderAddress).all()

@app.post("/provider-addresses", response_model=schemas.ProviderAddress)
def create_provider_address(provider_address: schemas.ProviderAddressCreate, db: Session = Depends(get_db)):
    db_provider = db.query(models.Provider).filter(models.Provider.id == provider_address.provider_id).first()
    if not db_provider:
        raise HTTPException(status_code=400, detail="Invalid provider ID")
    db_address = db.query(models.Address).filter(models.Address.id == provider_address.address_id).first()
    if not db_address:
        raise HTTPException(status_code=400, detail="Invalid address ID")
    existing = db.query(models.ProviderAddress).filter(
        models.ProviderAddress.provider_id == provider_address.provider_id,
        models.ProviderAddress.address_id == provider_address.address_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="This provider-address association already exists")
    db_provider_address = models.ProviderAddress(**provider_address.model_dump())
    db.add(db_provider_address)
    db.commit()
    db.refresh(db_provider_address)
    return db_provider_address

# --- REGIONS ---

@app.get("/regions", response_model=List[schemas.Region])
def get_regions(db: Session = Depends(get_db)):
    return db.query(models.Region).all()

@app.post("/regions", response_model=schemas.Region)
def create_region(region: schemas.RegionCreate, db: Session = Depends(get_db)):
    db_region = db.query(models.Region).filter(models.Region.name == region.name).first()
    if db_region:
        raise HTTPException(status_code=400, detail="Region name already exists")
    if region.province_id is not None:
        db_province = db.query(models.Province).filter(models.Province.id == region.province_id).first()
        if not db_province:
            raise HTTPException(status_code=400, detail="Invalid province ID")
    db_region = models.Region(**region.model_dump())
    db.add(db_region)
    db.commit()
    db.refresh(db_region)
    return db_region

# --- AREAS SERVED ---

@app.get("/areas-served", response_model=List[schemas.AreaServed])
def get_areas_served(db: Session = Depends(get_db)):
    return db.query(models.AreaServed).all()

@app.post("/areas-served", response_model=schemas.AreaServed)
def create_area_served(area: schemas.AreaServedCreate, db: Session = Depends(get_db)):
    db_agency = db.query(models.Agency).filter(models.Agency.id == area.agency_id).first()
    if not db_agency:
        raise HTTPException(status_code=400, detail="Invalid agency ID")
    db_region = db.query(models.Region).filter(models.Region.id == area.region_id).first()
    if not db_region:
        raise HTTPException(status_code=400, detail="Invalid region ID")
    db_area = models.AreaServed(**area.model_dump())
    db.add(db_area)
    db.commit()
    db.refresh(db_area)
    return db_area

# --- PROVINCES ---

@app.get("/provinces", response_model=List[schemas.Province])
def get_provinces(db: Session = Depends(get_db)):
    return db.query(models.Province).order_by(models.Province.name).all()

@app.post("/provinces", response_model=schemas.Province)
def create_province(province: schemas.ProvinceCreate, db: Session = Depends(get_db)):
    db_province = db.query(models.Province).filter(models.Province.name == province.name).first()
    if db_province:
        raise HTTPException(status_code=400, detail="Province name already exists")
    db_province = models.Province(**province.model_dump())
    db.add(db_province)
    db.commit()
    db.refresh(db_province)
    return db_province

@app.get("/cities", response_model=List[schemas.City])
def get_cities(province_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(models.City)
    if province_id is not None:
        query = query.filter(models.City.province_id == province_id)
    return query.order_by(models.City.name).all()

@app.get("/communities", response_model=List[schemas.Community])
def get_communities(city_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(models.Community)
    if city_id is not None:
        query = query.filter(models.Community.city_id == city_id)
    return query.order_by(models.Community.name).all()

# --- WAITLIST ---

@app.post("/waitlist", response_model=schemas.WaitlistEntry)
def create_waitlist_entry(entry: schemas.WaitlistEntryCreate, db: Session = Depends(get_db)):
    # Check if provider exists
    db_provider = db.query(models.Provider).filter(models.Provider.id == entry.provider_id).first()
    if not db_provider:
        raise HTTPException(status_code=400, detail="Invalid provider ID")
    
    db_entry = models.WaitlistEntry(**entry.model_dump())
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

@app.get("/waitlist", response_model=List[schemas.WaitlistEntry])
def get_waitlist(db: Session = Depends(get_db)):
    return db.query(models.WaitlistEntry).all()

# --- TOUR REQUESTS ---

@app.post("/tours", response_model=schemas.TourRequest)
def create_tour_request(tour: schemas.TourRequestCreate, db: Session = Depends(get_db)):
    if not db.query(models.Provider).filter(models.Provider.id == tour.provider_id).first():
        raise HTTPException(status_code=400, detail="Invalid provider ID")
    if tour.preferred_date < date.today():
        raise HTTPException(status_code=400, detail="Preferred date must not be in the past")
    db_tour = models.TourRequest(**tour.model_dump())
    db.add(db_tour)
    db.commit()
    db.refresh(db_tour)
    return db_tour


# --- ADDRESSES ---

@app.get("/addresses", response_model=List[schemas.Address])
def get_addresses(db: Session = Depends(get_db)):
    return db.query(models.Address).all()

# --- SPOTS AVAILABLE ---

@app.get("/spots-available", response_model=List[schemas.SpotAvailable])
def get_spots_available(db: Session = Depends(get_db)):
    return db.query(models.SpotAvailable).all()

# --- AUTHENTICATION ---

@app.post("/signup", response_model=schemas.User)
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    db_user = db.query(models.User).filter(
        (models.User.username == user.username) | (models.User.email == user.email)
    ).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username or email already registered")
    
    # Hash the password
    hashed_pwd = auth.hash_password(user.password)
    
    # Create new user
    user_data = user.model_dump()
    user_data["password"] = hashed_pwd
    # Admin accounts can't be self-assigned through public signup
    if user_data.get("type") == "admin":
        raise HTTPException(status_code=403, detail="Cannot register as admin")
    
    db_user = models.User(**user_data)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/login", response_model=schemas.Token)
def login(login_data: schemas.LoginRequest, db: Session = Depends(get_db)):
    # Authenticate user
    db_user = db.query(models.User).filter(models.User.username == login_data.username).first()
    if not db_user or not auth.verify_password(login_data.password, db_user.password):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    # Create access token
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": db_user.username}, expires_delta=access_token_expires
    )
    
    # Update last login
    db_user.last_login = datetime.utcnow()
    db.commit()
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "username": db_user.username,
        "user_type": db_user.type,
        "agency_id": db_user.agency_id
    }

@app.post("/providers", response_model=schemas.Provider)
def create_provider_profile(
    provider: schemas.ProviderBase, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    provider_data = provider.model_dump()
    # Remove user_ids from data to avoid conflict with explicit relationship management
    if "user_ids" in provider_data:
        del provider_data["user_ids"]
    ages_served = _resolve_ages_served(db, provider_data.pop("ages_served", []))
    schedule_options = _resolve_schedule_options(db, provider_data.pop("schedule_options", []))
        
    # If user already has a provider profile, update that one
    if current_user.providers:
        db_provider = current_user.providers[0]
        for key, value in provider_data.items():
            setattr(db_provider, key, value)
    else:
        # Check if a provider with this name already exists
        db_provider = db.query(models.Provider).filter(models.Provider.name == provider.name).first()
        if db_provider:
            # Update existing provider and associate with current user
            for key, value in provider_data.items():
                setattr(db_provider, key, value)
            if current_user not in db_provider.users:
                db_provider.users.append(current_user)
        else:
            # Create new provider and associate with current user
            db_provider = models.Provider(**provider_data)
            db_provider.users.append(current_user)
            db.add(db_provider)
    
    db_provider.ages_served_items = ages_served
    db_provider.schedule_option_items = schedule_options
    db.commit()
    db.refresh(db_provider)
    return db_provider

# --- ADMIN ---

def require_admin(current_user: models.User = Depends(get_current_user)):
    if current_user.type != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

@app.post(
    "/admin/regions-served-lookup",
    response_model=schemas.RegionServedLookupItem,
    status_code=201,
)
def admin_create_region_served_lookup(
    lookup: schemas.RegionServedLookupAdminCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    region_name = (lookup.region_name or "").strip()
    if (lookup.region_served_id is None) == (not region_name):
        raise HTTPException(status_code=400, detail="Choose an existing region or enter a new region name")

    region = None
    if lookup.region_served_id is not None:
        region = db.query(models.RegionServedLookup).filter(
            models.RegionServedLookup.id == lookup.region_served_id
        ).first()
        if not region:
            raise HTTPException(status_code=400, detail="Invalid region served")
    elif db.query(models.RegionServedLookup).filter(
        models.RegionServedLookup.name.ilike(region_name)
    ).first():
        raise HTTPException(status_code=409, detail="Region served already exists")

    area_names = []
    seen_names = set()
    for value in lookup.areas:
        name = value.strip()
        normalized = name.casefold()
        if name and normalized not in seen_names:
            seen_names.add(normalized)
            area_names.append(name)

    if area_names:
        existing_areas = db.query(models.AreaServedLookup).filter(
            models.AreaServedLookup.name.in_(area_names)
        ).all()
        existing_by_name = {area.name.casefold(): area for area in existing_areas}
        if region and any(area.region_served_id != region.id for area in existing_by_name.values()):
            conflicts = sorted(
                area.name for area in existing_by_name.values()
                if area.region_served_id != region.id
            )
            raise HTTPException(
                status_code=409,
                detail=f"These areas already exist under another region: {', '.join(conflicts)}",
            )
        if not region and existing_areas:
            conflicts = ", ".join(sorted(area.name for area in existing_areas))
            raise HTTPException(status_code=409, detail=f"These areas already exist: {conflicts}")
    else:
        existing_by_name = {}

    try:
        if region is None:
            region = models.RegionServedLookup(name=region_name)
            db.add(region)
            db.flush()

        for name in area_names:
            if name.casefold() not in existing_by_name:
                db.add(models.AreaServedLookup(name=name, region_served_id=region.id))

        db.commit()
        db.refresh(region)
        return region
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="A region or area with that name already exists") from exc

def _apply_provider_data(db: Session, db_provider: models.Provider, provider: schemas.ProviderAdminSave):
    data = provider.model_dump(exclude={"address", "detailed_spots", "operating_hours"})
    user_ids = data.pop("user_ids", [])
    ages_served = _resolve_ages_served(db, data.pop("ages_served", []))
    schedule_options = _resolve_schedule_options(db, data.pop("schedule_options", []))
    if data.get("agency_id") is not None and not db.query(models.Agency).filter(models.Agency.id == data["agency_id"]).first():
        raise HTTPException(status_code=400, detail="Invalid agency ID")
    for key, value in data.items():
        setattr(db_provider, key, value)
    users = db.query(models.User).filter(models.User.id.in_(user_ids)).all() if user_ids else []
    if len(users) != len(set(user_ids)):
        raise HTTPException(status_code=400, detail="Invalid user ID")
    db_provider.users = users
    db_provider.ages_served_items = ages_served
    db_provider.schedule_option_items = schedule_options
    return provider.detailed_spots

def _save_operating_hours(
    db_provider: models.Provider,
    hours: Optional[List[schemas.OperatingHoursSave]],
):
    if hours is None:
        return
    seen = set()
    for h in hours:
        if h.close_time <= h.open_time:
            raise HTTPException(status_code=400, detail="Closing time must be after opening time")
        key = (h.day_of_week, h.open_time)
        if key in seen:
            raise HTTPException(status_code=400, detail="Duplicate operating hours for the same day and opening time")
        seen.add(key)
    # Delete old rows first: SQLAlchemy inserts before deleting, which trips the unique constraint
    db_provider.operating_hours.clear()
    session = object_session(db_provider)
    if session is not None:
        session.flush()
    db_provider.operating_hours.extend(models.OperatingHours(**h.model_dump()) for h in hours)

def _save_provider_spots(
    db: Session,
    db_provider: models.Provider,
    detailed_spots: Optional[List[schemas.SpotAvailableSave]],
):
    if detailed_spots is None:
        return
    if detailed_spots:
        db_provider.spots_available = sum(s.part_time + s.full_time for s in detailed_spots)
    db.query(models.SpotAvailable).filter(
        models.SpotAvailable.provider_id == db_provider.id
    ).delete(synchronize_session=False)
    db.add_all(
        models.SpotAvailable(provider_id=db_provider.id, **spot.model_dump())
        for spot in detailed_spots
    )

@app.post("/admin/upload-image")
async def admin_upload_image(
    request: Request,
    file: UploadFile = File(...),
    _: models.User = Depends(require_admin),
):
    data = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image must be 5 MB or smaller")
    ext = _detect_image_ext(data)
    if ext is None:
        raise HTTPException(status_code=400, detail="File must be a JPG, PNG, GIF or WebP image")
    filename = f"{uuid.uuid4().hex}{ext}"
    (UPLOAD_DIR / filename).write_bytes(data)
    return {"url": f"{str(request.base_url).rstrip('/')}/uploads/{filename}"}

@app.get("/admin/users", response_model=List[schemas.User])
def admin_list_users(db: Session = Depends(get_db), _: models.User = Depends(require_admin)):
    return db.query(models.User).order_by(models.User.username).all()

@app.post("/admin/providers", response_model=schemas.Provider)
def admin_create_provider(
    provider: schemas.ProviderAdminSave,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    db_provider = models.Provider()
    detailed_spots = _apply_provider_data(db, db_provider, provider)
    db.add(db_provider)
    db.flush()
    _save_provider_spots(db, db_provider, detailed_spots)
    _save_operating_hours(db_provider, provider.operating_hours)
    _save_provider_address(db, db_provider, _clean_address(provider.address))
    db.commit()
    db.refresh(db_provider)
    return db_provider

@app.put("/admin/providers/{provider_id}", response_model=schemas.Provider)
def admin_update_provider(
    provider_id: int,
    provider: schemas.ProviderAdminSave,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    db_provider = db.query(models.Provider).filter(models.Provider.id == provider_id).first()
    if not db_provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    detailed_spots = _apply_provider_data(db, db_provider, provider)
    _save_provider_spots(db, db_provider, detailed_spots)
    _save_operating_hours(db_provider, provider.operating_hours)
    _save_provider_address(db, db_provider, _clean_address(provider.address))
    db.commit()
    db.refresh(db_provider)
    return db_provider

@app.delete("/admin/providers/{provider_id}", status_code=204)
def admin_delete_provider(
    provider_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    db_provider = db.query(models.Provider).filter(models.Provider.id == provider_id).first()
    if not db_provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    db_provider.users = []
    db_provider.ages_served_items = []
    db_provider.schedule_option_items = []
    db.query(models.WaitlistEntry).filter(models.WaitlistEntry.provider_id == provider_id).delete()
    db.query(models.TourRequest).filter(models.TourRequest.provider_id == provider_id).delete()
    db.query(models.SpotAvailable).filter(models.SpotAvailable.provider_id == provider_id).delete()
    address_ids = [a.address_id for a in db.query(models.ProviderAddress).filter(models.ProviderAddress.provider_id == provider_id).all()]
    db.query(models.ProviderAddress).filter(models.ProviderAddress.provider_id == provider_id).delete()
    db.delete(db_provider)
    db.flush()
    _delete_unused_addresses(db, address_ids)
    db.commit()

def _clean_address(address: Optional[schemas.AddressBase]) -> Optional[dict]:
    if address is None:
        return None
    data = address.model_dump()
    for key, value in data.items():
        if isinstance(value, str):
            data[key] = value.strip() or None
    if all(v is None for v in data.values()):
        return None
    if data["postal_code"] is None:
        raise HTTPException(status_code=400, detail="Postal code is required when an address is provided")
    return data

def _delete_unused_addresses(db: Session, address_ids: List[int]):
    for address_id in address_ids:
        in_use = (
            db.query(models.AgencyAddress).filter(models.AgencyAddress.address_id == address_id).count()
            or db.query(models.ProviderAddress).filter(models.ProviderAddress.address_id == address_id).count()
        )
        if not in_use:
            db.query(models.Address).filter(models.Address.id == address_id).delete()

def _save_provider_address(db: Session, db_provider: models.Provider, address_data: Optional[dict]):
    """Writes the address row and its provider_addresses link. Blank address data leaves existing links untouched."""
    if address_data is None:
        return
    link = db.query(models.ProviderAddress).filter(models.ProviderAddress.provider_id == db_provider.id).order_by(models.ProviderAddress.id).first()
    if link:
        shared = (
            db.query(models.ProviderAddress).filter(models.ProviderAddress.address_id == link.address_id, models.ProviderAddress.id != link.id).count()
            or db.query(models.AgencyAddress).filter(models.AgencyAddress.address_id == link.address_id).count()
        )
        if not shared:
            for key, value in address_data.items():
                setattr(link.address, key, value)
            return
        db.delete(link)
    db_address = models.Address(**address_data)
    db.add(db_address)
    db.flush()
    db.add(models.ProviderAddress(provider_id=db_provider.id, address_id=db_address.id))

def _save_agency_address(db: Session, db_agency: models.Agency, address_data: Optional[dict]):
    """Writes the address row and its agency_addresses link. Blank address data leaves existing links untouched."""
    if address_data is None:
        return
    link = db.query(models.AgencyAddress).filter(models.AgencyAddress.agency_id == db_agency.id).order_by(models.AgencyAddress.id).first()
    if link:
        shared = (
            db.query(models.AgencyAddress).filter(models.AgencyAddress.address_id == link.address_id, models.AgencyAddress.id != link.id).count()
            or db.query(models.ProviderAddress).filter(models.ProviderAddress.address_id == link.address_id).count()
        )
        if not shared:
            for key, value in address_data.items():
                setattr(link.address, key, value)
            return
        db.delete(link)
    db_address = models.Address(**address_data)
    db.add(db_address)
    db.flush()
    db.add(models.AgencyAddress(agency_id=db_agency.id, address_id=db_address.id))

@app.post("/admin/agencies", response_model=schemas.Agency)
def admin_create_agency(
    agency: schemas.AgencyAdminSave,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    if db.query(models.Agency).filter(models.Agency.name == agency.name).first():
        raise HTTPException(status_code=400, detail="Agency name already exists")
    if agency.region_id is not None and not db.query(models.Region).filter(models.Region.id == agency.region_id).first():
        raise HTTPException(status_code=400, detail="Invalid region ID")
    db_agency = models.Agency(**agency.model_dump(exclude={"address", "area_served", "region_served_id"}))
    db_agency.area_served_items = _resolve_area_served(db, agency.area_served)
    db.add(db_agency)
    db.flush()
    _apply_region_served(db, db_agency, agency.region_served_id)
    _save_agency_address(db, db_agency, _clean_address(agency.address))
    db.commit()
    db.refresh(db_agency)
    return db_agency

@app.put("/admin/agencies/{agency_id}", response_model=schemas.Agency)
def admin_update_agency(
    agency_id: int,
    agency: schemas.AgencyAdminSave,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    db_agency = db.query(models.Agency).filter(models.Agency.id == agency_id).first()
    if not db_agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    duplicate = db.query(models.Agency).filter(
        models.Agency.name == agency.name, models.Agency.id != agency_id
    ).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="Agency name already exists")
    if agency.region_id is not None and not db.query(models.Region).filter(models.Region.id == agency.region_id).first():
        raise HTTPException(status_code=400, detail="Invalid region ID")
    db_agency.area_served_items = _resolve_area_served(db, agency.area_served)
    for key, value in agency.model_dump(exclude={"address", "area_served", "region_served_id"}).items():
        setattr(db_agency, key, value)
    _apply_region_served(db, db_agency, agency.region_served_id)
    _save_agency_address(db, db_agency, _clean_address(agency.address))
    db.commit()
    db.refresh(db_agency)
    return db_agency

@app.delete("/admin/agencies/{agency_id}", status_code=204)
def admin_delete_agency(
    agency_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    db_agency = db.query(models.Agency).filter(models.Agency.id == agency_id).first()
    if not db_agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    db_agency.area_served_items = []
    # Providers and users are kept but detached from the agency
    db.query(models.Provider).filter(models.Provider.agency_id == agency_id).update({"agency_id": None})
    db.query(models.User).filter(models.User.agency_id == agency_id).update({"agency_id": None})
    address_ids = [a.address_id for a in db.query(models.AgencyAddress).filter(models.AgencyAddress.agency_id == agency_id).all()]
    db.query(models.AgencyAddress).filter(models.AgencyAddress.agency_id == agency_id).delete()
    db.flush()
    for address_id in address_ids:
        in_use = (
            db.query(models.AgencyAddress).filter(models.AgencyAddress.address_id == address_id).count()
            or db.query(models.ProviderAddress).filter(models.ProviderAddress.address_id == address_id).count()
        )
        if not in_use:
            db.query(models.Address).filter(models.Address.id == address_id).delete()
    db.query(models.AreaServed).filter(models.AreaServed.agency_id == agency_id).delete()
    db.execute(models.agency_region.delete().where(models.agency_region.c.agency_id == agency_id))
    db.delete(db_agency)
    db.commit()


@app.get("/admin/resources", response_model=List[schemas.Resource])
def admin_list_resources(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    return db.query(models.Resource).order_by(models.Resource.resource_name).all()

@app.post("/admin/resources", response_model=schemas.Resource)
def admin_create_resource(
    resource: schemas.ResourceSave,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    db_resource = models.Resource(**_resource_values(db, resource))
    db.add(db_resource)
    db.commit()
    db.refresh(db_resource)
    return db_resource

@app.put("/admin/resources/{resource_id}", response_model=schemas.Resource)
def admin_update_resource(
    resource_id: int,
    resource: schemas.ResourceSave,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    db_resource = db.query(models.Resource).filter(models.Resource.resource_id == resource_id).first()
    if not db_resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    for key, value in _resource_values(db, resource).items():
        setattr(db_resource, key, value)
    db_resource.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_resource)
    return db_resource

@app.delete("/admin/resources/{resource_id}", status_code=204)
def admin_delete_resource(
    resource_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    db_resource = db.query(models.Resource).filter(models.Resource.resource_id == resource_id).first()
    if not db_resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    db.delete(db_resource)
    db.commit()

def _check_waitlist_provider(db: Session, provider_id: int):
    if not db.query(models.Provider).filter(models.Provider.id == provider_id).first():
        raise HTTPException(status_code=400, detail="Invalid provider ID")

@app.get("/admin/waitlist", response_model=List[schemas.WaitlistEntry])
def admin_list_waitlist(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    return db.query(models.WaitlistEntry).order_by(models.WaitlistEntry.parent_names).all()

@app.post("/admin/waitlist", response_model=schemas.WaitlistEntry)
def admin_create_waitlist_entry(
    entry: schemas.WaitlistEntryCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    _check_waitlist_provider(db, entry.provider_id)
    db_entry = models.WaitlistEntry(**entry.model_dump())
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

@app.put("/admin/waitlist/{entry_id}", response_model=schemas.WaitlistEntry)
def admin_update_waitlist_entry(
    entry_id: int,
    entry: schemas.WaitlistEntryCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    db_entry = db.query(models.WaitlistEntry).filter(models.WaitlistEntry.id == entry_id).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Waitlist entry not found")
    _check_waitlist_provider(db, entry.provider_id)
    for key, value in entry.model_dump().items():
        setattr(db_entry, key, value)
    db.commit()
    db.refresh(db_entry)
    return db_entry

@app.delete("/admin/waitlist/{entry_id}", status_code=204)
def admin_delete_waitlist_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    db_entry = db.query(models.WaitlistEntry).filter(models.WaitlistEntry.id == entry_id).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Waitlist entry not found")
    db.delete(db_entry)
    db.commit()

@app.get("/admin/tours", response_model=List[schemas.TourRequest])
def admin_list_tours(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    return db.query(models.TourRequest).order_by(models.TourRequest.preferred_date).all()

@app.post("/admin/tours", response_model=schemas.TourRequest)
def admin_create_tour(
    tour: schemas.TourRequestCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    _check_waitlist_provider(db, tour.provider_id)
    db_tour = models.TourRequest(**tour.model_dump())
    db.add(db_tour)
    db.commit()
    db.refresh(db_tour)
    return db_tour

@app.put("/admin/tours/{tour_id}", response_model=schemas.TourRequest)
def admin_update_tour(
    tour_id: int,
    tour: schemas.TourRequestCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    db_tour = db.query(models.TourRequest).filter(models.TourRequest.id == tour_id).first()
    if not db_tour:
        raise HTTPException(status_code=404, detail="Tour request not found")
    _check_waitlist_provider(db, tour.provider_id)
    for key, value in tour.model_dump().items():
        setattr(db_tour, key, value)
    db.commit()
    db.refresh(db_tour)
    return db_tour

@app.delete("/admin/tours/{tour_id}", status_code=204)
def admin_delete_tour(
    tour_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    db_tour = db.query(models.TourRequest).filter(models.TourRequest.id == tour_id).first()
    if not db_tour:
        raise HTTPException(status_code=404, detail="Tour request not found")
    db.delete(db_tour)
    db.commit()
