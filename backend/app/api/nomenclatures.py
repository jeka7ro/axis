from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import nomenclature as models
from ..schemas import nomenclature as schemas

router = APIRouter(prefix="/api/nomenclatures", tags=["nomenclatures"])

# Brands
@router.get("/brands", response_model=List[schemas.VehicleBrandResponse])
def read_brands(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    brands = db.query(models.VehicleBrand).offset(skip).limit(limit).all()
    return brands

@router.post("/brands", response_model=schemas.VehicleBrandResponse)
def create_brand(brand: schemas.VehicleBrandCreate, db: Session = Depends(get_db)):
    db_brand = db.query(models.VehicleBrand).filter(models.VehicleBrand.name == brand.name).first()
    if db_brand:
        raise HTTPException(status_code=400, detail="Brand already exists")
    db_brand = models.VehicleBrand(name=brand.name)
    db.add(db_brand)
    db.commit()
    db.refresh(db_brand)
    return db_brand

@router.delete("/brands/{brand_id}")
def delete_brand(brand_id: int, db: Session = Depends(get_db)):
    db_brand = db.query(models.VehicleBrand).filter(models.VehicleBrand.id == brand_id).first()
    if not db_brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    db.delete(db_brand)
    db.commit()
    return {"ok": True}

# Models
@router.post("/brands/{brand_id}/models", response_model=schemas.VehicleModelResponse)
def create_model(brand_id: int, model: schemas.VehicleModelCreate, db: Session = Depends(get_db)):
    db_brand = db.query(models.VehicleBrand).filter(models.VehicleBrand.id == brand_id).first()
    if not db_brand:
        raise HTTPException(status_code=404, detail="Brand not found")
        
    db_model = db.query(models.VehicleModel).filter(
        models.VehicleModel.name == model.name,
        models.VehicleModel.brand_id == brand_id
    ).first()
    if db_model:
        raise HTTPException(status_code=400, detail="Model already exists for this brand")
        
    db_model = models.VehicleModel(name=model.name, brand_id=brand_id)
    db.add(db_model)
    db.commit()
    db.refresh(db_model)
    return db_model

@router.delete("/models/{model_id}")
def delete_model(model_id: int, db: Session = Depends(get_db)):
    db_model = db.query(models.VehicleModel).filter(models.VehicleModel.id == model_id).first()
    if not db_model:
        raise HTTPException(status_code=404, detail="Model not found")
    db.delete(db_model)
    db.commit()
    return {"ok": True}
