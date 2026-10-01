from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
from ..models.user import RoleEnum

# Request schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    invite_code: str
    role: Optional[RoleEnum] = None
    phone: Optional[str] = None
    gdpr_consent: Optional[bool] = True

class InvitationCreate(BaseModel):
    email: EmailStr
    full_name: str
    role: Optional[RoleEnum] = RoleEnum.dealer_sales

    @field_validator("role", mode="before")
    @classmethod
    def normalize_role(cls, v):
        if not v:
            return RoleEnum.dealer_sales
        if isinstance(v, RoleEnum):
            return v
        val_str = str(v).strip().lower()
        mapping = {
            "super_admin": RoleEnum.super_admin,
            "super admin": RoleEnum.super_admin,
            "axis_manager": RoleEnum.axis_manager,
            "axis manager": RoleEnum.axis_manager,
            "axis_analyst": RoleEnum.axis_analyst,
            "axis analyst": RoleEnum.axis_analyst,
            "dealer_manager": RoleEnum.dealer_manager,
            "dealer manager": RoleEnum.dealer_manager,
            "dealer_sales": RoleEnum.dealer_sales,
            "dealer sales": RoleEnum.dealer_sales,
        }
        return mapping.get(val_str, v)

class InvitationOut(BaseModel):
    id: int
    code: str
    email: str
    full_name: str
    role: RoleEnum
    created_by_name: Optional[str] = None
    is_used: bool
    used_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    registration_link: Optional[str] = None

    class Config:
        from_attributes = True

class InvitationValidateOut(BaseModel):
    valid: bool
    code: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[RoleEnum] = None
    message: str


    @field_validator("role", mode="before")
    @classmethod
    def normalize_role(cls, v):
        if not v:
            return RoleEnum.dealer_sales
        if isinstance(v, RoleEnum):
            return v
        val_str = str(v).strip().lower()
        mapping = {
            "super_admin": RoleEnum.super_admin,
            "super admin": RoleEnum.super_admin,
            "axis_manager": RoleEnum.axis_manager,
            "axis manager": RoleEnum.axis_manager,
            "axis_analyst": RoleEnum.axis_analyst,
            "axis analyst": RoleEnum.axis_analyst,
            "dealer_manager": RoleEnum.dealer_manager,
            "dealer manager": RoleEnum.dealer_manager,
            "dealer_sales": RoleEnum.dealer_sales,
            "dealer sales": RoleEnum.dealer_sales,
        }
        return mapping.get(val_str, v)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class SendTestEmailRequest(BaseModel):
    email: EmailStr
    full_name: Optional[str] = "Utilizator Axis"

# Response schemas
class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    role: RoleEnum
    is_active: bool
    phone: Optional[str] = None
    notifications_enabled: Optional[bool] = True
    email_alerts_enabled: Optional[bool] = True
    gdpr_consent: Optional[bool] = True
    gdpr_consent_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Optional[UserResponse] = None

class MessageResponse(BaseModel):
    message: str
    success: bool = True
    detail: Optional[str] = None
