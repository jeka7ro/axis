from sqlalchemy import Column, Integer, String, DateTime, Float, Enum
from datetime import datetime
import enum
from ..database import Base

class VehicleStatus(str, enum.Enum):
    AVAILABLE = "Disponibil"
    RENTED = "Închiriat"
    MAINTENANCE = "În Service"
    RESERVED = "Rezervat"
    DAMAGE = "Daună"

class Vehicle(Base):
    __tablename__ = "axis_vehicles"

    id = Column(Integer, primary_key=True, index=True)
    make = Column(String, index=True, nullable=False)
    model = Column(String, index=True, nullable=False)
    year = Column(Integer, nullable=False)
    vin = Column(String, unique=True, index=True, nullable=False) # Serie Șasiu
    license_plate = Column(String, unique=True, index=True, nullable=False) # Nr. Înmatriculare
    
    status = Column(Enum(VehicleStatus), default=VehicleStatus.AVAILABLE)
    mileage = Column(Integer, default=0) # Kilometraj
    engine_type = Column(String, nullable=True) # Combustibil
    transmission = Column(String, nullable=True) # Cutie de viteze
    color = Column(String, nullable=True)
    features = Column(String, nullable=True) # Dotări extra (Text/JSON)
    
    purchase_price = Column(Float, nullable=True)
    rental_price_short_term = Column(Float, nullable=True) # Preț/zi
    rental_price_long_term = Column(Float, nullable=True) # Preț/lună
    
    insurance_expiry = Column(DateTime, nullable=True)
    itp_expiry = Column(DateTime, nullable=True)
    vignette_expiry = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
