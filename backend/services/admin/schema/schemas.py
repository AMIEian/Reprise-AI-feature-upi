from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List
from datetime import datetime
import re
from enum import Enum




class SortOrder(str, Enum):
    asc = "asc"
    desc = "desc"


class OrderSortBy(str, Enum):
    created_at = "created_at"
    quoted_price = "quoted_price"
    status = "status"


# ============================================================================
# ADMIN AUTHENTICATION
# ============================================================================

class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str


class AdminOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    
    model_config = {"from_attributes": True}


class AdminToken(BaseModel):
    access_token: str
    token_type: str = "bearer"
    admin: AdminOut


class AdminCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "admin"  # 'admin' or 'super_admin'


class AdminUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


# ============================================================================
# PARTNER MANAGEMENT
# ============================================================================

class PartnerOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    phone: str
    company_name: Optional[str] = None
    business_address: Optional[str] = None
    udyam_id: Optional[str] = None
    pan_number: Optional[str] = None
    udyam_aadhar_image: Optional[str] = None
    verification_status: str
    rejection_reason: Optional[str] = None
    credit_balance: float
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}


class PartnerVerificationHistoryOut(BaseModel):
    id: int
    partner_id: int
    action_by_admin_id: Optional[int] = None
    action_type: str
    message_from_admin: Optional[str] = None
    message_from_partner: Optional[str] = None
    documents_submitted: Optional[dict] = None
    created_at: datetime
    
    model_config = {"from_attributes": True}


class PartnerServiceablePincodeOut(BaseModel):
    id: int
    partner_id: int
    pincode: str
    city: Optional[str] = None
    state: Optional[str] = None
    is_active: bool
    created_at: datetime
    
    model_config = {"from_attributes": True}


class AgentOut(BaseModel):
    """Schema for agent information in admin view"""
    id: int
    partner_id: int
    email: str
    phone: str
    full_name: str
    employee_id: Optional[str] = None
    is_active: bool
    created_at: datetime
    
    model_config = {"from_attributes": True}


class PartnerDetailsOut(BaseModel):
    partner: PartnerOut
    serviceable_pincodes: List[PartnerServiceablePincodeOut]
    verification_history: List[PartnerVerificationHistoryOut]
    agents: List[AgentOut]


class RequestClarificationRequest(BaseModel):
    message: str
    required_documents: Optional[List[str]] = None


class ApprovePartnerRequest(BaseModel):
    approval_notes: Optional[str] = None


class RejectPartnerRequest(BaseModel):
    rejection_reason: str


# ============================================================================
# CREDIT MANAGEMENT
# ============================================================================

class CreditPlanOut(BaseModel):
    id: int
    plan_name: str
    credit_amount: float
    price: float
    bonus_percentage: float
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    
    model_config = {"from_attributes": True}


class CreditPlanCreate(BaseModel):
    plan_name: str
    credit_amount: float
    price: float
    bonus_percentage: float = 0.0
    description: Optional[str] = None


class CreditPlanUpdate(BaseModel):
    plan_name: Optional[str] = None
    credit_amount: Optional[float] = None
    price: Optional[float] = None
    bonus_percentage: Optional[float] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class PartnerCreditTransactionOut(BaseModel):
    id: int
    partner_id: int
    transaction_type: str
    amount: float
    balance_before: float
    balance_after: float
    reference_id: Optional[int] = None
    reference_type: Optional[str] = None
    payment_method: Optional[str] = None
    payment_transaction_id: Optional[str] = None
    notes: Optional[str] = None
    created_by_admin_id: Optional[int] = None
    created_at: datetime
    
    model_config = {"from_attributes": True}


class AdjustCreditsRequest(BaseModel):
    amount: float
    notes: str


class PartnerPaymentRequestOut(BaseModel):
    id: int
    partner_id: int
    plan_id: Optional[int] = None
    credit_amount: float
    payment_amount: float
    bonus_percentage: float
    approval_status: str
    approval_notes: Optional[str] = None
    reviewed_by_admin_id: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}


