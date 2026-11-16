from pathlib import Path
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import declarative_base, sessionmaker


load_dotenv(Path(__file__).with_name(".env"))

# Format: mysql+pymysql://user:password@host:port/db_name
# You should update these in your .env file
DB_USER = os.getenv("DB_USER") or os.getenv("MYSQLUSER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD") or os.getenv("MYSQLPASSWORD")
DB_HOST = os.getenv("DB_HOST") or os.getenv("MYSQLHOST", "127.0.0.1")
DB_PORT = int(os.getenv("DB_PORT") or os.getenv("MYSQLPORT", "3306"))
DB_NAME = os.getenv("DB_NAME") or os.getenv("MYSQLDATABASE", "childcare_db")

SQLALCHEMY_DATABASE_URL = URL.create(
    "mysql+pymysql",
    username=DB_USER,
    password=os.getenv("DB_PASSWORD"),
    host=DB_HOST,
    port=DB_PORT,
    database=DB_NAME,
)

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
