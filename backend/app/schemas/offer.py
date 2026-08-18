from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from .client import ClientResponse
from .vehicle import VehicleResponse
from ..models.offer import OfferStatus

class OfferBase(BaseModel):
    client_id: int
    vehicle_id: Optional[int] = None
    vehicle_make: str
    vehicle_model: str
    vehicle_price: float
    advance_percent: float
    period_months: int
    residual_value_percent: float
    interest_rate: float

class OfferCreate(OfferBase):
    pass

class OfferResponse(OfferBase):
    id: int
    monthly_rate: float
    status: OfferStatus
    created_at: datetime
    created_by_id: int
    approved_by_id: Optional[int] = None
    
    # Includem datele clientului pentru UI
    client: Optional[ClientResponse] = None
    
    contract: Optional['ContractResponse'] = None

    class Config:
        from_attributes = True

class ContractCreateRequest(BaseModel):
    vehicle_id: Optional[int] = None
    template_type: Optional[str] = 'standard'

class ContractResponse(BaseModel):
    id: int
    offer_id: int
    vehicle_id: Optional[int] = None
    contract_number: str
    status: str
    document_url: Optional[str]
    created_at: datetime

    vehicle: Optional[VehicleResponse] = None

    class Config:
        from_attributes = True

OfferResponse.model_rebuild()
ContractResponse.model_rebuild()
