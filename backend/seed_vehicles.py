import random
import string
from datetime import datetime, timedelta
from app.database import SessionLocal
from app.models.vehicle import Vehicle, VehicleStatus

db = SessionLocal()

makes_models = [
    ("Mercedes-Benz", "G-Class G63 AMG"),
    ("Mercedes-Benz", "S-Class S500"),
    ("Mercedes-Benz", "GLE 350de"),
    ("Mercedes-Benz", "GLC 300"),
    ("Mercedes-Benz", "C-Class C200"),
    ("BMW", "X7 M50i"),
    ("BMW", "X5 xDrive40i"),
    ("BMW", "7 Series 750e"),
    ("BMW", "5 Series 520d"),
    ("BMW", "M4 Competition"),
    ("Audi", "Q8 50 TDI"),
    ("Audi", "Q7 45 TFSI"),
    ("Audi", "A8 50 TDI"),
    ("Audi", "A6 Avant"),
    ("Audi", "RS e-tron GT"),
    ("Porsche", "Cayenne S"),
    ("Porsche", "Panamera 4S"),
    ("Porsche", "Macan T"),
    ("Porsche", "Taycan 4S"),
    ("Land Rover", "Range Rover Sport")
]

colors = ["Negru Obsidian", "Alb Alpin", "Gri Selenit", "Albastru Tanzanit", "Roșu Carmeniu"]
transmissions = ["Automată (9G-Tronic)", "Automată (Steptronic)", "Automată (S tronic)", "Automată (PDK)"]
engines = ["Benzină", "Diesel", "PHEV", "Electric"]

for i, (make, model) in enumerate(makes_models):
    vin = "WBA" + "".join(random.choices(string.ascii_uppercase + string.digits, k=14))
    plate = f"B {random.randint(10, 999)} " + "".join(random.choices(string.ascii_uppercase, k=3))
    
    # ensure no unique constraints are broken if ran multiple times
    existing = db.query(Vehicle).filter((Vehicle.vin == vin) | (Vehicle.license_plate == plate)).first()
    if existing:
        continue
        
    v = Vehicle(
        make=make,
        model=model,
        year=random.randint(2022, 2024),
        vin=vin,
        license_plate=plate,
        status=random.choice(list(VehicleStatus)),
        mileage=random.randint(0, 50000),
        engine_type=random.choice(engines),
        transmission=random.choice(transmissions),
        color=random.choice(colors),
        features="Piele, Navigație, Scaune Încălzite, Asistență Parcare",
        purchase_price=random.uniform(50000, 150000),
        rental_price_short_term=random.uniform(100, 300),
        rental_price_long_term=random.uniform(1500, 4000),
        insurance_expiry=datetime.utcnow() + timedelta(days=random.randint(30, 365)),
        itp_expiry=datetime.utcnow() + timedelta(days=random.randint(30, 700)),
        vignette_expiry=datetime.utcnow() + timedelta(days=random.randint(10, 365))
    )
    db.add(v)

db.commit()
print("Vehiculele au fost adaugate in baza de date!")
