from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from ..models.vehicle import VehicleStatus

class VehicleBase(BaseModel):
    make: str
    model: str
    year: int
    vin: str
    license_plate: str
    status: Optional[VehicleStatus] = VehicleStatus.AVAILABLE
    mileage: Optional[int] = 0
    engine_type: Optional[str] = None
    transmission: Optional[str] = None
    color: Optional[str] = None
    features: Optional[str] = None
    specs: Optional[str] = None
    purchase_price: Optional[float] = None
    fleet_type: Optional[str] = "LT"
    rental_price_short_term: Optional[float] = None
    rental_price_long_term: Optional[float] = None
    insurance_expiry: Optional[datetime] = None
    casco_expiry: Optional[datetime] = None
    itp_expiry: Optional[datetime] = None
    vignette_expiry: Optional[datetime] = None
    service_interval_km: Optional[int] = 15000
    last_service_km: Optional[int] = 0
    last_service_date: Optional[datetime] = None
    service_history: Optional[str] = None
    images: Optional[str] = None
    documents: Optional[str] = None
    damage_notes: Optional[str] = None
    is_high_risk: Optional[bool] = False
    rental_start_km: Optional[int] = None
    contracted_km_allowance: Optional[int] = None
    reservation_details: Optional[str] = None

class VehicleCreate(VehicleBase):
    pass

class VehicleUpdate(BaseModel):
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    vin: Optional[str] = None
    license_plate: Optional[str] = None
    status: Optional[VehicleStatus] = None
    mileage: Optional[int] = None
    engine_type: Optional[str] = None
    transmission: Optional[str] = None
    color: Optional[str] = None
    features: Optional[str] = None
    specs: Optional[str] = None
    purchase_price: Optional[float] = None
    fleet_type: Optional[str] = None
    rental_price_short_term: Optional[float] = None
    rental_price_long_term: Optional[float] = None
    insurance_expiry: Optional[datetime] = None
    casco_expiry: Optional[datetime] = None
    itp_expiry: Optional[datetime] = None
    vignette_expiry: Optional[datetime] = None
    service_interval_km: Optional[int] = None
    last_service_km: Optional[int] = None
    last_service_date: Optional[datetime] = None
    service_history: Optional[str] = None
    images: Optional[str] = None
    documents: Optional[str] = None
    damage_notes: Optional[str] = None
    is_high_risk: Optional[bool] = None
    rental_start_km: Optional[int] = None
    contracted_km_allowance: Optional[int] = None
    reservation_details: Optional[str] = None

class VehicleResponse(VehicleBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

