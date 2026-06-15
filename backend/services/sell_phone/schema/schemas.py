from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime


class OrderCreate(BaseModel):
    """
    Request schema for creating a new phone sell order.
    Customer provides phone details and condition answers for AI prediction.
    """
    # Phone/variant info
    phone_name: str
    brand: Optional[str] = None
    model: Optional[str] = None
    ram_gb: Optional[float] = None
    storage_gb: Optional[float] = None
    variant: Optional[str] = None
    
    # Customer condition answers for AI prediction
    customer_condition_answers: Optional[Dict[str, Any]] = None
    
    # Customer/pickup details (optional, can use from user profile)
    customer_name: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[EmailStr] = None
    address_line: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    pickup_date: Optional[datetime] = None
    pickup_time: Optional[str] = None
    payment_method: Optional[str] = None
    # Pricing (required)
    quoted_price: float = Field(..., gt=0, description="Quoted price for the phone")
    
    # Coupon (optional)
    coupon_code: Optional[str] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "phone_name": "iPhone 13 Pro",
                "brand": "Apple",
                "model": "13 Pro",
                "ram_gb": 6,
                "storage_gb": 256,
                "variant": "256GB",
                "customer_condition_answers": {
                    "screen_condition": "excellent",
                    "body_condition": "good",
                    "battery_health": "85%",
                    "functional_issues": [],
                    "accessories_included": ["charger", "box"],
                    "purchase_year": "2022",
                    "warranty_status": "expired"
                },
                "quoted_price": 50000,
                "customer_name": "John Doe",
                "phone_number": "+919876543210",
                "email": "john@example.com",
                "address_line": "Flat 12, Example Street",
                "city": "Mumbai",
                "state": "Maharashtra",
                "pincode": "400001",
                "payment_method": "upi"
            }
        }
    )


class OrderOut(BaseModel):
    """Response schema for order details"""
    id: int
    customer_id: Optional[int] = None
    partner_id: Optional[int] = None
    agent_id: Optional[int] = None
    
    # Phone details
    phone_name: str
    brand: Optional[str] = None
    model: Optional[str] = None
    ram_gb: Optional[float] = None
    storage_gb: Optional[float] = None
    variant: Optional[str] = None
    
    # AI Prediction
    ai_estimated_price: Optional[float] = None
    ai_reasoning: Optional[str] = None
    final_quoted_price: float
    
    # Deal completion
    final_offered_price: Optional[float] = None  # Price offered during pickup
    payment_amount: Optional[float] = None  # Actual payment amount processed
    
    # Customer/pickup details
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    pickup_address_line: Optional[str] = None
    pickup_city: Optional[str] = None
    pickup_state: Optional[str] = None
    pickup_pincode: Optional[str] = None
    pickup_date: Optional[datetime] = None
    pickup_time: Optional[str] = None
    
    # Payment & status
    payment_method: Optional[str] = None
    status: str
    
    # Lead management
    lead_locked_at: Optional[datetime] = None
    lead_lock_expires_at: Optional[datetime] = None
    purchased_at: Optional[datetime] = None
    assigned_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    
    # Agent info (denormalized)
    agent_name: Optional[str] = None
    agent_phone: Optional[str] = None
    agent_email: Optional[str] = None
    
    # Coupon details
    coupon_code_applied: Optional[str] = None
    coupon_bonus_amount: Optional[float] = None
    
    # Timestamps
    created_at: datetime
    updated_at: Optional[datetime] = None

    # Pydantic v2: allow constructing from ORM objects / attributes
    model_config = ConfigDict(from_attributes=True)


class OrderCreateResponse(BaseModel):
    """
    Enhanced order creation response with serviceability info.
    """
    order: OrderOut
    serviceable: bool
    serviceable_partners_count: int
    message: Optional[str] = None


class LeadSummary(BaseModel):
    """
    Summary of a lead for partner marketplace.
    Does not expose sensitive customer details.
    """
    order_id: int
    phone_name: str
    brand: Optional[str] = None
    model: Optional[str] = None
    quoted_price: float
    lead_cost: float
    pickup_pincode: str
    pickup_city: Optional[str] = None
    pickup_date: Optional[datetime] = None
    created_at: datetime
    is_locked: bool
    locked_by_me: bool


class LeadDetailResponse(BaseModel):
    """
    Detailed lead information shown after partner locks the lead.
    """
    order_id: int
    phone_name: str
    brand: Optional[str] = None
    model: Optional[str] = None
    ram_gb: Optional[float] = None
    storage_gb: Optional[float] = None
    variant: Optional[str] = None
    quoted_price: float
    lead_cost: float
    condition_answers: Optional[Dict[str, Any]] = None
    ai_reasoning: Optional[str] = None
    pickup_address: str
    pickup_pincode: str
    pickup_city: Optional[str] = None
    pickup_state: Optional[str] = None
    pickup_date: Optional[datetime] = None
    pickup_time: Optional[str] = None
    customer_phone: str
    locked_until: Optional[datetime] = None


class OrderCancel(BaseModel):
    """
    Request schema for cancelling an order.
    """
    reason: Optional[str] = Field(None, description="Reason for cancellation")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "reason": "Changed my mind about selling the phone"
            }
        }
    )


class OrderCancelResponse(BaseModel):
    """
    Response schema for order cancellation.
    """
    success: bool
    message: str
    order_id: int
    cancelled_at: datetime
    """Legacy schema for backward compatibility"""
    phone_name: str
    brand: Optional[str] = None
    model: Optional[str] = None
    ram_gb: Optional[float] = None
    storage_gb: Optional[float] = None
    variant: Optional[str] = None
    condition: Optional[str] = None
    quoted_price: float = 0.0
    customer_name: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[EmailStr] = None
    address_line: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    pickup_date: Optional[datetime] = None
    pickup_time: Optional[str] = None
    payment_method: Optional[str] = None


class CouponValidateRequest(BaseModel):
    code: str
    phone_id: Optional[int] = None


class CouponValidateResponse(BaseModel):
    valid: bool
    message: str
    amount: Optional[float] = None
