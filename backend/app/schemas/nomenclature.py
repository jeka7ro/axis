from pydantic import BaseModel
from typing import List, Optional

class VehicleModelBase(BaseModel):
    name: str

class VehicleModelCreate(VehicleModelBase):
    pass

class VehicleModelResponse(VehicleModelBase):
    id: int
    brand_id: int

    class Config:
        from_attributes = True

class VehicleBrandBase(BaseModel):
    name: str

class VehicleBrandCreate(VehicleBrandBase):
    pass

class VehicleBrandResponse(VehicleBrandBase):
    id: int
    models: List[VehicleModelResponse] = []

    class Config:
        from_attributes = True
