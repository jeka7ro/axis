import sqlite3
import json
from datetime import datetime, timedelta

db_path = "backend/axis_dev.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 1. Add missing columns to axis_vehicles
columns_to_add = [
    ("specs", "VARCHAR"),
    ("casco_expiry", "DATETIME"),
    ("service_interval_km", "INTEGER DEFAULT 15000"),
    ("last_service_km", "INTEGER DEFAULT 0"),
    ("last_service_date", "DATETIME"),
    ("service_history", "TEXT"),
    ("images", "TEXT"),
    ("damage_notes", "TEXT"),
    ("is_high_risk", "BOOLEAN DEFAULT 0"),
    ("rental_start_km", "INTEGER"),
    ("contracted_km_allowance", "INTEGER DEFAULT 3000")
]

# Get existing columns
cursor.execute("PRAGMA table_info(axis_vehicles)")
existing_columns = {row[1] for row in cursor.fetchall()}

for col_name, col_type in columns_to_add:
    if col_name not in existing_columns:
        print(f"Adding column {col_name} to axis_vehicles...")
        cursor.execute(f"ALTER TABLE axis_vehicles ADD COLUMN {col_name} {col_type};")

conn.commit()

# 2. Seed realistic photos and service/inspection data for existing vehicles
cursor.execute("SELECT id, make, model, year, license_plate, mileage, fleet_type FROM axis_vehicles")
vehicles = cursor.fetchall()

# Curated high-res automotive galleries (exterior, interior, wheel/detail)
car_galleries = {
    "G-Class G63 AMG": [
        "https://images.unsplash.com/photo-1520031441872-265e4ff70366?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80"
    ],
    "S-Class S500": [
        "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80"
    ],
    "GLE 350de": [
        "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=1200&q=80"
    ],
    "GLC 300": [
        "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1200&q=80"
    ],
    "BMW": [
        "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1523983388277-336a66bf9bcd?auto=format&fit=crop&w=1200&q=80"
    ],
    "Default": [
        "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80"
    ]
}

now = datetime.utcnow()

for v in vehicles:
    vid, make, model, year, plate, mileage, fleet_type = v
    
    # Pick gallery
    images_list = car_galleries.get(model)
    if not images_list:
        if "BMW" in make:
            images_list = car_galleries["BMW"]
        else:
            images_list = car_galleries["Default"]
            
    # Specs
    hp = 585 if "AMG" in model else (435 if "S500" in model or "M50i" in model else 280)
    specs = {
        "engine_power_hp": hp,
        "displacement_cc": 3982 if "G63" in model else 2999,
        "fuel_consumption_mixed": "11.2 l/100km" if "G63" in model else "7.8 l/100km",
        "transmission_gears": "9G-Tronic Automată" if "Mercedes" in make else "8-Speed Steptronic",
        "drivetrain": "4MATIC Permanent" if "Mercedes" in make else "xDrive AWD",
        "body_type": "SUV Premium" if ("G-Class" in model or "GLE" in model or "GLC" in model or "X" in model) else "Sedan Limuzină"
    }
    
    # Service history
    last_srv_km = max(0, mileage - 4500)
    service_history = [
        {
            "id": 1,
            "date": (now - timedelta(days=120)).strftime("%Y-%m-%d"),
            "service_type": "Revizie completă A (Ulei, Filtru aer/polen/combustibil)",
            "mileage": last_srv_km,
            "cost": 650.0,
            "provider": f"Service Autorizat {make} Băneasa",
            "notes": "Schimb lichid frână și inspecție tren rulare. Fără jocuri mecanice."
        }
    ]
    if mileage > 25000:
        service_history.append({
            "id": 2,
            "date": (now - timedelta(days=280)).strftime("%Y-%m-%d"),
            "service_type": "Înlocuire plăcuțe frână față/spate & geometrie roți",
            "mileage": max(0, last_srv_km - 15000),
            "cost": 820.0,
            "provider": f"Service Autorizat {make} Pipera",
            "notes": "Uzură normală. Sistem frânare recalibrat."
        })
        
    # High risk watchlist tag on 2 specific vehicles for demo
    is_high_risk = 1 if (vid in [1, 6]) else 0
    
    damage_notes = "Inspecție vizuală conformă. Mică ciupitură parbriz pe partea pasagerului retușată." if vid == 1 else "Fără daune sau zgârieturi. Tratament ceramic caroserie aplicat."
    casco_exp = (now + timedelta(days=180)).strftime("%Y-%m-%d %H:%M:%S")
    itp_exp = (now + timedelta(days=240)).strftime("%Y-%m-%d %H:%M:%S")
    rca_exp = (now + timedelta(days=120)).strftime("%Y-%m-%d %H:%M:%S")
    vignette_exp = (now + timedelta(days=90)).strftime("%Y-%m-%d %H:%M:%S")
    
    # Rental start km & contracted km
    rental_start_km = max(0, mileage - 1450)
    contracted_km = 3000
    
    cursor.execute("""
        UPDATE axis_vehicles 
        SET images = ?,
            specs = ?,
            service_history = ?,
            last_service_km = ?,
            last_service_date = ?,
            service_interval_km = 15000,
            casco_expiry = ?,
            itp_expiry = ?,
            insurance_expiry = ?,
            vignette_expiry = ?,
            damage_notes = ?,
            is_high_risk = ?,
            rental_start_km = ?,
            contracted_km_allowance = ?
        WHERE id = ?
    """, (
        json.dumps(images_list),
        json.dumps(specs),
        json.dumps(service_history),
        last_srv_km,
        (now - timedelta(days=120)).strftime("%Y-%m-%d %H:%M:%S"),
        casco_exp,
        itp_exp,
        rca_exp,
        vignette_exp,
        damage_notes,
        is_high_risk,
        rental_start_km,
        contracted_km,
        vid
    ))

conn.commit()
conn.close()
print("Migration and seed completed successfully!")
