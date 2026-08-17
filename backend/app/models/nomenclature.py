from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base

class VehicleBrand(Base):
    __tablename__ = "axis_vehicle_brands"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)

    models = relationship("VehicleModel", back_populates="brand", cascade="all, delete-orphan")

class VehicleModel(Base):
    __tablename__ = "axis_vehicle_models"

    id = Column(Integer, primary_key=True, index=True)
    brand_id = Column(Integer, ForeignKey("axis_vehicle_brands.id"), nullable=False)
    name = Column(String, index=True, nullable=False)

    brand = relationship("VehicleBrand", back_populates="models")
