from pydantic import BaseModel, EmailStr, validator
from typing import Optional
import re

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    # New: optional pincode for customer
    pincode: Optional[str] = None
    
    @validator('phone')
    def validate_phone(cls, v):
        """Validate phone number format (10 digits for India)"""
        if v is not None and v.strip():
            # Remove all non-digit characters for validation
            digits_only = ''.join(filter(str.isdigit, v))
            if len(digits_only) != 10:
                raise ValueError('Phone number must contain exactly 10 digits')
        return v.strip() if v else None

class UserCreate(UserBase):
    password: str
    referral_code: Optional[str] = None  # Optional referral code during signup
    
    @validator('pincode')
    def validate_pincode(cls, v):
        """Validate pincode format (6 digits for India)"""
        if v is not None and v.strip():
            if not re.match(r'^\d{6}$', v.strip()):
                raise ValueError('Pincode must be exactly 6 digits')
        return v.strip() if v else v

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None
    # coords removed
    # New: allow updating pincode
    pincode: Optional[str] = None
    
    @validator('pincode')
    def validate_pincode(cls, v):
        """Validate pincode format (6 digits for India)"""
        if v is not None and v.strip():
            if not re.match(r'^\d{6}$', v.strip()):
                raise ValueError('Pincode must be exactly 6 digits')
        return v.strip() if v else v

class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    is_active: bool
    # New: include pincode in output
    pincode: Optional[str] = None
    referral_points: int = 0
    # Role inferred by backend: 'customer', 'agent', 'partner', 'admin'
    role: Optional[str] = None

    # Pydantic v2: use `model_config` to enable attribute access
    model_config = {"from_attributes": True}

# new: minimal response for /me
class FullNameOut(BaseModel):
    full_name: Optional[str] = None


# Profile output without exposing internal `id` field
class ProfileOut(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    is_active: bool
    pincode: Optional[str] = None
    referral_points: int = 0

    model_config = {"from_attributes": True}

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    user_id: int

class UserLogin(BaseModel):
    identifier: str  # email or phone
    password: str

class GoogleLogin(BaseModel):
    auth_code: str
    code_verifier: Optional[str] = None


class UserRegistrationResponse(BaseModel):
    """
    Enhanced registration response with pincode serviceability info.
    Informs customer if partners service their area.
    """
    user: UserOut
    serviceable: bool
    serviceable_partners_count: int = 0
    warning: Optional[str] = None
    
    model_config = {"from_attributes": True}
