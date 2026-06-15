from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Text, JSON, event
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import TSVECTOR
from backend.shared.db.connections import Base, engine


class PhoneList(Base):
    __tablename__ = "phones_list"

    id = Column(Integer, primary_key=True, index=True)
    Brand = Column(String, nullable=False)
    Series = Column(String, nullable=False)
    Model = Column(String, nullable=False)
    Storage_Raw = Column(String, nullable=False)
    Original_Price = Column(Float, nullable=True)
    Selling_Price = Column(Float, nullable=False)
    RAM_GB = Column(Float, nullable=True)
    Internal_Storage_GB = Column(Float, nullable=False)
    # Combined lower‑case text used for trigram similarity searches
    search_text = Column(Text, nullable=True, index=True)
    # PostgreSQL tsvector used for full-text search
    search_vector = Column(TSVECTOR, nullable=True)

    # Image storage fields
    image_url = Column(String, nullable=True)  # Link to external image URL
    image_blob = Column(String, nullable=True)  # Base64 encoded image data or file path


# ============================================================================
# SQLAlchemy Events for Auto-Populating search_text
# ============================================================================

@event.listens_for(PhoneList, "before_insert")
def update_search_text_on_insert(mapper, connection, target):
    """
    Automatically populate search_text with lowercase Brand + Model
    before inserting a new row.
    """
    if target.Brand and target.Model:
        target.search_text = f"{target.Brand} {target.Model}".lower()


@event.listens_for(PhoneList, "before_update")
def update_search_text_on_update(mapper, connection, target):
    """
    Automatically update search_text with lowercase Brand + Model
    before updating a row.
    """
    if target.Brand and target.Model:
        target.search_text = f"{target.Brand} {target.Model}".lower()


class Order(Base):
    """
    Complete order model for phone selling with lead management.
    Supports customer orders, partner lead purchasing, and agent assignment.
    """
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign Keys
    customer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    partner_id = Column(Integer, ForeignKey("partners.id", ondelete="SET NULL"), nullable=True, index=True)
    agent_id = Column(Integer, ForeignKey("agents.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Phone Details
    phone_name = Column(String, nullable=False)
    brand = Column(String, nullable=True)
    model = Column(String, nullable=True)
    ram_gb = Column(Float, nullable=True)
    storage_gb = Column(Float, nullable=True)
    variant = Column(String, nullable=True)
    
    # AI Prediction Storage
    ai_estimated_price = Column(Float, nullable=True)
    ai_reasoning = Column(Text, nullable=True)
    customer_condition_answers = Column(JSON, nullable=True)
    final_quoted_price = Column(Float, nullable=False, default=0.0)
    
    # Customer/Pickup Details
    customer_name = Column(String, nullable=True)
    customer_phone = Column(String, nullable=True)
    customer_email = Column(String, nullable=True)
    pickup_address_line = Column(String, nullable=True)
    pickup_city = Column(String, nullable=True)
    pickup_state = Column(String, nullable=True)
    pickup_pincode = Column(String, nullable=True, index=True)
    pickup_date = Column(DateTime(timezone=True), nullable=True)
    pickup_time = Column(String, nullable=True)
    
    # Payment & Order Lifecycle
    payment_method = Column(String, nullable=True)
    status = Column(String, nullable=False, default="lead_created", index=True)
    
    # Lead Management
    lead_locked_at = Column(DateTime(timezone=True), nullable=True)
    lead_lock_expires_at = Column(DateTime(timezone=True), nullable=True)
    purchased_at = Column(DateTime(timezone=True), nullable=True)
    assigned_at = Column(DateTime(timezone=True), nullable=True)
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    cancellation_reason = Column(Text, nullable=True)
    
    # Pickup Completion Details
    actual_condition = Column(String, nullable=True)  # Condition observed by agent during pickup
    final_offered_price = Column(Float, nullable=True)  # Final price offered during pickup
    customer_accepted_offer = Column(Boolean, nullable=True)  # Whether customer accepted the offer
    pickup_notes = Column(Text, nullable=True)  # Agent's notes from pickup
    
    # Payment Processing
    payment_amount = Column(Float, nullable=True)  # Actual payment amount
    payment_transaction_id = Column(String, nullable=True)  # Transaction/reference ID
    payment_notes = Column(Text, nullable=True)  # Payment processing notes
    payment_processed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Legacy fields for backward compatibility
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Maps to customer_id
    condition = Column(String, nullable=True)  # Legacy condition field
    quoted_price = Column(Float, nullable=False, default=0.0)  # Maps to final_quoted_price
    phone_number = Column(String, nullable=True)  # Maps to customer_phone
    email = Column(String, nullable=True)  # Maps to customer_email
    address_line = Column(String, nullable=True)  # Maps to pickup_address_line
    city = Column(String, nullable=True)  # Maps to pickup_city
    state = Column(String, nullable=True)  # Maps to pickup_state
    pincode = Column(String, nullable=True)  # Maps to pickup_pincode
    agent_name = Column(String, nullable=True)  # Denormalized for quick access
    agent_phone = Column(String, nullable=True)  # Denormalized for quick access
    agent_email = Column(String, nullable=True)  # Denormalized for quick access
    
    # Implemented Coupon Logic
    coupon_id = Column(Integer, ForeignKey("coupons.id", ondelete="SET NULL"), nullable=True)
    coupon_code_applied = Column(String, nullable=True)
    coupon_bonus_amount = Column(Float, nullable=True, default=0.0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class OrderStatusHistory(Base):
    """
    Audit trail of all status changes for an order.
    """
    __tablename__ = "order_status_history"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    from_status = Column(String, nullable=True)
    to_status = Column(String, nullable=False)
    changed_by_user_type = Column(String, nullable=True)  # 'customer', 'partner', 'agent', 'admin', 'system'
    changed_by_user_id = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class LeadLock(Base):
    """
    Lead locking mechanism to prevent race conditions.
    One active lock per order at a time.
    """
    __tablename__ = "lead_locks"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    partner_id = Column(Integer, ForeignKey("partners.id", ondelete="CASCADE"), nullable=False, index=True)
    locked_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    is_active = Column(Boolean, default=True, index=True)


class Coupon(Base):
    """
    Coupons created by admins to give a bonus price for phones.
    """
    __tablename__ = "coupons"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    description = Column(String, nullable=True)
    amount = Column(Float, nullable=False, default=0.0)
    
    is_global = Column(Boolean, default=True)  # True = all phones, False = specific phone
    applicable_phone_id = Column(Integer, ForeignKey("phones_list.id", ondelete="CASCADE"), nullable=True)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# ensure tables exist
# Base.metadata.create_all(bind=engine)