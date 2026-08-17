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

    class Config:
        from_attributes = True

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
