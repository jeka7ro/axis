from sqlalchemy import Column, Integer, String, Boolean, Enum, DateTime
from datetime import datetime
import enum
from ..database import Base

class RoleEnum(str, enum.Enum):
    super_admin = "Super Admin"
    axis_manager = "Axis Manager"
    axis_analyst = "Axis Analyst"
    dealer_manager = "Dealer Manager"
    dealer_sales = "Dealer Sales"

class User(Base):
    __tablename__ = "axis_users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(Enum(RoleEnum), default=RoleEnum.dealer_sales)
    is_active = Column(Boolean, default=True)
    
    # Password Reset & Verification
    reset_token = Column(String, nullable=True, index=True)
    reset_token_expiry = Column(DateTime, nullable=True)
    
    # Profile & Contact
    phone = Column(String, nullable=True)
    notifications_enabled = Column(Boolean, default=True)
    email_alerts_enabled = Column(Boolean, default=True)
    # GDPR & Romanian Data Protection Compliance
    gdpr_consent = Column(Boolean, default=True)
    gdpr_consent_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

class Invitation(Base):
    __tablename__ = "axis_invitations"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), default=RoleEnum.dealer_sales)
    created_by_user_id = Column(Integer, nullable=True)
    created_by_name = Column(String, nullable=True)
    is_used = Column(Boolean, default=False)
    used_at = Column(DateTime, nullable=True)
    used_by_user_id = Column(Integer, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

