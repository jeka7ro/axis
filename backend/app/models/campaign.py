from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from datetime import datetime
from ..database import Base

class Campaign(Base):
    __tablename__ = "axis_campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    dealer_name = Column(String, nullable=True) # None = Toți dealerii / Toate rețelele
    discounted_interest_rate = Column(Float, nullable=False) # e.g. 3.9
    standard_interest_rate = Column(Float, default=5.9)
    min_advance_percent = Column(Float, default=15.0)
    max_period_months = Column(Integer, default=60)
    subsidized_by = Column(String, default="Dealer / Producător")
    start_date = Column(DateTime, default=datetime.utcnow)
    end_date = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
