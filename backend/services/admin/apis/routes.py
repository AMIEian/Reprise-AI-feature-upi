from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile
from sqlalchemy.orm import Session, load_only
from sqlalchemy import func, desc, text
from typing import Optional, List
from datetime import datetime, timezone
import os
import uuid


def _sync_search_vector(db: Session, phone_id: int, brand: str, series: str, model: str, storage: str) -> None:
    """Populate the PostgreSQL tsvector search_vector column for a phone row."""
    content = f"{brand} {series} {model} {storage}"
    db.execute(
        text(
            "UPDATE phones_list "
            "SET search_vector = to_tsvector('english', :content) "
            "WHERE id = :id"
        ),
        {"content": content, "id": phone_id},
    )
    db.commit()
from backend.shared.db.connections import get_db
from backend.services.auth import models as auth_models, utils as auth_utils
from backend.services.sell_phone.schema import models as sell_models
from backend.services.partner.schema.models import Partner, PartnerServiceablePincode
from backend.services.partner import utils as partner_utils
from backend.services.admin.schema.models import (
    Admin, PartnerVerificationHistory, CreditPlan, 
    PartnerCreditTransaction, AdminCreditConfiguration, PartnerPaymentRequest
)
from backend.services.admin.utils.utils import (
    verify_password, create_admin_access_token, get_current_admin, 
    require_super_admin, get_password_hash
)
from backend.services.admin.utils import image_handler
from backend.services.admin.schema.schemas import (
    # Admin auth
    AdminLoginRequest, AdminToken, AdminOut, AdminCreate, AdminUpdate,
    # Partner management
    PartnerOut, PartnerDetailsOut, PartnerVerificationHistoryOut,
    PartnerServiceablePincodeOut, RequestClarificationRequest,
    ApprovePartnerRequest, RejectPartnerRequest,
    # Credit management
    CreditPlanOut, CreditPlanCreate, CreditPlanUpdate,
    PartnerCreditTransactionOut, AdjustCreditsRequest,
    AdminCreditConfigurationOut, UpdateConfigRequest,
    PartnerPaymentRequestDetailOut, ApprovePaymentRequest, RejectPaymentRequest,
    # Dashboard
    DashboardStats,
    # Phone List
    PhoneListOut, PhoneListCreate, PhoneListUpdate, PhoneListPaginatedOut,
    # Legacy
    AdminUserCreate, AdminUserUpdate, AdminUserOut, AdminOrderOut,
    AdminOrderPaginatedOut, OrderSortBy, SortOrder,
)
from backend.services.partner.schema.schemas import (
    PartnerHoldCreate, PartnerHoldOut, PartnerHoldStatus, LiftPartnerHoldRequest
)

router = APIRouter(prefix="/admin", tags=["Admin"])


# ============================================================================
# ADMIN AUTHENTICATION
# ============================================================================

@router.post("/auth/login", response_model=AdminToken)
def admin_login(payload: AdminLoginRequest, db: Session = Depends(get_db)):
    """
    Admin login endpoint.
    Returns JWT token with admin_id and user_type='admin'.
    """
    admin = db.query(Admin).filter(Admin.email == payload.email).first()
    
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect credentials"
        )
    
    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin account is inactive"
        )
    
    if not verify_password(payload.password, admin.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect credentials"
        )
    
    token = create_admin_access_token(data={"admin_id": admin.id})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "admin": admin
    }


@router.get("/auth/me", response_model=AdminOut)
def get_current_admin_profile(current_admin: Admin = Depends(get_current_admin)):
    """Get current admin profile"""
    return current_admin


