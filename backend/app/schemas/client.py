from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from .user import UserResponse
from ..models.client import ClientType, RiskLevel

class EvaluationBase(BaseModel):
    score: int
    risk_level: RiskLevel
    ai_summary: str
    raw_financial_data: Optional[str] = None

class EvaluationResponse(EvaluationBase):
    id: int
    client_id: int
    created_at: datetime
    created_by_user_id: Optional[int]

    class Config:
        from_attributes = True

class ClientBase(BaseModel):
    type: ClientType
    name: str
    cui_cnp: str
    reg_com: Optional[str] = None
    address: Optional[str] = None
    representative_name: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    id_card_series: Optional[str] = None
    id_card_number: Optional[str] = None
    id_card_issued_by: Optional[str] = None
    id_card_valid_from: Optional[str] = None
    id_card_valid_until: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class ClientResponse(ClientBase):
    id: int
    created_at: datetime
    
    # AI Summary stats for the main table list view
    latest_score: Optional[int] = None
    latest_risk_level: Optional[RiskLevel] = None
    
    # Exclude detailed evaluations in the list view to save bandwidth
    class Config:
        from_attributes = True

class ClientDetailResponse(ClientResponse):
    evaluations: List[EvaluationResponse] = []

    class Config:
        from_attributes = True
