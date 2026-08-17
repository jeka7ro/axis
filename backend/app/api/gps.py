from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import random

from ..database import get_db
from ..models.gps import GPSData, GPSAlert
from ..models.vehicle import Vehicle
from ..models.client import Client
from ..schemas.gps import GPSDataResponse, GPSAlertResponse, BulkAlertRequest
from ..api.auth import get_current_user
from ..models.user import User

# --- AUTH BYPASS FOR LOCAL DEV ---
class MockUser:
    id = 1

def mock_get_current_user():
    return MockUser()
# ---------------------------------

router = APIRouter(prefix="/api/gps", tags=["GPS & Fleet"])

# Bounding Box Romania (Approximate)
ROMANIA_WEST_LON = 20.7 # Nadlac border

def initialize_simulation(db: Session):
    """Seed the GPS table with vehicles if empty."""
    vehicles = db.query(Vehicle).all()
    if not vehicles:
        # Create some mock vehicles for the simulation if the database is empty
        mock_v1 = Vehicle(make="Mercedes-Benz", model="GLE", year=2023, vin="WDC1234567", license_plate="B-123-AXS")
        mock_v2 = Vehicle(make="BMW", model="X5", year=2022, vin="WBA1234567", license_plate="B-45-XYZ")
        mock_v3 = Vehicle(make="Audi", model="Q7", year=2024, vin="WAU1234567", license_plate="CJ-10-QWE")
        mock_v4 = Vehicle(make="Skoda", model="Superb", year=2021, vin="TMB1234567", license_plate="TM-99-ZXY")
        
        db.add_all([mock_v1, mock_v2, mock_v3, mock_v4])
        db.commit()
        vehicles = [mock_v1, mock_v2, mock_v3, mock_v4]
        
    existing_plates = {g.vehicle_plate for g in db.query(GPSData.vehicle_plate).all()}
    
    for v in vehicles:
        if v.license_plate not in existing_plates:
            # Decide initial position based on ID for scenario distribution
            scenario_type = v.id % 3
            
            if scenario_type == 0:
                # Scenario 0: Exiting without permission (Starts near Arad, moving West)
                lat = 46.18 + (random.random() * 0.05)
                lon = 21.31 + (random.random() * 0.1) # Close to border 20.7
                loc_name = "Arad, A1 (Spre Nădlac)"
            elif scenario_type == 1:
                # Scenario 1: Debts, approaching border
                lat = 44.93 + (random.random() * 0.05)
                lon = 21.45 + (random.random() * 0.1) # Orșova / Mehedinți
                loc_name = "Orșova, E70 (Spre Porțile de Fier)"
            else:
                # Scenario 2: Normal, Bucharest
                lat = 44.42 + (random.random() * 0.1)
                lon = 26.05 + (random.random() * 0.1)
                loc_name = "București, Trafic Normal"
                
            gps = GPSData(
                client_id=1, # Mock client ID fallback, should link to actual client but vehicle model currently lacks direct client relation in this DB schema without contract
                vehicle_plate=v.license_plate,
                latitude=lat,
                longitude=lon,
                speed_kmh=random.randint(50, 110),
                engine_on=True,
                location_name=loc_name
            )
            db.add(gps)
    
    db.commit()

def generate_alert_if_needed(db: Session, plate: str, alert_type: str, message: str, ai_rec: str):
    # Check if alert already exists for this vehicle to prevent spamming
    existing = db.query(GPSAlert).filter(GPSAlert.vehicle_plate == plate, GPSAlert.alert_type == alert_type).first()
    if not existing:
        alert = GPSAlert(
            client_id=1,
            vehicle_plate=plate,
            alert_type=alert_type,
            message=message,
            ai_recommendation=ai_rec
        )
        db.add(alert)

@router.get("/live", response_model=List[GPSDataResponse])
def get_live_locations(db: Session = Depends(get_db), current_user = Depends(mock_get_current_user)):
    """
    Returns live locations and ANIMATES the vehicles.
    Every request moves the vehicles slightly and evaluates AI scenarios.
    """
    initialize_simulation(db)
    
    vehicles_gps = db.query(GPSData).all()
    vehicles = {v.license_plate: v for v in db.query(Vehicle).all()}
    
    for gps in vehicles_gps:
        # Move vehicles slightly (Animation)
        if not gps.engine_on:
            continue
            
        v = vehicles.get(gps.vehicle_plate)
        if not v:
            continue
            
        scenario_type = v.id % 3
        
        if scenario_type == 0:
            # Moving West towards Nadlac
            gps.longitude -= 0.015 # move west rapidly
            gps.speed_kmh = random.randint(90, 130)
            
            if gps.longitude < ROMANIA_WEST_LON:
                gps.location_name = "Ungaria (M43)"
                generate_alert_if_needed(
                    db, gps.vehicle_plate, "UNAUTHORIZED_EXIT",
                    f"Vehiculul {gps.vehicle_plate} a părăsit România prin punctul Nădlac.",
                    "SISTEM: Clientul NU are împuternicire de ieșire din țară. Recomandare: Sunați imediat clientul. Pregătiți imobilizarea motorului."
                )
            else:
                gps.location_name = "A1, Se apropie de Vamă"
                
        elif scenario_type == 1:
            # Moving towards South-West (Portile de Fier)
            gps.longitude -= 0.01
            gps.latitude -= 0.005
            gps.speed_kmh = random.randint(60, 90)
            
            if gps.longitude < 21.0:
                gps.location_name = "Serbia"
                generate_alert_if_needed(
                    db, gps.vehicle_plate, "DEBT_BORDER_RISK",
                    f"Vehiculul {gps.vehicle_plate} a părăsit țara. Clientul înregistrează sold restant critic.",
                    "AI PATTERN: Risc major de sustragere vehicul. Restanță: 2 luni. S-a inițiat fluxul de notificare Departament Recuperări."
                )
            elif gps.longitude < 22.0:
                gps.location_name = "Apropiere Graniță Serbia (E70)"
                generate_alert_if_needed(
                    db, gps.vehicle_plate, "AI_WARNING",
                    f"Vehiculul {gps.vehicle_plate} se deplasează spre graniță, iar clientul are datorii active.",
                    "Recomandare: Contactați clientul. Permisiunea de ieșire trebuie blocată conform clauzei de neplată din contract."
                )
                
        else:
            # Moving randomly around Bucharest
            gps.latitude += random.uniform(-0.005, 0.005)
            gps.longitude += random.uniform(-0.005, 0.005)
            gps.speed_kmh = random.randint(20, 60)
            gps.location_name = "București - Ilfov"

    db.commit()
    return db.query(GPSData).all()

@router.get("/alerts", response_model=List[GPSAlertResponse])
def get_gps_alerts(db: Session = Depends(get_db), current_user = Depends(mock_get_current_user)):
    return db.query(GPSAlert).order_by(GPSAlert.created_at.desc()).all()

@router.put("/alerts/bulk-read")
def bulk_read_alerts(request: BulkAlertRequest, db: Session = Depends(get_db), current_user = Depends(mock_get_current_user)):
    db.query(GPSAlert).filter(GPSAlert.id.in_(request.ids)).update({GPSAlert.is_read: True}, synchronize_session=False)
    db.commit()
    return {"message": "Alerts marked as read"}

@router.delete("/alerts/bulk-delete")
def bulk_delete_alerts(request: BulkAlertRequest, db: Session = Depends(get_db), current_user = Depends(mock_get_current_user)):
    db.query(GPSAlert).filter(GPSAlert.id.in_(request.ids)).delete(synchronize_session=False)
    db.commit()
    return {"message": "Alerts deleted"}
