from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CampaignBase(BaseModel):
    name: str
    dealer_name: Optional[str] = None
    discounted_interest_rate: float
    standard_interest_rate: Optional[float] = 5.9
    min_advance_percent: Optional[float] = 15.0
    max_period_months: Optional[int] = 60
    subsidized_by: Optional[str] = "Dealer / Producător"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: Optional[bool] = True
    description: Optional[str] = None

class CampaignCreate(CampaignBase):
    pass

class CampaignResponse(CampaignBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
