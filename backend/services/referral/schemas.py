from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ReferralCodeOut(BaseModel):
    id: int
    code: str
    created_at: datetime
    expires_at: datetime
    is_active: bool

    model_config = {"from_attributes": True}


class ReferralCodeCreate(BaseModel):
    pass  # No input needed, code is generated server-side


class ReferralSettingsOut(BaseModel):
    id: int
    points_for_referrer: int
    points_for_new_user: int
    validity_days: int
    updated_at: datetime

    model_config = {"from_attributes": True}


class ReferralSettingsUpdate(BaseModel):
    points_for_referrer: Optional[int] = None
    points_for_new_user: Optional[int] = None
    validity_days: Optional[int] = None


class ReferralValidationResponse(BaseModel):
    valid: bool
    message: str
    referrer_name: Optional[str] = None


class ReferralRedeemRequest(BaseModel):
    referral_code: str


class UserReferralInfo(BaseModel):
    """Info about a user's referral points"""
    user_id: int
    referral_points: int
    referral_code: Optional[str] = None
    referral_code_expires_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
