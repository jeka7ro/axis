from sqlalchemy import Column, Integer, String, Boolean, Enum
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
