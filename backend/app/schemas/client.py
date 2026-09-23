from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime
from .user import UserResponse
from ..models.client import ClientType, RiskLevel

def _normalize_risk_level(v):
    if v is None:
        return None
    if isinstance(v, str):
        mapping = {
            "LOW": RiskLevel.LOW,
            "MEDIUM": RiskLevel.MEDIUM,
            "HIGH": RiskLevel.HIGH,
            "CRITICAL": RiskLevel.CRITICAL,
            "Scăzut": RiskLevel.LOW,
            "Mediu": RiskLevel.MEDIUM,
            "Ridicat": RiskLevel.HIGH,
            "Critic": RiskLevel.CRITICAL
        }
        return mapping.get(v, v)
    return v

class EvaluationBase(BaseModel):
    score: int
    risk_level: RiskLevel
    ai_summary: str
    raw_financial_data: Optional[str] = None

    @field_validator("risk_level", mode="before")
    @classmethod
    def parse_risk_level(cls, v):
        return _normalize_risk_level(v)

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
    representative_cnp: Optional[str] = None
    representative_address: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    id_card_series: Optional[str] = None
    id_card_number: Optional[str] = None
    id_card_issued_by: Optional[str] = None
    id_card_valid_from: Optional[str] = None
    id_card_valid_until: Optional[str] = None
    profile_photo: Optional[str] = None
    is_blacklisted: Optional[bool] = False
    blacklist_reason: Optional[str] = None
    blacklist_severity: Optional[str] = None
    blacklist_added_at: Optional[datetime] = None

class ClientCreate(ClientBase):
    pass

class ClientResponse(ClientBase):
    id: int
    created_at: datetime
    
    # AI Summary stats for the main table list view
    latest_score: Optional[int] = None
    latest_risk_level: Optional[RiskLevel] = None

    @field_validator("latest_risk_level", mode="before")
    @classmethod
    def parse_latest_risk_level(cls, v):
        return _normalize_risk_level(v)
    
    # Exclude detailed evaluations in the list view to save bandwidth
    class Config:
        from_attributes = True

class ClientDetailResponse(ClientResponse):
    evaluations: List[EvaluationResponse] = []

    class Config:
        from_attributes = True
