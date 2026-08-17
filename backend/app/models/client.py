from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from ..database import Base

class ClientType(str, enum.Enum):
    PJ = "PJ"
    PF = "PF"

class RiskLevel(str, enum.Enum):
    LOW = "Scăzut"
    MEDIUM = "Mediu"
    HIGH = "Ridicat"
    CRITICAL = "Critic"

class Client(Base):
    __tablename__ = "axis_clients"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(Enum(ClientType), default=ClientType.PJ)
    name = Column(String, index=True, nullable=False)
    cui_cnp = Column(String, unique=True, index=True, nullable=False)
    reg_com = Column(String, nullable=True) # J...
    address = Column(String, nullable=True)
    representative_name = Column(String, nullable=True)
    representative_cnp = Column(String, nullable=True)
    representative_address = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    id_card_series = Column(String, nullable=True)
    id_card_number = Column(String, nullable=True)
    id_card_issued_by = Column(String, nullable=True)
    id_card_valid_from = Column(String, nullable=True)
    id_card_valid_until = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    evaluations = relationship("Evaluation", back_populates="client")

class Evaluation(Base):
    __tablename__ = "axis_evaluations"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("axis_clients.id"))
    score = Column(Integer, nullable=False) # 0-100
    risk_level = Column(Enum(RiskLevel), nullable=False)
    ai_summary = Column(Text, nullable=False)
    raw_financial_data = Column(Text, nullable=True) # JSON string
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by_user_id = Column(Integer, ForeignKey("axis_users.id"))

    client = relationship("Client", back_populates="evaluations")
