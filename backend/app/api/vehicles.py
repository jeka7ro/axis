from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from ..database import get_db
from ..models.vehicle import Vehicle
from ..schemas.vehicle import VehicleCreate, VehicleUpdate, VehicleResponse

router = APIRouter(
    prefix="/api/vehicles",
    tags=["Vehicles"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[VehicleResponse])
def get_vehicles(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    vehicles = db.query(Vehicle).offset(skip).limit(limit).all()
    return vehicles

@router.post("/", response_model=VehicleResponse)
def create_vehicle(vehicle: VehicleCreate, db: Session = Depends(get_db)):
    db_vehicle = Vehicle(**vehicle.dict())
    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle

@router.get("/by-plate/{plate}", response_model=VehicleResponse)
def get_vehicle_by_plate(plate: str, db: Session = Depends(get_db)):
    clean_plate = plate.replace(" ", "").replace("-", "").upper()
    vehicles = db.query(Vehicle).all()
    for v in vehicles:
        v_clean = v.license_plate.replace(" ", "").replace("-", "").upper()
        if v_clean == clean_plate:
            return v
    raise HTTPException(status_code=404, detail=f"Vehicle with license plate '{plate}' not found")

@router.get("/{vehicle_id}", response_model=VehicleResponse)
def get_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if vehicle is None:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle

@router.put("/{vehicle_id}", response_model=VehicleResponse)
def update_vehicle(vehicle_id: int, vehicle: VehicleUpdate, db: Session = Depends(get_db)):
    db_vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if db_vehicle is None:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    update_data = vehicle.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_vehicle, key, value)
        
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle

@router.delete("/{vehicle_id}")
def delete_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    db_vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if db_vehicle is None:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    db.delete(db_vehicle)
    db.commit()
    return {"message": "Vehicle deleted successfully"}

@router.post("/{vehicle_id}/toggle-watchlist", response_model=VehicleResponse)
def toggle_watchlist(vehicle_id: int, db: Session = Depends(get_db)):
    db_vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if db_vehicle is None:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    db_vehicle.is_high_risk = not bool(db_vehicle.is_high_risk)
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle

from pydantic import BaseModel
class ServiceRecordInput(BaseModel):
    service_type: str
    mileage: int
    cost: float
    provider: str
    notes: Optional[str] = ""

import json

@router.post("/{vehicle_id}/add-service-record", response_model=VehicleResponse)
def add_service_record(vehicle_id: int, record: ServiceRecordInput, db: Session = Depends(get_db)):
    db_vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if db_vehicle is None:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    current_history = []
    if db_vehicle.service_history:
        try:
            current_history = json.loads(db_vehicle.service_history)
        except Exception:
            current_history = []
            
    new_entry = {
        "id": len(current_history) + 1,
        "date": datetime.utcnow().strftime("%Y-%m-%d"),
        "service_type": record.service_type,
        "mileage": record.mileage,
        "cost": record.cost,
        "provider": record.provider,
        "notes": record.notes
    }
    current_history.append(new_entry)
    
    db_vehicle.service_history = json.dumps(current_history)
    db_vehicle.last_service_km = record.mileage
    db_vehicle.last_service_date = datetime.utcnow()
    
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle

