from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Text, JSON, LargeBinary
from sqlalchemy.sql import func
from backend.shared.db.connections import Base


class Admin(Base):
    """
    Admin users who manage the entire system.
    Separate from users (customers) and partners.
    """
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    
    # Role: 'admin', 'super_admin'
    role = Column(String, nullable=False, default='admin')
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class PartnerVerificationHistory(Base):
    """
    Track multi-round verification conversations between admin and partner.
    Supports clarification loops.
    """
    __tablename__ = "partner_verification_history"

    id = Column(Integer, primary_key=True, index=True)
    partner_id = Column(Integer, ForeignKey("partners.id", ondelete="CASCADE"), nullable=False, index=True)
    action_by_admin_id = Column(Integer, ForeignKey("admins.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Action type: 'submitted', 'under_review', 'clarification_requested', 
    # 'clarification_provided', 'approved', 'rejected', 'suspended'
    action_type = Column(String, nullable=False, index=True)
    
    message_from_admin = Column(Text, nullable=True)
    message_from_partner = Column(Text, nullable=True)
    
    # Store document URLs/paths as JSON array
    documents_submitted = Column(JSON, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CreditPlan(Base):
    """
    Pre-defined credit packages partners can purchase.
    """
    __tablename__ = "credit_plans"

    id = Column(Integer, primary_key=True, index=True)
    plan_name = Column(String, nullable=False)
    credit_amount = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    bonus_percentage = Column(Float, nullable=False, default=0.0)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class PartnerCreditTransaction(Base):
    """
    Complete ledger of all credit movements for each partner.
    Tracks purchases, deductions, refunds, adjustments.
    """
    __tablename__ = "partner_credit_transactions"

    id = Column(Integer, primary_key=True, index=True)
    partner_id = Column(Integer, ForeignKey("partners.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Transaction type: 'credit_purchase', 'lead_purchase', 'refund', 'adjustment', 'bonus'
    transaction_type = Column(String, nullable=False, index=True)
    
    amount = Column(Float, nullable=False)  # Positive for credit, negative for debit
    balance_before = Column(Float, nullable=False)
    balance_after = Column(Float, nullable=False)
    
    # Reference to order or credit plan
    reference_id = Column(Integer, nullable=True)
    reference_type = Column(String, nullable=True)  # 'order', 'credit_plan', 'manual'
    
    # Payment details
    payment_method = Column(String, nullable=True)
    payment_transaction_id = Column(String, nullable=True)
    
    notes = Column(Text, nullable=True)
    created_by_admin_id = Column(Integer, ForeignKey("admins.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class PartnerPaymentRequest(Base):
    """
    Track partner payment requests for credit purchases via UPI QR.
    Partner submits transaction screenshot for verification.
    Admin reviews and approves/rejects the payment.
    """
    __tablename__ = "partner_payment_requests"

    id = Column(Integer, primary_key=True, index=True)
    partner_id = Column(Integer, ForeignKey("partners.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Credit plan details at time of request
    plan_id = Column(Integer, ForeignKey("credit_plans.id", ondelete="SET NULL"), nullable=True)
    credit_amount = Column(Float, nullable=False)
    payment_amount = Column(Float, nullable=False)
    bonus_percentage = Column(Float, nullable=False, default=0.0)
    
    # Payment proof: stored as file on disk, URL saved here
    payment_screenshot_url = Column(String, nullable=True)
    payment_screenshot_blob = Column(LargeBinary, nullable=True)  # kept for backward compat
    payment_screenshot_metadata = Column(JSON, nullable=True)  # {filename, content_type, size_bytes, captured_at}
    
    # Status: 'pending', 'approved', 'rejected'
    approval_status = Column(String, nullable=False, default='pending', index=True)
    
    # Admin approval/rejection details
    reviewed_by_admin_id = Column(Integer, ForeignKey("admins.id", ondelete="SET NULL"), nullable=True)
    approval_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AdminCreditConfiguration(Base):
    """
    Centralized configuration for credit calculation and system rules.
    """
    __tablename__ = "admin_credit_configuration"

    id = Column(Integer, primary_key=True, index=True)
    config_key = Column(String, unique=True, nullable=False, index=True)
    config_value = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    updated_by_admin_id = Column(Integer, ForeignKey("admins.id", ondelete="SET NULL"), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
