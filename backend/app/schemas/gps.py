from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class GPSDataResponse(BaseModel):
    id: int
    client_id: int
    vehicle_plate: str
    latitude: float
    longitude: float
    speed_kmh: float
    engine_on: bool
    location_name: Optional[str]
    timestamp: datetime
    fleet_type: Optional[str] = "LT"
    vehicle_make_model: Optional[str] = None
    is_high_risk: Optional[bool] = False
    mileage: Optional[int] = 0
    rental_start_km: Optional[int] = None
    contracted_km_allowance: Optional[int] = 3000
    current_rental_km_used: Optional[int] = 0
    over_km_status: Optional[str] = "Normal"

    class Config:
        from_attributes = True


class TelemetryIngestRequest(BaseModel):
    vehicle_plate: str
    latitude: float
    longitude: float
    speed_kmh: float
    engine_on: bool = True
    location_name: Optional[str] = None
    provider: Optional[str] = "TrackGPS API"


class GPSAlertResponse(BaseModel):
    id: int
    client_id: int
    vehicle_plate: str
    alert_type: str
    message: str
    ai_recommendation: Optional[str]
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class BulkAlertRequest(BaseModel):
    ids: List[int]
