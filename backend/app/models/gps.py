from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base

class GPSData(Base):
    __tablename__ = "axis_gps_data"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("axis_clients.id"), nullable=False)
    vehicle_plate = Column(String, index=True, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    speed_kmh = Column(Float, default=0.0)
    engine_on = Column(Boolean, default=False)
    location_name = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client")

class GPSAlert(Base):
    __tablename__ = "axis_gps_alerts"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("axis_clients.id"), nullable=False)
    vehicle_plate = Column(String, index=True, nullable=False)
    alert_type = Column(String, nullable=False) # e.g. "STATIONARY", "GEOFENCE", "AI_PATTERN"
    message = Column(String, nullable=False)
    ai_recommendation = Column(String, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client")