@router.post("/auth/admins", response_model=AdminOut, status_code=201)
def create_admin(
    payload: AdminCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(require_super_admin)
):
    """
    Create new admin (super_admin only).
    """
    existing = db.query(Admin).filter(Admin.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Admin with this email already exists")
    
    hashed_password = get_password_hash(payload.password)
    admin = Admin(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hashed_password,
        role=payload.role,
        is_active=True
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


# ============================================================================
# PARTNER VERIFICATION MANAGEMENT
# ============================================================================

@router.get("/partners/pending-verification", response_model=List[PartnerOut])
def get_pending_verifications(
    verification_status: Optional[str] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Get partners pending verification or in clarification.
    """
    query = db.query(Partner)
    
    if verification_status:
        query = query.filter(Partner.verification_status == verification_status)
    else:
        # Default: show all non-approved partners
        query = query.filter(Partner.verification_status != 'approved')
    
    total = query.count()
    partners = query.order_by(desc(Partner.created_at)).offset((page - 1) * limit).limit(limit).all()
    
    return partners


@router.get("/partners/{partner_id}/verification-details", response_model=PartnerDetailsOut)
def get_partner_verification_details(
    partner_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Get complete partner details including verification history, pincodes, and agents.
    """
    from backend.services.partner.schema.models import Agent
    
    partner = db.query(Partner).filter(Partner.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    pincodes = db.query(PartnerServiceablePincode).filter(
        PartnerServiceablePincode.partner_id == partner_id
    ).all()
    
    history = db.query(PartnerVerificationHistory).filter(
        PartnerVerificationHistory.partner_id == partner_id
    ).order_by(PartnerVerificationHistory.created_at).all()
    
    agents = db.query(Agent).filter(
        Agent.partner_id == partner_id
    ).order_by(Agent.created_at.desc()).all()
    
    return {
        "partner": partner,
        "serviceable_pincodes": pincodes,
        "verification_history": history,
        "agents": agents
    }


@router.post("/partners/{partner_id}/request-clarification", response_model=dict)
def request_partner_clarification(
    partner_id: int,
    payload: RequestClarificationRequest,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Request additional information from partner.
    """
    partner = db.query(Partner).filter(Partner.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    # Update partner status
    partner.verification_status = 'clarification_needed'
    
    # Create verification history entry
    history_entry = PartnerVerificationHistory(
        partner_id=partner_id,
        action_by_admin_id=current_admin.id,
        action_type='clarification_requested',
        message_from_admin=payload.message,
        documents_submitted={"required_documents": payload.required_documents} if payload.required_documents else None
    )
    
    db.add(partner)
    db.add(history_entry)
    db.commit()
    
    # TODO: Create notification for partner
    
    return {
        "status": "success",
        "message": "Clarification requested",
        "partner_id": partner_id,
        "verification_status": partner.verification_status
    }


@router.post("/partners/{partner_id}/approve", response_model=dict)
def approve_partner(
    partner_id: int,
    payload: ApprovePartnerRequest,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Approve partner verification.
    Can be used to approve pending partners or re-approve rejected partners.
    When re-approving a rejected partner, clears the rejection reason and activates the account.
    """
    partner = db.query(Partner).filter(Partner.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    # Update partner status
    partner.verification_status = 'approved'
    partner.is_active = True
    partner.rejection_reason = None  # Clear rejection reason when re-approving
    
    # Create verification history entry
    history_entry = PartnerVerificationHistory(
        partner_id=partner_id,
        action_by_admin_id=current_admin.id,
        action_type='approved',
        message_from_admin=payload.approval_notes
    )
    
    db.add(partner)
    db.add(history_entry)
    db.commit()
    
    # TODO: Create notification for partner
    
    return {
        "status": "success",
        "message": "Partner approved",
        "partner_id": partner_id,
        "verification_status": partner.verification_status,
        "is_active": partner.is_active
    }


@router.post("/partners/{partner_id}/reject", response_model=dict)
def reject_partner(
    partner_id: int,
    payload: RejectPartnerRequest,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Reject partner verification.
    Sets verification_status to 'rejected' and deactivates the partner account.
    Partner can still login but cannot access partner features until reapproved.
    """
    partner = db.query(Partner).filter(Partner.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    # Update partner status - set to rejected and deactivate
    partner.verification_status = 'rejected'
    partner.rejection_reason = payload.rejection_reason
    partner.is_active = False  # Deactivate the account
    
    # Create verification history entry
    history_entry = PartnerVerificationHistory(
        partner_id=partner_id,
        action_by_admin_id=current_admin.id,
        action_type='rejected',
        message_from_admin=payload.rejection_reason
    )
    
    db.add(partner)
    db.add(history_entry)
    db.commit()
    
    # TODO: Create notification for partner
    
    return {
        "status": "success",
        "message": "Partner rejected",
        "partner_id": partner_id,
        "verification_status": partner.verification_status,
        "is_active": partner.is_active
    }


# ============================================================================
# PARTNER HOLD MANAGEMENT
# ============================================================================

@router.post("/partners/{partner_id}/hold", response_model=PartnerHoldOut)
def place_partner_hold(
    partner_id: int,
    payload: PartnerHoldCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Place a partner on hold for rule violations.
    Partner cannot access leads or agents cannot perform actions while on hold.
    """
    try:
        hold = partner_utils.place_partner_hold(
            db=db,
            partner_id=partner_id,
            reason=payload.reason,
            lift_date=payload.lift_date,
            admin_id=current_admin.id
        )
        return hold
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/partners/{partner_id}/hold-status", response_model=PartnerHoldStatus)
def get_partner_hold_status(
    partner_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Get current hold status of a partner.
    """
    partner = db.query(Partner).filter(Partner.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    hold = partner_utils.get_partner_hold_details(db, partner_id)
    
    if not hold:
        return PartnerHoldStatus(
            is_on_hold=False,
            hold_details=None,
            message="Partner is not on hold"
        )
    
    return PartnerHoldStatus(
        is_on_hold=True,
        hold_details=hold,
        message=f"Partner on hold until {hold.lift_date}" if hold.lift_date else "Partner on indefinite hold"
    )


@router.post("/partners/{partner_id}/lift-hold", response_model=dict)
def lift_partner_hold_endpoint(
    partner_id: int,
    payload: LiftPartnerHoldRequest,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Lift a hold from a partner.
    """
    try:
        hold = partner_utils.lift_partner_hold(
            db=db,
            partner_id=partner_id,
            lift_reason=payload.lift_reason,
            admin_id=current_admin.id
        )
        return {
            "status": "success",
            "message": "Partner hold lifted successfully",
            "partner_id": partner_id,
            "hold_id": hold.id,
            "lifted_at": hold.lifted_at
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# CREDIT MANAGEMENT
# ============================================================================

@router.get("/credit-plans", response_model=List[CreditPlanOut])
def get_credit_plans(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Get all credit plans"""
    return db.query(CreditPlan).order_by(CreditPlan.credit_amount).all()


@router.post("/credit-plans", response_model=CreditPlanOut, status_code=201)
def create_credit_plan(
    payload: CreditPlanCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Create new credit plan"""
    plan = CreditPlan(
        plan_name=payload.plan_name,
        credit_amount=payload.credit_amount,
        price=payload.price,
        bonus_percentage=payload.bonus_percentage,
        description=payload.description,
        is_active=True
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.put("/credit-plans/{plan_id}", response_model=CreditPlanOut)
def update_credit_plan(
    plan_id: int,
    payload: CreditPlanUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Update credit plan"""
    plan = db.query(CreditPlan).filter(CreditPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Credit plan not found")
    
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(plan, field, value)
    
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.delete("/credit-plans/{plan_id}")
def delete_credit_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Soft delete credit plan (set is_active=False)"""
    plan = db.query(CreditPlan).filter(CreditPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Credit plan not found")
    
    plan.is_active = False
    db.add(plan)
    db.commit()
    
    return {"message": "Credit plan deactivated"}


@router.post("/partners/{partner_id}/adjust-credits", response_model=dict)
def adjust_partner_credits(
    partner_id: int,
    payload: AdjustCreditsRequest,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Manual credit adjustment (add or deduct).
    Amount can be positive (add) or negative (deduct).
    """
    partner = db.query(Partner).filter(Partner.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    balance_before = partner.credit_balance
    new_balance = balance_before + payload.amount
    
    if new_balance < 0:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance. Current: {balance_before}, Requested: {payload.amount}"
        )
    
    # Update partner balance
    partner.credit_balance = new_balance
    
    # Create transaction record
    transaction = PartnerCreditTransaction(
        partner_id=partner_id,
        transaction_type='adjustment',
        amount=payload.amount,
        balance_before=balance_before,
        balance_after=new_balance,
        reference_type='manual',
        notes=payload.notes,
        created_by_admin_id=current_admin.id
    )
    
    db.add(partner)
    db.add(transaction)
    db.commit()
    
    return {
        "status": "success",
        "message": "Credits adjusted",
        "partner_id": partner_id,
        "amount": payload.amount,
        "new_balance": new_balance,
        "transaction_id": transaction.id
    }


@router.get("/partners/{partner_id}/transactions", response_model=List[PartnerCreditTransactionOut])
def get_partner_transactions(
    partner_id: int,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Get partner credit transaction history"""
    partner = db.query(Partner).filter(Partner.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    transactions = db.query(PartnerCreditTransaction).filter(
        PartnerCreditTransaction.partner_id == partner_id
    ).order_by(desc(PartnerCreditTransaction.created_at)).offset((page - 1) * limit).limit(limit).all()
    
    return transactions


# ============================================================================
# PAYMENT REQUEST MANAGEMENT
# ============================================================================

@router.get("/payment-requests", response_model=List[PartnerPaymentRequestDetailOut])
def get_payment_requests(
    approval_status: Optional[str] = Query(None, description="Filter by status: pending, approved, rejected"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Get all partner payment requests with optional status filter"""
    query = db.query(PartnerPaymentRequest)
    
    if approval_status:
        query = query.filter(PartnerPaymentRequest.approval_status == approval_status)
    
    requests = query.order_by(desc(PartnerPaymentRequest.created_at)).offset((page - 1) * limit).limit(limit).all()
    
    # Format response with partner details
    result = []
    for req in requests:
        partner = db.query(Partner).filter(Partner.id == req.partner_id).first()
        if partner:
            result.append(PartnerPaymentRequestDetailOut(
                id=req.id,
                partner_id=req.partner_id,
                partner_email=partner.email,
                partner_name=partner.full_name,
                plan_id=req.plan_id,
                credit_amount=req.credit_amount,
                payment_amount=req.payment_amount,
                bonus_percentage=req.bonus_percentage,
                approval_status=req.approval_status,
                approval_notes=req.approval_notes,
                reviewed_by_admin_id=req.reviewed_by_admin_id,
                reviewed_at=req.reviewed_at,
                created_at=req.created_at,
                has_screenshot=bool(req.payment_screenshot_url)
            ))
    
    return result


@router.get("/payment-requests/{request_id}", response_model=PartnerPaymentRequestDetailOut)
def get_payment_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Get specific payment request details"""
    req = db.query(PartnerPaymentRequest).filter(PartnerPaymentRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Payment request not found")
    
    partner = db.query(Partner).filter(Partner.id == req.partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    return PartnerPaymentRequestDetailOut(
        id=req.id,
        partner_id=req.partner_id,
        partner_email=partner.email,
        partner_name=partner.full_name,
        plan_id=req.plan_id,
        credit_amount=req.credit_amount,
        payment_amount=req.payment_amount,
        bonus_percentage=req.bonus_percentage,
        approval_status=req.approval_status,
        approval_notes=req.approval_notes,
        reviewed_by_admin_id=req.reviewed_by_admin_id,
        reviewed_at=req.reviewed_at,
        created_at=req.created_at,
        has_screenshot=bool(req.payment_screenshot_url)
    )


@router.get("/payment-requests/{request_id}/screenshot")
def get_payment_screenshot(
    request_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Get payment screenshot URL for a request"""
    req = db.query(PartnerPaymentRequest).filter(PartnerPaymentRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Payment request not found")
    
    if not req.payment_screenshot_url:
        raise HTTPException(status_code=404, detail="Screenshot not found")
    
    return {
        "url": req.payment_screenshot_url
    }


@router.post("/payment-requests/{request_id}/approve", response_model=dict)
def approve_payment_request(
    request_id: int,
    payload: ApprovePaymentRequest,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Approve a payment request and add credits to partner"""
    req = db.query(PartnerPaymentRequest).filter(PartnerPaymentRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Payment request not found")
    
    if req.approval_status != 'pending':
        raise HTTPException(status_code=400, detail=f"Request already {req.approval_status}")
    
    partner = db.query(Partner).filter(Partner.id == req.partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    # Update request status
    req.approval_status = 'approved'
    req.reviewed_by_admin_id = current_admin.id
    req.reviewed_at = datetime.now(timezone.utc)
    req.approval_notes = payload.approval_notes
    
    # Add credits to partner
    balance_before = partner.credit_balance
    total_credits = req.credit_amount + (req.credit_amount * req.bonus_percentage / 100.0)
    partner.credit_balance = (partner.credit_balance or 0.0) + total_credits
    balance_after = partner.credit_balance
    
    # Create transaction record
    transaction = PartnerCreditTransaction(
        partner_id=partner.id,
        transaction_type='credit_purchase',
        amount=total_credits,
        balance_before=balance_before,
        balance_after=balance_after,
        reference_id=req.id,
        reference_type='payment_request',
        payment_method='upi',
        payment_transaction_id=f"PR-{req.id}",
        notes=f"UPI payment approved for {req.credit_amount} credits",
        created_by_admin_id=current_admin.id
    )
    
    db.add(req)
    db.add(partner)
    db.add(transaction)
    db.commit()
    
    return {
        "status": "success",
        "message": "Payment approved and credits added",
        "request_id": request_id,
        "credits_added": total_credits,
        "new_balance": balance_after
    }


@router.post("/payment-requests/{request_id}/reject", response_model=dict)
def reject_payment_request(
    request_id: int,
    payload: RejectPaymentRequest,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Reject a payment request"""
    req = db.query(PartnerPaymentRequest).filter(PartnerPaymentRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Payment request not found")
    
    if req.approval_status != 'pending':
        raise HTTPException(status_code=400, detail=f"Request already {req.approval_status}")
    
    # Update request status
    req.approval_status = 'rejected'
    req.reviewed_by_admin_id = current_admin.id
    req.reviewed_at = datetime.now(timezone.utc)
    req.approval_notes = payload.approval_notes
    
    db.add(req)
    db.commit()
    
    return {
        "status": "success",
        "message": "Payment request rejected",
        "request_id": request_id,
        "reason": payload.approval_notes
    }


# ============================================================================
# SYSTEM CONFIGURATION
# ============================================================================

@router.get("/config", response_model=List[AdminCreditConfigurationOut])
def get_system_config(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Get all system configuration"""
    return db.query(AdminCreditConfiguration).all()


@router.put("/config/{config_key}", response_model=dict)
def update_system_config(
    config_key: str,
    payload: UpdateConfigRequest,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Update system configuration value"""
    config = db.query(AdminCreditConfiguration).filter(
        AdminCreditConfiguration.config_key == config_key
    ).first()
    
    if not config:
        raise HTTPException(status_code=404, detail="Configuration key not found")
    
    config.config_value = payload.config_value
    config.updated_by_admin_id = current_admin.id
    
    db.add(config)
    db.commit()
    
    return {
        "status": "success",
        "message": "Configuration updated",
        "config_key": config_key,
        "config_value": config.config_value
    }


@router.post("/config", response_model=AdminCreditConfigurationOut, status_code=201)
def create_system_config(
    config_key: str,
    config_value: str,
    description: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Create new system configuration"""
    existing = db.query(AdminCreditConfiguration).filter(
        AdminCreditConfiguration.config_key == config_key
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Configuration key already exists")
    
    config = AdminCreditConfiguration(
        config_key=config_key,
        config_value=config_value,
        description=description,
        updated_by_admin_id=current_admin.id
    )
    
    db.add(config)
    db.commit()
    db.refresh(config)
    return config


# ============================================================================
# DASHBOARD & ANALYTICS
# ============================================================================

@router.get("/dashboard/stats", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Get dashboard statistics"""
    
    # Count customers
    total_customers = db.query(auth_models.User).count()
    
    # Count partners
    total_partners = db.query(Partner).count()
    active_partners = db.query(Partner).filter(
        Partner.verification_status == 'approved',
        Partner.is_active == True
    ).count()
    pending_verifications = db.query(Partner).filter(
        Partner.verification_status.in_(['pending', 'under_review', 'clarification_needed'])
    ).count()
    
    # Count agents (will be implemented in next phase)
    total_agents = 0  # TODO: Implement when agent model is ready
    
    # Count orders
    total_orders = db.query(sell_models.Order).count()
    
    # Orders by status
    status_counts = db.query(
        sell_models.Order.status,
        func.count(sell_models.Order.id)
    ).group_by(sell_models.Order.status).all()
    
    orders_by_status = {status: count for status, count in status_counts}
    
    # Calculate revenue (sum of all lead purchases)
    total_revenue = db.query(
        func.coalesce(func.sum(-PartnerCreditTransaction.amount), 0)
    ).filter(
        PartnerCreditTransaction.transaction_type == 'lead_purchase'
    ).scalar() or 0.0
    
    # Credits in circulation (sum of all partner balances)
    credits_in_circulation = db.query(
        func.coalesce(func.sum(Partner.credit_balance), 0)
    ).scalar() or 0.0
    
    return {
        "total_customers": total_customers,
        "total_partners": total_partners,
        "active_partners": active_partners,
        "pending_verifications": pending_verifications,
        "total_agents": total_agents,
        "total_orders": total_orders,
        "orders_by_status": orders_by_status,
        "total_revenue": float(total_revenue),
        "credits_in_circulation": float(credits_in_circulation)
    }


@router.get("/partners", response_model=List[PartnerOut])
def list_all_partners(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    verification_status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """List all partners with optional filtering"""
    query = db.query(Partner)
    
    if verification_status:
        query = query.filter(Partner.verification_status == verification_status)
    
    partners = query.order_by(desc(Partner.created_at)).offset((page - 1) * limit).limit(limit).all()
    return partners


# ============================================================================
# LEGACY ENDPOINTS (for existing admin UI)
# ============================================================================

@router.get("/users", response_model=list[AdminUserOut])
def list_users(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """
    List users — only load fields required by the admin UI to avoid fetching everything.
    """
    users = db.query(auth_models.User).options(
        load_only(
            auth_models.User.id,
            auth_models.User.email,
            auth_models.User.full_name,
        )
    ).all()

    # auth_models.User does not have a `role` field. Admin UI expects a `role`.
    # Provide a default role value to satisfy the response schema.
    result = []
    for u in users:
        result.append({
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": "customer",
        })

    return result

@router.post("/users", response_model=AdminUserOut, status_code=201)
def create_user(
    payload: AdminUserCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """
    Create a new user.
    """
    existing = db.query(auth_models.User).filter(
        (auth_models.User.email == payload.email) | (auth_models.User.phone == payload.phone)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email or phone already exists")
    
    hashed_password = auth_utils.get_password_hash(payload.password)
    user = auth_models.User(
        email=payload.email,
        full_name=payload.full_name,
        phone=payload.phone,
        address=payload.address,
        latitude=payload.latitude,
        longitude=payload.longitude,
        hashed_password=hashed_password,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.put("/users/{user_id}", response_model=AdminUserOut)
def update_user(
    user_id: int,
    payload: AdminUserUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """
    Update a user. Role checks removed.
    """
    user = db.query(auth_models.User).filter(auth_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update fields if provided
    for field, value in payload.dict(exclude_unset=True).items():
        if field == "password" and value:
            setattr(user, "hashed_password", auth_utils.get_password_hash(value))
        else:
            # skip role if present
            if field == "role":
                continue
            setattr(user, field, value)
    
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """
    Delete a user. Cannot delete yourself.
    """
    user = db.query(auth_models.User).filter(auth_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}

@router.get("/orders", response_model=AdminOrderPaginatedOut)
def list_orders(
    status: Optional[str] = Query(None, description="Filter by order status"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    sort_by: OrderSortBy = Query(OrderSortBy.created_at, description="Sort field"),
    sort_order: SortOrder = Query(SortOrder.desc, description="Sort order (asc/desc)"),
    start_date: Optional[str] = Query(None, description="Filter orders from this date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Filter orders until this date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """
    List orders with pagination, sorting, and date range filtering.
    Supports filtering by status and date range.
    """
    from datetime import datetime, timedelta
    
    query = db.query(
        sell_models.Order.id,
        sell_models.Order.phone_name,
        sell_models.Order.customer_name,
        Partner.company_name.label('partner_name'),
        sell_models.Order.agent_name,
        sell_models.Order.status,
        sell_models.Order.quoted_price,
        sell_models.Order.created_at,
    ).outerjoin(
        Partner, sell_models.Order.partner_id == Partner.id
    )
    
    # Apply status filter if provided
    if status and status != "all":
        query = query.filter(sell_models.Order.status == status)
    
    # Apply date range filters
    if start_date:
        try:
            start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(sell_models.Order.created_at >= start_datetime)
        except ValueError:
            pass  # Invalid date format, skip filter
    
    if end_date:
        try:
            end_datetime = datetime.strptime(end_date, "%Y-%m-%d")
            # Include entire end date by adding 1 day and excluding it
            end_datetime = end_datetime + timedelta(days=1)
            query = query.filter(sell_models.Order.created_at < end_datetime)
        except ValueError:
            pass  # Invalid date format, skip filter
    
    # Get total count before pagination
    total = query.count()
    
    # Apply sorting
    sort_column = {
        OrderSortBy.created_at: sell_models.Order.created_at,
        OrderSortBy.quoted_price: sell_models.Order.quoted_price,
        OrderSortBy.status: sell_models.Order.status,
    }[sort_by]
    
    if sort_order == SortOrder.asc:
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())
    
    # Apply pagination
    offset = (page - 1) * limit
    results = query.offset(offset).limit(limit).all()
    
    # Convert to dict format for Pydantic
    items = [
        {
            "id": r.id,
            "phone_name": r.phone_name,
            "customer_name": r.customer_name,
            "partner_name": r.partner_name,
            "agent_name": r.agent_name,
            "status": r.status,
            "quoted_price": r.quoted_price,
            "created_at": r.created_at,
        }
        for r in results
    ]
    
    # Calculate pagination metadata
    total_pages = (total + limit - 1) // limit  # Ceiling division
    has_more = page < total_pages
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
        "has_more": has_more,
    }


@router.get("/orders/{order_id}/pickup-details")
def get_order_pickup_details(
    order_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """
    Get pickup details for an order (admin only).
    Returns complete inspection data including photos and inspection form.
    """
    from backend.services.sell_phone.schema.agent_pickup_details import AgentPickupDetails
    from backend.services.partner.schema.models import Agent
    import base64
    
    order = db.query(sell_models.Order).filter(sell_models.Order.id == order_id).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get pickup/inspection details
    pickup_details = db.query(AgentPickupDetails).filter(
        AgentPickupDetails.order_id == order_id
    ).first()
    
    if not pickup_details:
        # Return basic order info if no inspection details
        return {
            "order_id": order_id,
            "has_pickup_details": False,
            "scheduled_date": order.pickup_date,
            "scheduled_time": order.pickup_time,
            "customer_name": order.customer_name,
            "customer_phone": order.customer_phone,
            "address": order.pickup_address_line or order.address_line,
            "city": order.pickup_city or order.city,
            "state": order.pickup_state or order.state,
            "pincode": order.pickup_pincode or order.pincode,
            "status": order.status,
        }
    
    # Get agent info
    agent = db.query(Agent).filter(Agent.id == pickup_details.agent_id).first()
    
    # Encode photos to base64 for JSON serialization
    photos_base64 = None
    if pickup_details.photos_blob:
        try:
            photos_base64 = base64.b64encode(pickup_details.photos_blob).decode('utf-8')
        except Exception as e:
            print(f"Error encoding photos to base64: {e}")
            photos_base64 = None
    
    return {
        "order_id": order_id,
        "has_pickup_details": True,
        "agent": {
            "id": agent.id,
            "name": agent.full_name,
            "email": agent.email,
            "phone": agent.phone,
        } if agent else None,
        "phone_conditions": pickup_details.phone_conditions,
        "final_offered_price": pickup_details.final_offered_price,
        "customer_accepted_offer": pickup_details.customer_accepted_offer == 1,
        "payment_method": pickup_details.payment_method,
        "pickup_notes": pickup_details.pickup_notes,
        "actual_condition": pickup_details.actual_condition,
        "photos_metadata": pickup_details.photos_metadata,
        "photos_blob": photos_base64,
        "photos_count": len(pickup_details.photos_metadata) if pickup_details.photos_metadata else 0,
        "total_blob_size": len(pickup_details.photos_blob) if pickup_details.photos_blob else 0,
        "captured_at": pickup_details.captured_at.isoformat() if pickup_details.captured_at else None,
        "created_at": pickup_details.created_at.isoformat() if pickup_details.created_at else None,
        "scheduled_date": order.pickup_date,
        "scheduled_time": order.pickup_time,
        "customer_name": order.customer_name,
        "customer_phone": order.customer_phone,
        "address": order.pickup_address_line or order.address_line,
        "city": order.pickup_city or order.city,
        "state": order.pickup_state or order.state,
        "pincode": order.pickup_pincode or order.pincode,
        "status": order.status,
    }


# ============================================================================
# PHONE LIST MANAGEMENT
# ============================================================================

@router.get("/phones", response_model=PhoneListPaginatedOut)
def get_phones_list(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search by brand, series, or model"),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Get paginated phones from the database with search support.
    Search is performed on Brand, Series, and Model fields.
    """
    query = db.query(sell_models.PhoneList)
    
    # Apply search filter across Brand, Series, and Model
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (sell_models.PhoneList.Brand.ilike(search_term)) |
            (sell_models.PhoneList.Series.ilike(search_term)) |
            (sell_models.PhoneList.Model.ilike(search_term))
        )
    
    # Get total count before pagination
    total = query.count()
    
    # Apply pagination
    phones = query.order_by(sell_models.PhoneList.Brand, sell_models.PhoneList.Model)\
                   .offset(skip).limit(limit).all()
    
    # Calculate pagination metadata
    total_pages = (total + limit - 1) // limit  # Ceiling division
    page = (skip // limit) + 1
    
    return {
        "items": phones,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages
    }


@router.get("/phones/{phone_id}", response_model=PhoneListOut)
def get_phone_by_id(
    phone_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Get a specific phone by ID.
    """
    phone = db.query(sell_models.PhoneList).filter(sell_models.PhoneList.id == phone_id).first()
    if not phone:
        raise HTTPException(status_code=404, detail="Phone not found")
    return phone


@router.post("/phones", response_model=PhoneListOut, status_code=201)
def create_phone(
    payload: PhoneListCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Create a new phone in the database.
    """
    # Check for duplicate
    existing = db.query(sell_models.PhoneList).filter(
        sell_models.PhoneList.Brand == payload.Brand,
        sell_models.PhoneList.Model == payload.Model,
        sell_models.PhoneList.Storage_Raw == payload.Storage_Raw
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Phone with this brand, model, and storage already exists"
        )
    
    phone = sell_models.PhoneList(**payload.model_dump())
    # Explicitly build search_text so it's always populated regardless of event timing
    phone.search_text = f"{phone.Brand} {phone.Model}".lower()
    db.add(phone)
    db.commit()
    db.refresh(phone)
    # Populate tsvector search_vector via raw SQL (to_tsvector is a DB function)
    _sync_search_vector(db, phone.id, phone.Brand, phone.Series, phone.Model, phone.Storage_Raw)
    db.refresh(phone)
    return phone


@router.put("/phones/{phone_id}", response_model=PhoneListOut)
def update_phone(
    phone_id: int,
    payload: PhoneListUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Update an existing phone.
    """
    phone = db.query(sell_models.PhoneList).filter(sell_models.PhoneList.id == phone_id).first()
    if not phone:
        raise HTTPException(status_code=404, detail="Phone not found")
    
    # Update only provided fields
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(phone, field, value)

    # Always keep search_text in sync with Brand + Model
    if phone.Brand and phone.Model:
        phone.search_text = f"{phone.Brand} {phone.Model}".lower()

    db.commit()
    db.refresh(phone)
    # Populate tsvector search_vector via raw SQL
    _sync_search_vector(db, phone.id, phone.Brand, phone.Series, phone.Model, phone.Storage_Raw)
    db.refresh(phone)
    return phone


@router.delete("/phones/{phone_id}", status_code=204)
def delete_phone(
    phone_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Delete a phone from the database.
    """
    phone = db.query(sell_models.PhoneList).filter(sell_models.PhoneList.id == phone_id).first()
    if not phone:
        raise HTTPException(status_code=404, detail="Phone not found")
    
    db.delete(phone)
    db.commit()
    return None


@router.post("/phones/{phone_id}/upload-image", response_model=PhoneListOut)
def upload_phone_image(
    phone_id: int,
    file: UploadFile,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Upload an image for a phone and store it on the filesystem.
    """
    phone = db.query(sell_models.PhoneList).filter(sell_models.PhoneList.id == phone_id).first()
    if not phone:
        raise HTTPException(status_code=404, detail="Phone not found")
    
    try:
        # Read file content
        content = file.file.read()
        if not content:
            raise HTTPException(status_code=400, detail="File is empty")
        
        # Determine file extension
        original_name = file.filename or "image.jpg"
        ext = os.path.splitext(original_name)[1].lower() or ".jpg"
        
        # Save directly to Images/ (not a subfolder)
        os.makedirs("Images", exist_ok=True)
        filename = f"phone_{phone_id}_{uuid.uuid4().hex}{ext}"
        filepath = os.path.join("Images", filename)
        with open(filepath, "wb") as f_out:
            f_out.write(content)
        
        phone.image_url = f"/images/{filename}"
        phone.image_blob = None
        # Keep search_text in sync
        if phone.Brand and phone.Model:
            phone.search_text = f"{phone.Brand} {phone.Model}".lower()

        db.commit()
        db.refresh(phone)
        # Keep search_vector in sync
        _sync_search_vector(db, phone.id, phone.Brand, phone.Series, phone.Model, phone.Storage_Raw)
        db.refresh(phone)
        
        return phone
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error uploading image: {str(e)}")


@router.post("/phones/{phone_id}/set-image-url", response_model=PhoneListOut)
def set_phone_image_url(
    phone_id: int,
    image_url: str = Query(..., description="URL of the phone image"),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Set the image URL for a phone directly from an external link.
    """
    from backend.services.admin.utils.image_handler import is_valid_url
    
    phone = db.query(sell_models.PhoneList).filter(sell_models.PhoneList.id == phone_id).first()
    if not phone:
        raise HTTPException(status_code=404, detail="Phone not found")
    
    if not is_valid_url(image_url):
        raise HTTPException(status_code=400, detail="Invalid image URL format")
    
    phone.image_url = image_url
    db.commit()
    db.refresh(phone)
    
    return phone


# ============================================================================
# COUPON MANAGEMENT
# ============================================================================

from backend.services.sell_phone.schema.models import Coupon
from backend.services.admin.schema.schemas import CouponOut, CouponCreate, CouponUpdate

@router.get("/coupons", response_model=List[CouponOut])
def get_coupons(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    return db.query(Coupon).order_by(Coupon.created_at.desc()).all()

@router.post("/coupons", response_model=CouponOut, status_code=201)
def create_coupon(
    payload: CouponCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    # Check if code already exists
    existing = db.query(Coupon).filter(Coupon.code == payload.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Coupon code already exists")
    coupon = Coupon(**payload.dict())
    db.add(coupon)
    db.commit()
    db.refresh(coupon)
    return coupon

@router.put("/coupons/{coupon_id}", response_model=CouponOut)
def update_coupon(
    coupon_id: int,
    payload: CouponUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
        
    if payload.code is not None and payload.code != coupon.code:
        existing = db.query(Coupon).filter(Coupon.code == payload.code).first()
        if existing:
            raise HTTPException(status_code=400, detail="Coupon code already exists")
            
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(coupon, field, value)
    db.commit()
    db.refresh(coupon)
    return coupon

@router.delete("/coupons/{coupon_id}")
def delete_coupon(
    coupon_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    db.delete(coupon)
    db.commit()
    return {"message": "Coupon deleted"}
