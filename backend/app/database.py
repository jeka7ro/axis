from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

# Fix SQLAlchemy 1.4+ postgres:// uri issue often caused by Railway/Heroku
db_url = settings.DATABASE_URL
if db_url and db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# Setup database engine
engine = create_engine(
    db_url, 
    pool_pre_ping=True,  # IMPORTANT: checks if connection is alive before using it
    pool_recycle=300,    # IMPORTANT: recycles connections older than 5 minutes
    connect_args={"check_same_thread": False} if "sqlite" in db_url else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
