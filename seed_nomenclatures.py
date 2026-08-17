import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.app.database import SessionLocal
from backend.app.models.nomenclature import VehicleBrand, VehicleModel

VEHICLE_MODELS = {
  "Mercedes-Benz": ["G-Class G63 AMG", "S-Class S500", "GLE 350de", "GLC 300", "C-Class C200", "E-Class", "A-Class"],
  "BMW": ["X7 M50i", "X5 xDrive40i", "7 Series 750e", "5 Series 520d", "M4 Competition", "X3 xDrive30i", "3 Series"],
  "Audi": ["Q8 50 TDI", "Q7 55 TFSI", "A8 50 TDI", "A6 40 TDI", "RS e-tron GT", "Q5", "A4"],
  "Porsche": ["Cayenne", "Panamera", "Macan", "Taycan", "911 Carrera"],
  "Land Rover": ["Range Rover", "Range Rover Sport", "Defender", "Evoque"],
  "Lexus": ["RX 450h", "NX 350h", "ES 300h", "LS 500h"],
  "Tesla": ["Model S", "Model X", "Model Y", "Model 3"],
  "Volkswagen": ["Touareg", "Tiguan", "Passat", "Golf", "Arteon"],
  "Volvo": ["XC90", "XC60", "S90", "V90"]
}

def seed():
    db = SessionLocal()
    try:
        for brand_name, models in VEHICLE_MODELS.items():
            brand = db.query(VehicleBrand).filter(VehicleBrand.name == brand_name).first()
            if not brand:
                brand = VehicleBrand(name=brand_name)
                db.add(brand)
                db.commit()
                db.refresh(brand)
                print(f"Added brand: {brand_name}")
            
            for model_name in models:
                model = db.query(VehicleModel).filter(
                    VehicleModel.name == model_name, 
                    VehicleModel.brand_id == brand.id
                ).first()
                if not model:
                    model = VehicleModel(name=model_name, brand_id=brand.id)
                    db.add(model)
                    print(f"  Added model: {model_name}")
        db.commit()
        print("Done seeding nomenclatures!")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
