from sqlalchemy import Column, Integer, String, DateTime, Float, Enum, Boolean
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
    mileage = Column(Integer, default=0) # Kilometraj curent
    engine_type = Column(String, nullable=True) # Combustibil (Benzină, Diesel, Hibrid, Electric)
    transmission = Column(String, nullable=True) # Cutie de viteze (Automată, Manuală)
    color = Column(String, nullable=True)
    features = Column(String, nullable=True) # Dotări extra (Text/JSON)
    specs = Column(String, nullable=True) # Specificații tehnice avansate (CP, cilindree, consum - JSON)
    
    purchase_price = Column(Float, nullable=True)
    fleet_type = Column(String, default="LT", nullable=True) # LT (Leasing Operational) vs ST (Rent a Car)
    rental_price_short_term = Column(Float, nullable=True) # Preț/zi
    rental_price_long_term = Column(Float, nullable=True) # Preț/lună
    
    # Scadențe & Asigurări
    insurance_expiry = Column(DateTime, nullable=True) # RCA
    casco_expiry = Column(DateTime, nullable=True) # CASCO
    itp_expiry = Column(DateTime, nullable=True) # ITP
    vignette_expiry = Column(DateTime, nullable=True) # Rovinietă
    
    # Service & Mentenanță
    service_interval_km = Column(Integer, default=15000) # Interval recomandat revizie
    last_service_km = Column(Integer, default=0) # Kilometraj la ultima revizie
    last_service_date = Column(DateTime, nullable=True) # Data ultimei revizii
    service_history = Column(String, nullable=True) # Jurnal complet intervenții mecanice (JSON)
    
    # Bibliotecă Virtuală & Inspecție Fizică
    images = Column(String, nullable=True) # Galerie foto HD: exterior, interior, detalii (JSON list URLs)
    documents = Column(String, nullable=True) # Dosar acte oficiale: RCA, CASCO, Talon, CIV (JSON list)
    damage_notes = Column(String, nullable=True) # Notițe inspecție caroserie / zgârieturi / daune
    
    # Supraveghere Specială & Risc (Watchlist)
    is_high_risk = Column(Boolean, default=False) # Client / Vehicul pe Watchlist de Risc Sporit
    
    # Audit Kilometraj Contract (Live Rent Odometer)
    rental_start_km = Column(Integer, nullable=True) # Kilometraj la predare / plecare
    contracted_km_allowance = Column(Integer, nullable=True) # Plafon kilometric inclus pe contract

    # Management Rezervări Flotă (Client PJ/PF, Agent, Expirare, Contact, Deblocare Prematură)
    reservation_details = Column(String, nullable=True) # JSON: { client_name, client_type, contact_person, phone, email, reserved_by, reserved_until, notes, reserved_at }
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

