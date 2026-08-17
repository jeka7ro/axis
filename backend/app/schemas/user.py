from pydantic import BaseModel, EmailStr
from typing import Optional
from ..models.user import RoleEnum

# Request schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: RoleEnum

class UserLogin(BaseModel):
    email: EmailStr
    password: str

# Response schemas
class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: RoleEnum
    is_active: bool

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
