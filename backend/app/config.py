import os
from dotenv import load_dotenv

# Load environment variables from .env file if present
load_dotenv()

class Settings:
    PROJECT_NAME: str = "Axis AI Platform"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "very-secret-key-for-dev")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    # DATABASE_URL from environment (e.g. Supabase Postgres URL)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./axis_dev.db")
    
    # Supabase Storage configuration
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")

settings = Settings()
