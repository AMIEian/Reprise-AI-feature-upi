from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime


# ================================
# PARTNER HOLD SCHEMAS
# ================================

class PartnerHoldCreate(BaseModel):
    """Schema for creating a partner hold"""
    reason: str = Field(..., min_length=10, max_length=1000)
    lift_date: Optional[datetime] = Field(None, description="Date when hold should auto-lift. If null, admin must lift manually")
    admin_decides_lift: bool = Field(False, description="If true, admin will decide when to lift. lift_date should be null")


class PartnerHoldOut(BaseModel):
    """Schema for partner hold response"""
    id: int
    partner_id: int
    reason: str
    hold_date: datetime
    lift_date: Optional[datetime]
    is_active: bool
    placed_by_admin_id: Optional[int]
    lifted_by_admin_id: Optional[int]
    lift_reason: Optional[str]
    lifted_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


class PartnerHoldStatus(BaseModel):
    """Schema for partner hold status check"""
    is_on_hold: bool
    hold_details: Optional[PartnerHoldOut] = None
    message: str


class LiftPartnerHoldRequest(BaseModel):
    """Schema for lifting a partner hold"""
    lift_reason: str = Field(..., min_length=5, max_length=500)


# ================================
# PARTNER SCHEMAS
# ================================

class PartnerApplicationCreate(BaseModel):
    """Schema for partner application (signup)"""
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(..., min_length=10, max_length=15)
    password: str = Field(..., min_length=8)
    company_name: str = Field(..., min_length=2, max_length=200)
    business_address: str = Field(..., min_length=10, max_length=500)
    udyam_id: Optional[str] = Field(None, min_length=19, max_length=19, pattern=r"^UDYAM-[A-Z]{2}-\d{2}-\d{7}$", description="Udyam Registration Number (e.g. UDYAM-XX-00-0000000)")
    pan_number: str = Field(..., min_length=10, max_length=10)
    serviceable_pincodes: List[str] = Field(..., min_items=1, description="List of pincodes the partner can service")


class PartnerLogin(BaseModel):
    """Schema for partner login"""
    email: EmailStr
    password: str


class PartnerOut(BaseModel):
    """Schema for partner response"""
    id: int
    email: str
    full_name: str
    phone: str
    company_name: Optional[str]
    business_address: Optional[str]
    udyam_id: Optional[str] = None
    pan_number: Optional[str]
    udyam_aadhar_image: Optional[str] = None
    verification_status: str
    rejection_reason: Optional[str] = None
    credit_balance: float
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PartnerCreditNameOut(BaseModel):
    """Schema for partner credit and name only"""
    email: str
    full_name: str
    phone: Optional[str] = None
    credit_balance: float
    verification_status: str
    rejection_reason: Optional[str] = None
    is_active: bool
    is_on_hold: bool = False
    hold_reason: Optional[str] = None
    hold_lift_date: Optional[datetime] = None
    serviceable_pincodes: List[str] = []

    model_config = {"from_attributes": True}


class PartnerToken(BaseModel):
    """Schema for partner authentication token"""
    access_token: str
    token_type: str = "bearer"
    partner: PartnerOut

# Minimal order summary for partner orders listing
class PartnerOrderBriefOut(BaseModel):
    id: int
    phone_name: str
    ram_gb: Optional[float] = None
    storage_gb: Optional[float] = None
    status: str
    ai_estimated_price: Optional[float] = None
    ai_reasoning: Optional[str] = None
    customer_name: Optional[str] = None
    agent_name: Optional[str] = None
    customer_condition_answers: Optional[dict] = None
    created_at: datetime
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    pickup_address_line: Optional[str] = None
    pickup_city: Optional[str] = None
    pickup_state: Optional[str] = None

    model_config = {"from_attributes": True}


class PaymentRequestCreate(BaseModel):
    """Schema for partner to request credit purchase with UPI payment"""
    plan_id: int
    credit_amount: float
    payment_amount: float
    bonus_percentage: float


class PaymentRequestOut(BaseModel):
    """Schema for payment request response"""
    id: int
    plan_id: Optional[int] = None
    credit_amount: float
    payment_amount: float
    bonus_percentage: float
    approval_status: str
    approval_notes: Optional[str] = None
    created_at: datetime
    reviewed_at: Optional[datetime] = None
    
    model_config = {"from_attributes": True}


class PaymentRequestWithScreenshot(BaseModel):
    """Schema for payment request with screenshot metadata"""
    id: int
    plan_id: Optional[int] = None
    credit_amount: float
    payment_amount: float
    bonus_percentage: float
    approval_status: str
    approval_notes: Optional[str] = None
    has_screenshot: bool
    created_at: datetime
    reviewed_at: Optional[datetime] = None
    
    model_config = {"from_attributes": True}


