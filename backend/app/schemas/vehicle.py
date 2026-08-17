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
    purchase_price: Optional[float] = None
    rental_price_short_term: Optional[float] = None
    rental_price_long_term: Optional[float] = None
    insurance_expiry: Optional[datetime] = None
    itp_expiry: Optional[datetime] = None
    vignette_expiry: Optional[datetime] = None

class VehicleCreate(VehicleBase):
    pass

class VehicleUpdate(VehicleBase):
    pass

class VehicleResponse(VehicleBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
