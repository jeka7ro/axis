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
    currency: Optional[str] = "EUR"
    template_type: Optional[str] = "standard"
    
    # Dealer & Campaign fields
    dealer_name: Optional[str] = None
    created_by_role: Optional[str] = None
    campaign_id: Optional[int] = None
    campaign_name: Optional[str] = None

    # Fidejusor details
    fidejusor_name: Optional[str] = None
    fidejusor_cnp: Optional[str] = None
    fidejusor_address: Optional[str] = None
    fidejusor_id_card: Optional[str] = None
    fidejusor_quality: Optional[str] = None

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
    fidejusor_name: Optional[str] = None
    fidejusor_cnp: Optional[str] = None
    fidejusor_address: Optional[str] = None
    fidejusor_id_card: Optional[str] = None
    fidejusor_quality: Optional[str] = None

class ContractResponse(BaseModel):
    id: int
    offer_id: int
    vehicle_id: Optional[int] = None
    contract_number: str
    template_type: Optional[str] = 'standard'
    status: str
    document_url: Optional[str]
    created_at: datetime
    
    signed_client_at: Optional[datetime] = None
    signed_dealer_at: Optional[datetime] = None
    signed_axis_at: Optional[datetime] = None
    esign_envelope_id: Optional[str] = None
    esign_audit_log: Optional[str] = None

    fidejusor_name: Optional[str] = None
    fidejusor_cnp: Optional[str] = None
    fidejusor_address: Optional[str] = None
    fidejusor_id_card: Optional[str] = None
    fidejusor_quality: Optional[str] = None

    vehicle: Optional[VehicleResponse] = None

    class Config:
        from_attributes = True

OfferResponse.model_rebuild()
ContractResponse.model_rebuild()