# ================================
# AGENT SCHEMAS
# ================================

class AgentCreate(BaseModel):
    """Schema for creating a new agent"""
    email: EmailStr
    phone: str = Field(..., min_length=10, max_length=15)
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2, max_length=100)
    employee_id: Optional[str] = None


class AgentUpdate(BaseModel):
    """Schema for updating agent details"""
    phone: Optional[str] = Field(None, min_length=10, max_length=15)
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    employee_id: Optional[str] = None
    is_active: Optional[bool] = None


class AgentOut(BaseModel):
    """Schema for agent response"""
    id: int
    partner_id: int
    email: str
    phone: str
    full_name: str
    employee_id: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AgentNameOut(BaseModel):
    """Schema for agent name and hold status"""
    full_name: str
    is_on_hold: bool = False
    hold_reason: Optional[str] = None
    hold_lift_date: Optional[datetime] = None
    is_self_assigned: bool = False

    model_config = {"from_attributes": True}


class AgentLogin(BaseModel):
    """Schema for agent login"""
    email: EmailStr
    password: str


class AgentToken(BaseModel):
    """Schema for agent authentication token"""
    access_token: str
    token_type: str = "bearer"
    agent: AgentOut


# ================================
# AGENT ORDER SCHEMAS
# ================================

class AgentOrderSummary(BaseModel):
    """Summary of order for agent dashboard"""
    order_id: int
    phone_name: str
    brand: str
    model: str
    condition: str
    quoted_price: float
    status: str
    customer_name: str
    customer_phone: str
    pickup_address: str
    pickup_date: Optional[str]
    pickup_time: Optional[str]
    assigned_at: Optional[datetime]
    accepted_at: Optional[datetime]
    
    model_config = {"from_attributes": True}


class SchedulePickupRequest(BaseModel):
    """Schema for scheduling pickup"""
    scheduled_date: str  # YYYY-MM-DD format
    scheduled_time: str  # HH:MM format
    notes: Optional[str] = None


class CompletePickupRequest(BaseModel):
    """Schema for completing pickup"""
    actual_condition: str = Field(..., description="Actual condition observed during pickup")
    final_offered_price: float = Field(..., ge=0, description="Final price offered to customer")
    customer_accepted: bool = Field(..., description="Whether customer accepted the offer")
    pickup_notes: Optional[str] = None
    payment_method: Optional[str] = Field(None, description="Cash/UPI/Bank Transfer")


class ProcessPaymentRequest(BaseModel):
    """Schema for processing payment"""
    payment_amount: float = Field(..., ge=0)
    payment_method: str = Field(..., description="Cash/UPI/Bank Transfer/Cheque")
    transaction_id: Optional[str] = None
    payment_notes: Optional[str] = None


class ReschedulePickupRequest(BaseModel):
    """Schema for rescheduling pickup"""
    new_date: str  # YYYY-MM-DD format
    new_time: str  # HH:MM format
    reschedule_reason: str = Field(..., min_length=5, max_length=500)
    notes: Optional[str] = None


class CancelPickupRequest(BaseModel):
    """Schema for canceling pickup"""
    cancellation_reason: str = Field(..., min_length=10, max_length=500)
    notes: Optional[str] = None


class AgentLocationUpdate(BaseModel):
    """Schema for updating agent location"""
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


# ================================
# PARTNER SELF-ASSIGNMENT SCHEMAS
# ================================

class PartnerSelfAssignRequest(BaseModel):
    """Schema for partner self-assigning as an agent"""
    email: Optional[EmailStr] = Field(None, description="Email for agent login (defaults to partner email)")
    phone: Optional[str] = Field(None, min_length=10, max_length=15, description="Phone number for agent (defaults to partner phone)")
    password: Optional[str] = Field(None, min_length=8, description="Password for agent login (defaults to partner password)")
    full_name: Optional[str] = Field(None, description="Agent full name (defaults to partner name)")
    employee_id: Optional[str] = Field(None, description="Optional employee ID")
    
    @field_validator('email', 'phone', 'password', 'full_name', 'employee_id', mode='before')
    @classmethod
    def empty_string_to_none(cls, v):
        """Convert empty strings to None so they won't trigger validation"""
        if isinstance(v, str) and v.strip() == '':
            return None
        return v
    
    class Config:
        # Allow empty strings to be treated as None
        validate_assignment = True

class PartnerSelfAssignResponse(BaseModel):
    """Response for partner self-assignment"""
    agent_id: int
    partner_id: int
    email: str
    phone: str
    full_name: str
    is_active: bool
    created_at: datetime
    message: str

    model_config = {"from_attributes": True}
