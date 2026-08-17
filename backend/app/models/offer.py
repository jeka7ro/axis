from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from ..database import Base

class OfferStatus(str, enum.Enum):
    DRAFT = "Draft"
    PENDING_APPROVAL = "În Așteptare (Axis)"
    APPROVED = "Aprobat"
    REJECTED = "Respins"
    CONVERTED = "Transformat în Contract"

class ContractStatus(str, enum.Enum):
    GENERATED = "Generat"
    SIGNED_DEALER = "Semnat Dealer"
    SIGNED_CLIENT = "Semnat Client"
    SIGNED_AXIS = "Semnat Axis"
    ACTIVE = "Activ"

class Offer(Base):
    __tablename__ = "axis_offers"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("axis_clients.id"), nullable=False)
    vehicle_make = Column(String, nullable=False)
    vehicle_model = Column(String, nullable=False)
    vehicle_price = Column(Float, nullable=False)
    advance_percent = Column(Float, nullable=False) # e.g. 20.0
    period_months = Column(Integer, nullable=False)
    residual_value_percent = Column(Float, nullable=False, default=1.0)
    interest_rate = Column(Float, nullable=False, default=5.9)
    
    # Calculated fields
    monthly_rate = Column(Float, nullable=False)
    
    status = Column(Enum(OfferStatus), default=OfferStatus.DRAFT)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by_id = Column(Integer, ForeignKey("axis_users.id"))
    approved_by_id = Column(Integer, ForeignKey("axis_users.id"), nullable=True)

    client = relationship("Client")
    contract = relationship("Contract", back_populates="offer", uselist=False)

class Contract(Base):
    __tablename__ = "axis_contracts"

    id = Column(Integer, primary_key=True, index=True)
    offer_id = Column(Integer, ForeignKey("axis_offers.id"), unique=True, nullable=False)
    vehicle_id = Column(Integer, ForeignKey("axis_vehicles.id"), nullable=True) # Legătura cu mașina fizică
    contract_number = Column(String, unique=True, index=True, nullable=False)
    status = Column(Enum(ContractStatus), default=ContractStatus.GENERATED)
    document_url = Column(String, nullable=True) # Path to generated DOCX/PDF
    
    created_at = Column(DateTime, default=datetime.utcnow)
    signed_client_at = Column(DateTime, nullable=True)
    signed_dealer_at = Column(DateTime, nullable=True)
    signed_axis_at = Column(DateTime, nullable=True)

    offer = relationship("Offer", back_populates="contract")
    vehicle = relationship("Vehicle")