class PartnerPaymentRequestDetailOut(BaseModel):
    id: int
    partner_id: int
    partner_email: str
    partner_name: str
    plan_id: Optional[int] = None
    credit_amount: float
    payment_amount: float
    bonus_percentage: float
    approval_status: str
    approval_notes: Optional[str] = None
    reviewed_by_admin_id: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    has_screenshot: bool
    
    model_config = {"from_attributes": True}


class ApprovePaymentRequest(BaseModel):
    approval_notes: Optional[str] = None


class RejectPaymentRequest(BaseModel):
    approval_notes: str


class AdminCreditConfigurationOut(BaseModel):
    id: int
    config_key: str
    config_value: str
    description: Optional[str] = None
    updated_by_admin_id: Optional[int] = None
    updated_at: datetime
    
    model_config = {"from_attributes": True}


class UpdateConfigRequest(BaseModel):
    config_value: str


# ============================================================================
# DASHBOARD & ANALYTICS
# ============================================================================

class DashboardStats(BaseModel):
    total_customers: int
    total_partners: int
    active_partners: int
    pending_verifications: int
    total_agents: int
    total_orders: int
    orders_by_status: dict
    total_revenue: float
    credits_in_circulation: float


# ============================================================================
# LEGACY SCHEMAS (for existing admin endpoints)
# ============================================================================

from backend.services.auth.schemas import UserBase

class AdminUserCreate(UserBase):
    password: str
    role: str = "customer"


class AdminUserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class AdminUserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    role: str

    model_config = {"from_attributes": True}


class AdminOrderOut(BaseModel):
    id: int
    phone_name: str
    customer_name: str
    partner_name: Optional[str] = None
    agent_name: Optional[str] = None
    status: str
    quoted_price: float
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AdminOrderPaginatedOut(BaseModel):
    items: List[AdminOrderOut]
    total: int
    page: int
    limit: int
    total_pages: int
    has_more: bool


# ============================================================================
# PHONE LIST MANAGEMENT
# ============================================================================

class PhoneListOut(BaseModel):
    id: int
    Brand: str
    Series: str
    Model: str
    Storage_Raw: str
    Original_Price: Optional[float] = None
    Selling_Price: float
    RAM_GB: Optional[float] = None
    Internal_Storage_GB: float
    image_url: Optional[str] = None
    
    model_config = {"from_attributes": True}


class PhoneListCreate(BaseModel):
    Brand: str
    Series: str
    Model: str
    Storage_Raw: str
    Original_Price: Optional[float] = None
    Selling_Price: float
    RAM_GB: Optional[float] = None
    Internal_Storage_GB: float
    image_url: Optional[str] = None


class PhoneListUpdate(BaseModel):
    Brand: Optional[str] = None
    Series: Optional[str] = None
    Model: Optional[str] = None
    Storage_Raw: Optional[str] = None
    Original_Price: Optional[float] = None
    Selling_Price: Optional[float] = None
    RAM_GB: Optional[float] = None
    Internal_Storage_GB: Optional[float] = None
    image_url: Optional[str] = None


class PhoneListPaginatedOut(BaseModel):
    items: List[PhoneListOut]
    total: int
    page: int
    limit: int
    total_pages: int
    
    model_config = {"from_attributes": True}


from backend.services.sell_phone.schema.schemas import OrderOut

# ============================================================================
# COUPON MANAGEMENT
# ============================================================================

class CouponOut(BaseModel):
    id: int
    code: str
    description: Optional[str] = None
    amount: float
    is_global: bool
    applicable_phone_id: Optional[int] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CouponCreate(BaseModel):
    code: str
    description: Optional[str] = None
    amount: float
    is_global: bool = True
    applicable_phone_id: Optional[int] = None


class CouponUpdate(BaseModel):
    code: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    is_global: Optional[bool] = None
    applicable_phone_id: Optional[int] = None
    is_active: Optional[bool] = None
