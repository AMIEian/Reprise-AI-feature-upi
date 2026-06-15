from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    Query,
    File,
    UploadFile,
    Form,
)
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from backend.shared.db.connections import get_db
from backend.services.partner.schema import schemas as partner_schemas
from backend.services.partner.schema.models import (
    Agent,
    Partner,
    PartnerServiceablePincode,
)
from backend.services.partner import utils as partner_utils
from backend.services.auth import utils as auth_utils
from backend.services.sell_phone.schema.models import Order
from backend.services.sell_phone.schema.agent_pickup_details import AgentPickupDetails
from backend.services.sell_phone.utils import create_status_history
from typing import List, Optional
from datetime import datetime, timezone
from backend.services.admin.schema.models import (
    CreditPlan,
    PartnerCreditTransaction,
    PartnerPaymentRequest,
)
from backend.services.admin import schema as admin_schemas
from backend.socket_manager import sio, connected_agents
from backend.services.sell_phone.apis.routes import send_push_notification
import asyncio
import base64
import json
import os
import uuid

router = APIRouter(prefix="/partner", tags=["Partner"])


@router.post("/save-fcm-token")
def save_fcm_token(
    payload: dict,
    db: Session = Depends(get_db),
    current_partner: Partner = Depends(auth_utils.get_current_partner),
):
    token = payload.get("token")

    if not token:
        raise HTTPException(
            status_code=400,
            detail="Token required",
        )

    current_partner.expo_push_token = token

    db.add(current_partner)

    db.commit()

    return {
        "success": True,
    }


# ------------------------------
# Credit purchase endpoints for partners
# ------------------------------


@router.get("/credit-plans", response_model=List[dict])
def partner_get_credit_plans(db: Session = Depends(get_db)):
    """List active credit plans for partners."""
    plans = (
        db.query(CreditPlan)
        .filter(CreditPlan.is_active == True)
        .order_by(CreditPlan.credit_amount)
        .all()
    )
    result = []
    for p in plans:
        result.append(
            {
                "id": p.id,
                "plan_name": p.plan_name,
                "credit_amount": p.credit_amount,
                "price": p.price,
                "bonus_percentage": p.bonus_percentage,
                "description": p.description,
                "is_active": p.is_active,
            }
        )
    return result


@router.post("/purchase-credits", response_model=dict)
def partner_purchase_credits(
    payload: dict,
    db: Session = Depends(get_db),
    current_partner: Partner = Depends(auth_utils.get_current_partner),
):
    """Allow partner to purchase a credit plan (simulated/offline).

    Body: { "plan_id": int, "payment_method": str, "payment_transaction_id": Optional[str] }
    """
    # Check if partner is on hold
    if partner_utils.check_partner_on_hold(db, current_partner.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is on hold. You cannot purchase credits at this time. Contact support for details.",
        )

    plan_id = payload.get("plan_id")
    payment_method = payload.get("payment_method", "manual")
    payment_transaction_id = payload.get("payment_transaction_id")

    if not plan_id:
        raise HTTPException(status_code=400, detail="plan_id is required")

    plan = (
        db.query(CreditPlan)
        .filter(CreditPlan.id == plan_id, CreditPlan.is_active == True)
        .first()
    )
    if not plan:
        raise HTTPException(status_code=404, detail="Credit plan not found")

    balance_before = current_partner.credit_balance
    bonus = (plan.credit_amount * (plan.bonus_percentage or 0.0)) / 100.0
    credit_added = plan.credit_amount + bonus
    current_partner.credit_balance = (
        current_partner.credit_balance or 0.0
    ) + credit_added
    balance_after = current_partner.credit_balance

    transaction = PartnerCreditTransaction(
        partner_id=current_partner.id,
        transaction_type="credit_purchase",
        amount=credit_added,
        balance_before=balance_before,
        balance_after=balance_after,
        reference_id=plan.id,
        reference_type="credit_plan",
        payment_method=payment_method,
        payment_transaction_id=payment_transaction_id,
        notes=f"Purchased plan {plan.plan_name}",
    )

    db.add(current_partner)
    db.add(transaction)
    db.commit()

    return {
        "message": "Credits purchased successfully",
        "credit_added": credit_added,
        "balance_before": balance_before,
        "balance_after": balance_after,
        "plan": {
            "id": plan.id,
            "plan_name": plan.plan_name,
            "credit_amount": plan.credit_amount,
        },
    }


@router.post("/payment-request", response_model=dict, status_code=201)
def create_payment_request(
    plan_id: int = Form(...),
    db: Session = Depends(get_db),
    current_partner: Partner = Depends(auth_utils.get_current_partner),
):
    """Create a payment request for UPI credit purchase"""
    # Check if partner is on hold
    if partner_utils.check_partner_on_hold(db, current_partner.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is on hold. You cannot purchase credits at this time.",
        )

    plan = (
        db.query(CreditPlan)
        .filter(CreditPlan.id == plan_id, CreditPlan.is_active == True)
        .first()
    )
    if not plan:
        raise HTTPException(status_code=404, detail="Credit plan not found")

    # Create payment request
    payment_request = PartnerPaymentRequest(
        partner_id=current_partner.id,
        plan_id=plan.id,
        credit_amount=plan.credit_amount,
        payment_amount=plan.price,
        bonus_percentage=plan.bonus_percentage or 0.0,
        approval_status="pending",
    )

    db.add(payment_request)
    db.commit()
    db.refresh(payment_request)

    return {
        "status": "success",
        "message": "Payment request created",
        "request_id": payment_request.id,
        "credit_amount": plan.credit_amount,
        "payment_amount": plan.price,
        "bonus_percentage": plan.bonus_percentage or 0.0,
    }


@router.post("/payment-request/{request_id}/upload-screenshot")
def upload_payment_screenshot(
    request_id: int,
    screenshot: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_partner: Partner = Depends(auth_utils.get_current_partner),
):
    """Upload payment screenshot for a payment request"""
    payment_request = (
        db.query(PartnerPaymentRequest)
        .filter(
            PartnerPaymentRequest.id == request_id,
            PartnerPaymentRequest.partner_id == current_partner.id,
        )
        .first()
    )

    if not payment_request:
        raise HTTPException(status_code=404, detail="Payment request not found")

    if payment_request.approval_status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot upload screenshot for {payment_request.approval_status} request",
        )

    try:
        # Read screenshot file
        screenshot_bytes = screenshot.file.read()
        if not screenshot_bytes:
            raise HTTPException(status_code=400, detail="Screenshot file is empty")

        # Save to documents/payment/
        os.makedirs("documents/payment", exist_ok=True)
        original_name = screenshot.filename or "screenshot.jpg"
        ext = os.path.splitext(original_name)[1].lower() or ".jpg"
        filename = f"payment_{request_id}_{uuid.uuid4().hex}{ext}"
        filepath = os.path.join("documents", "payment", filename)
        with open(filepath, "wb") as f_out:
            f_out.write(screenshot_bytes)

        payment_request.payment_screenshot_url = f"/documents/payment/{filename}"

        db.add(payment_request)
        db.commit()

        return {
            "status": "success",
            "message": "Screenshot uploaded successfully",
            "request_id": request_id,
            "file_size": len(screenshot_bytes),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Failed to upload screenshot: {str(e)}"
        )


@router.get("/payment-requests")
def get_partner_payment_requests(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    approval_status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_partner: Partner = Depends(auth_utils.get_current_partner),
):
    """Get partner's payment requests"""
    query = db.query(PartnerPaymentRequest).filter(
        PartnerPaymentRequest.partner_id == current_partner.id
    )

    if approval_status:
        query = query.filter(PartnerPaymentRequest.approval_status == approval_status)

    requests = (
        query.order_by(desc(PartnerPaymentRequest.created_at))
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    total = (
        db.query(PartnerPaymentRequest)
        .filter(PartnerPaymentRequest.partner_id == current_partner.id)
        .count()
    )

    return {
        "requests": [
            {
                "id": r.id,
                "plan_id": r.plan_id,
                "credit_amount": r.credit_amount,
                "payment_amount": r.payment_amount,
                "bonus_percentage": r.bonus_percentage,
                "approval_status": r.approval_status,
                "approval_notes": r.approval_notes,
                "has_screenshot": bool(r.payment_screenshot_url),
                "created_at": r.created_at,
                "reviewed_at": r.reviewed_at,
            }
            for r in requests
        ],
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.get("/payment-request/{request_id}")
def get_payment_request_details(
    request_id: int,
    db: Session = Depends(get_db),
    current_partner: Partner = Depends(auth_utils.get_current_partner),
):
    """Get details of a payment request"""
    payment_request = (
        db.query(PartnerPaymentRequest)
        .filter(
            PartnerPaymentRequest.id == request_id,
            PartnerPaymentRequest.partner_id == current_partner.id,
        )
        .first()
    )

    if not payment_request:
        raise HTTPException(status_code=404, detail="Payment request not found")

    return {
        "id": payment_request.id,
        "plan_id": payment_request.plan_id,
        "credit_amount": payment_request.credit_amount,
        "payment_amount": payment_request.payment_amount,
        "bonus_percentage": payment_request.bonus_percentage,
        "approval_status": payment_request.approval_status,
        "approval_notes": payment_request.approval_notes,
        "has_screenshot": bool(payment_request.payment_screenshot_url),
        "created_at": payment_request.created_at,
        "reviewed_at": payment_request.reviewed_at,
    }


# ================================
# PARTNER AUTH ENDPOINTS
# ================================


@router.post("/check-email")
def check_email_exists(email: str, db: Session = Depends(get_db)):
    """Check if email already exists for partners."""
    existing = db.query(Partner).filter(Partner.email == email).first()
    return {"exists": existing is not None}


@router.post("/check-phone")
def check_phone_exists(phone: str, db: Session = Depends(get_db)):
    """Check if phone already exists for partners."""
    existing = db.query(Partner).filter(Partner.phone == phone).first()
    return {"exists": existing is not None}


@router.post("/signup", status_code=201)
async def partner_signup(
    full_name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    password: str = Form(...),
    company_name: str = Form(...),
    business_address: str = Form(...),
    udyam_id: Optional[str] = Form(None),
    pan_number: str = Form(...),
    serviceable_pincodes: str = Form(...),  # comma-separated string
    udyam_aadhar_image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    """
    Partner application (signup).
    Creates partner account with 'pending' verification status.
    Does NOT issue a login token - partner must wait for admin approval before logging in.
    """
    import re

    # Validate udyam_id format
    if udyam_id and not re.match(r"^UDYAM-[A-Z]{2}-\d{2}-\d{7}$", udyam_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid Udyam ID format. Expected: UDYAM-XX-00-0000000",
        )

    # Validate PAN
    if not re.match(r"^[A-Z0-9]{10}$", pan_number):
        raise HTTPException(
            status_code=400,
            detail="PAN number must be 10 alphanumeric uppercase characters",
        )

    # Parse pincodes
    pincodes = [p.strip() for p in serviceable_pincodes.split(",") if p.strip()]
    if not pincodes:
        raise HTTPException(
            status_code=400, detail="At least one serviceable pincode is required"
        )

    try:
        partner = partner_utils.create_partner_application(
            db=db,
            full_name=full_name,
            email=email,
            phone=phone,
            password=password,
            company_name=company_name,
            business_address=business_address,
            udyam_id=udyam_id,
            pan_number=pan_number,
            serviceable_pincodes=pincodes,
        )
        db.commit()
        db.refresh(partner)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Handle optional Udyam Aadhaar image upload (non-fatal)
    if udyam_aadhar_image and udyam_aadhar_image.filename:
        try:
            contents = await udyam_aadhar_image.read()
            if contents:
                save_dir = os.path.join("documents", "udyam-aadhar")
                os.makedirs(save_dir, exist_ok=True)
                ext = os.path.splitext(udyam_aadhar_image.filename)[1].lower() or ".jpg"
                filename = f"partner_{partner.id}_{uuid.uuid4().hex[:10]}{ext}"
                filepath = os.path.join(save_dir, filename)
                with open(filepath, "wb") as f_img:
                    f_img.write(contents)
                partner.udyam_aadhar_image = f"/documents/udyam-aadhar/{filename}"
                db.commit()
        except Exception:
            pass  # Non-fatal - partner record already created

    return {
        "status": "success",
        "message": "Application submitted successfully! You will be notified once your application is approved.",
        "partner_id": partner.id,
    }


@router.post("/upload-udyam-aadhar")
async def upload_udyam_aadhar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_partner: Partner = Depends(auth_utils.get_current_partner_any_status),
):
    """
    Upload Udyam Aadhaar certificate image for the authenticated partner.
    Stores the file in documents/udyam-aadhar/ and saves the URL path in the DB.
    """
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    # Check file size (max 5 MB)
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > 5:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({size_mb:.1f} MB). Maximum allowed size is 5 MB.",
        )

    # Validate content type
    allowed_types = {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "application/pdf",
    }
    content_type = file.content_type or ""
    if content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{content_type}'. Allowed: JPEG, PNG, WEBP, PDF.",
        )

    # Ensure directory exists
    save_dir = os.path.join("documents", "udyam-aadhar")
    os.makedirs(save_dir, exist_ok=True)

    # Generate a unique filename
    original_name = file.filename or "upload"
    ext = os.path.splitext(original_name)[1].lower() or ".jpg"
    filename = f"partner_{current_partner.id}_{uuid.uuid4().hex[:10]}{ext}"
    filepath = os.path.join(save_dir, filename)

    # Write file to disk
    with open(filepath, "wb") as f:
        f.write(contents)

    # Build the URL path that will be served via the /documents static mount
    file_url = f"/documents/udyam-aadhar/{filename}"

    # Persist URL in the DB
    current_partner.udyam_aadhar_image = file_url
    db.add(current_partner)
    db.commit()

    return {
        "url": file_url,
        "message": "Udyam Aadhaar certificate uploaded successfully",
    }


@router.post("/login", response_model=partner_schemas.PartnerToken)
def partner_login(
    payload: partner_schemas.PartnerLogin,
    db: Session = Depends(get_db),
):
    """
    Partner login.
    Returns JWT token for authentication.
    """
    try:
        partner = partner_utils.authenticate_partner(
            db=db, email=payload.email, password=payload.password
        )

        # Generate token
        access_token = partner_utils.create_partner_token(partner)

        return partner_schemas.PartnerToken(
            access_token=access_token, token_type="bearer", partner=partner
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.get("/me", response_model=partner_schemas.PartnerCreditNameOut)
def get_partner_profile(
    db: Session = Depends(get_db),
    current_partner: Partner = Depends(auth_utils.get_current_partner),
):
    """
    Get current partner profile with hold status.
    Requires authentication.
    """
    # Check if partner is on hold
    hold = partner_utils.get_partner_hold_details(db, current_partner.id)
    is_on_hold = hold is not None
    serviceable_pincodes = (
        db.query(PartnerServiceablePincode.pincode)
        .filter(
            PartnerServiceablePincode.partner_id == current_partner.id,
            PartnerServiceablePincode.is_active == True,
        )
        .all()
    )

    pincode_list = [p.pincode for p in serviceable_pincodes]

    return partner_schemas.PartnerCreditNameOut(
        email=current_partner.email,
        id=current_partner.id,
        full_name=current_partner.full_name,
        phone=current_partner.phone,
        credit_balance=current_partner.credit_balance,
        verification_status=current_partner.verification_status,
        rejection_reason=current_partner.rejection_reason,
        is_active=current_partner.is_active,
        is_on_hold=is_on_hold,
        hold_reason=hold.reason if hold else None,
        hold_lift_date=hold.lift_date if hold else None,
        serviceable_pincodes=pincode_list,
    )


# ================================
# AGENT MANAGEMENT ENDPOINTS (FOR PARTNERS)
# ================================


@router.post(
    "/self-assign-as-agent",
    response_model=partner_schemas.PartnerSelfAssignResponse,
    status_code=201,
)
def partner_self_assign_as_agent(
    payload: partner_schemas.PartnerSelfAssignRequest,
    db: Session = Depends(get_db),
    current_partner: Partner = Depends(auth_utils.get_current_partner),
):
    """
    Partner self-assigns themselves as an agent.
    Creates a new agent record for the partner so they can login to the agent portal.
    Uses partner's existing password if not provided (same credentials for both portals).
    """
    # Check if partner is on hold
    if partner_utils.check_partner_on_hold(db, current_partner.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is on hold. You cannot self-assign as an agent at this time. Contact support for details.",
        )

    try:
        # Use partner's details if not provided (all fields default to partner's info)
        agent_email = payload.email or current_partner.email
        agent_full_name = payload.full_name or current_partner.full_name
        agent_phone = payload.phone or current_partner.phone

        # If no password provided, create agent with partner's existing hashed password
        # This allows them to use the same credentials for both portals
        agent_password = payload.password

        if agent_password:
            # If a password is provided, use it (it will be hashed by create_agent)
            agent = partner_utils.create_agent(
                db=db,
                partner_id=current_partner.id,
                email=agent_email,
                phone=agent_phone,
                password=agent_password,
                full_name=agent_full_name,
                employee_id=payload.employee_id,
            )
        else:
            # If no password provided, create agent with same password as partner
            # This way they use the same credentials
            agent = partner_utils.create_agent_with_existing_password(
                db=db,
                partner_id=current_partner.id,
                email=agent_email,
                phone=agent_phone,
                full_name=agent_full_name,
                employee_id=payload.employee_id,
                partner_hashed_password=current_partner.hashed_password,
            )

        db.commit()
        db.refresh(agent)

        return partner_schemas.PartnerSelfAssignResponse(
            agent_id=agent.id,
            partner_id=agent.partner_id,
            email=agent.email,
            phone=agent.phone,
            full_name=agent.full_name,
            is_active=agent.is_active,
            created_at=agent.created_at,
            message="You have successfully self-assigned as an agent. You can now login to the agent portal using your partner account credentials.",
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/switch-to-agent", response_model=dict)
def switch_to_agent_portal(
    db: Session = Depends(get_db),
    current_partner: Partner = Depends(auth_utils.get_current_partner),
):
    """
    Returns an agent JWT token for the self-assigned agent of the current partner.
    Allows a partner who has self-assigned as an agent to switch to the agent portal
    without logging out and back in.
    """
    # Find the self-assigned agent record (same email as partner, owned by this partner)
    agent = (
        db.query(Agent)
        .filter(
            Agent.partner_id == current_partner.id,
            Agent.email == current_partner.email,
        )
        .first()
    )

    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No self-assigned agent found. Please go to Agents Management and self-assign as an agent first.",
        )

    if not agent.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your agent account is inactive. Contact support.",
        )

    token = partner_utils.create_agent_token(agent)
    return {"access_token": token, "token_type": "bearer"}


@router.post("/agents", response_model=partner_schemas.AgentOut, status_code=201)
def create_agent(
    payload: partner_schemas.AgentCreate,
    db: Session = Depends(get_db),
    current_partner: Partner = Depends(auth_utils.get_current_partner),
):
    """
    Create a new agent for the current partner.
    """
    # Check if partner is on hold
    if partner_utils.check_partner_on_hold(db, current_partner.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is on hold. You cannot create new agents at this time. Contact support for details.",
        )

    try:
        agent = partner_utils.create_agent(
            db=db,
            partner_id=current_partner.id,
            email=payload.email,
            phone=payload.phone,
            password=payload.password,
            full_name=payload.full_name,
            employee_id=payload.employee_id,
        )
        db.commit()
        db.refresh(agent)
        return agent
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/agents", response_model=List[partner_schemas.AgentOut])
def list_agents(
    is_active: bool = Query(None, description="Filter by active status"),
    db: Session = Depends(get_db),
    current_partner: Partner = Depends(auth_utils.get_current_partner),
):
    """
    List all agents for the current partner.
    """
    query = db.query(Agent).filter(Agent.partner_id == current_partner.id)

    if is_active is not None:
        query = query.filter(Agent.is_active == is_active)

    agents = query.order_by(Agent.created_at.desc()).all()
    return agents


@router.get("/agents/{agent_id}", response_model=partner_schemas.AgentOut)
def get_agent(
    agent_id: int,
    db: Session = Depends(get_db),
    current_partner: Partner = Depends(auth_utils.get_current_partner),
):
    """
    Get details of a specific agent.
    """
    agent = (
        db.query(Agent)
        .filter(Agent.id == agent_id, Agent.partner_id == current_partner.id)
        .first()
    )

    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    return agent


@router.patch("/agents/{agent_id}", response_model=partner_schemas.AgentOut)
def update_agent(
    agent_id: int,
    payload: partner_schemas.AgentUpdate,
    db: Session = Depends(get_db),
    current_partner: Partner = Depends(auth_utils.get_current_partner),
):
    """
    Update agent details.
    """
    agent = (
        db.query(Agent)
        .filter(Agent.id == agent_id, Agent.partner_id == current_partner.id)
        .first()
    )

    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Update fields
    if payload.phone is not None:
        agent.phone = payload.phone
    if payload.full_name is not None:
        agent.full_name = payload.full_name
    if payload.employee_id is not None:
        agent.employee_id = payload.employee_id
    if payload.is_active is not None:
        agent.is_active = payload.is_active

    agent.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(agent)
    return agent


@router.delete("/agents/{agent_id}", status_code=200)
def deactivate_agent(
    agent_id: int,
    db: Session = Depends(get_db),
    current_partner: Partner = Depends(auth_utils.get_current_partner),
):
    """
    Deactivate an agent (soft delete).
    """
    agent = (
        db.query(Agent)
        .filter(Agent.id == agent_id, Agent.partner_id == current_partner.id)
        .first()
    )

    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    agent.is_active = False
    agent.updated_at = datetime.utcnow()

    db.commit()

    return {"message": "Agent deactivated successfully", "agent_id": agent_id}


# ================================
# ORDER ASSIGNMENT ENDPOINTS (FOR PARTNERS)
# ================================


@router.get("/locked-deals", response_model=List[dict])
def get_locked_deals(
    db: Session = Depends(get_db),
    current_partner: Partner = Depends(auth_utils.get_current_partner),
):
    """
    Get all deals locked by the current partner (status = lead_locked).
    """
    from backend.services.sell_phone.utils import (
        calculate_lead_cost,
        expire_all_expired_locks,
    )

    # Expire any locks that have passed their expiry before returning locked deals
    expire_all_expired_locks(db)

    orders = (
        db.query(Order)
        .filter(Order.partner_id == current_partner.id, Order.status == "lead_locked")
        .order_by(Order.lead_locked_at.desc())
        .all()
    )

    result = []
    for order in orders:
        lead_cost = calculate_lead_cost(
            db, order.final_quoted_price or order.quoted_price
        )
        result.append(
            {
                "id": order.id,
                "customer_id": order.customer_id,
                "partner_id": order.partner_id,
                "agent_id": order.agent_id,
                "phone_name": order.phone_name,
                "brand": order.brand,
                "model": order.model,
                "ram_gb": order.ram_gb,
                "storage_gb": order.storage_gb,
                "variant": order.variant,
                "ai_estimated_price": order.ai_estimated_price,
                "ai_reasoning": order.ai_reasoning,
                "customer_condition_answers": order.customer_condition_answers,
                "final_quoted_price": order.final_quoted_price,
                "customer_name": order.customer_name,
                "customer_phone": order.customer_phone,
                "customer_email": order.customer_email,
                "pickup_address_line": order.pickup_address_line,
                "pickup_city": order.pickup_city,
                "pickup_state": order.pickup_state,
                "pickup_pincode": order.pickup_pincode,
                "pickup_date": order.pickup_date,
                "pickup_time": order.pickup_time,
                "payment_method": order.payment_method,
                "status": order.status,
                "lead_locked_at": order.lead_locked_at,
                "lead_lock_expires_at": order.lead_lock_expires_at,
                "purchased_at": order.purchased_at,
                "assigned_at": order.assigned_at,
                "accepted_at": order.accepted_at,
                "completed_at": order.completed_at,
                "cancelled_at": order.cancelled_at,
                "cancellation_reason": order.cancellation_reason,
                "actual_condition": order.actual_condition,
                "final_offered_price": order.final_offered_price,
                "customer_accepted_offer": order.customer_accepted_offer,
                "pickup_notes": order.pickup_notes,
                "payment_amount": order.payment_amount,
                "payment_transaction_id": order.payment_transaction_id,
                "payment_notes": order.payment_notes,
                "payment_processed_at": order.payment_processed_at,
                "user_id": order.user_id,
                "condition": order.condition,
                "quoted_price": order.quoted_price,
                "phone_number": order.phone_number,
                "email": order.email,
                "address_line": order.address_line,
                "city": order.city,
                "state": order.state,
                "pincode": order.pincode,
                "agent_name": order.agent_name,
                "agent_phone": order.agent_phone,
                "agent_email": order.agent_email,
                "created_at": order.created_at,
                "lead_cost": lead_cost,
                "time_remaining": (
                    None
                    if not order.lead_lock_expires_at
                    else (
                        order.lead_lock_expires_at - datetime.now(timezone.utc)
                    ).total_seconds()
                ),
            }
        )

    return result


@router.get("/lead-purchase-info/{order_id}", response_model=dict)
def get_lead_purchase_info(
    order_id: int,
    db: Session = Depends(get_db),
    current_partner: Partner = Depends(auth_utils.get_current_partner),
):
    """
    Get credit balance and lead cost calculation for a locked lead before purchasing.
    """
    from backend.services.sell_phone.utils import calculate_lead_cost
    from backend.services.sell_phone.utils import expire_all_expired_locks

    # Ensure lock is still active and expire others if needed
    expire_all_expired_locks(db)

    # Verify the partner has an active lock on this order
    order = (
        db.query(Order)
        .filter(
            Order.id == order_id,
            Order.partner_id == current_partner.id,
            Order.status == "lead_locked",
        )
        .first()
    )

    if not order:
        raise HTTPException(
            status_code=404, detail="Locked lead not found or not owned by you"
        )

    lead_cost = calculate_lead_cost(db, order.final_quoted_price or order.quoted_price)
    current_balance = current_partner.credit_balance or 0.0
    balance_after = current_balance - lead_cost
    has_sufficient_credits = current_balance >= lead_cost

    return {
        "order_id": order_id,
        "phone_name": order.phone_name,
        "brand": order.brand,
        "model": order.model,
        "ai_estimated_price": order.ai_estimated_price,
        "final_quoted_price": order.final_quoted_price,
        "lead_cost": lead_cost,
        "current_balance": current_balance,
        "balance_after": balance_after,
        "has_sufficient_credits": has_sufficient_credits,
        "shortage_amount": max(0, lead_cost - current_balance),
    }


@router.get("/orders", response_model=List[partner_schemas.PartnerOrderBriefOut])
def get_partner_orders(
    status_filter: str = Query(None, description="Filter by order status"),
    assigned_filter: str = Query(
        None, description="'assigned', 'unassigned', or None for all"
    ),
    db: Session = Depends(get_db),
    current_partner: Partner = Depends(auth_utils.get_current_partner),
):
    """
    Get all orders purchased by the current partner.
    """
    from backend.services.sell_phone.utils import expire_all_expired_locks

    # Expire any locks that have passed their expiry before returning orders
    expire_all_expired_locks(db)

    query = db.query(Order).filter(Order.partner_id == current_partner.id)

    if status_filter:
        query = query.filter(Order.status == status_filter)

    if assigned_filter == "assigned":
        query = query.filter(Order.agent_id.isnot(None))
    elif assigned_filter == "unassigned":
        query = query.filter(Order.agent_id.is_(None))

    orders = query.order_by(Order.purchased_at.desc()).all()

    # Return only the compact fields required by the partner orders list UI
    result = []
    for order in orders:
        result.append(
            {
                "id": order.id,
                "phone_name": order.phone_name,
                "ram_gb": order.ram_gb,
                "storage_gb": order.storage_gb,
                "status": order.status,
                "ai_estimated_price": order.ai_estimated_price,
                "final_quoted_price": order.final_quoted_price,
                "ai_reasoning": order.ai_reasoning,
                "customer_name": order.customer_name,
                "customer_phone": order.customer_phone,
                "customer_email": order.customer_email,
                "pickup_address_line": order.pickup_address_line,
                "pickup_city": order.pickup_city,
                "pickup_state": order.pickup_state,
                "pickup_pincode": order.pickup_pincode,
                "agent_name": order.agent_name,
                "agent_id": order.agent_id,
                "customer_condition_answers": order.customer_condition_answers,
                "created_at": order.created_at,
            }
        )

    return result


@router.post("/orders/{order_id}/assign", status_code=200)
def assign_order_to_agent(
    order_id: int,
    agent_id: int = Query(..., description="ID of the agent to assign"),
    db: Session = Depends(get_db),
    current_partner: Partner = Depends(auth_utils.get_current_partner),
):
    """
    Assign a purchased order to an agent.
    """
    # Check if partner is on hold
    if partner_utils.check_partner_on_hold(db, current_partner.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is on hold. You cannot assign orders at this time. Contact support for details.",
        )

    # Validate partner owns this order
    order = partner_utils.validate_partner_order_access(
        db, current_partner.id, order_id
    )

    # Validate agent belongs to this partner
    agent = (
        db.query(Agent)
        .filter(
            Agent.id == agent_id,
            Agent.partner_id == current_partner.id,
            Agent.is_active == True,
        )
        .first()
    )

    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found or not active")

    # Validate order status
    if order.status != "lead_purchased":
        raise HTTPException(
            status_code=400,
            detail=f"Order cannot be assigned (current status: {order.status})",
        )

    # Assign agent
    order.agent_id = agent_id
    order.agent_name = agent.full_name
    order.agent_phone = agent.phone
    order.agent_email = agent.email
    order.status = "assigned_to_agent"
    order.assigned_at = datetime.utcnow()
    order.accepted_at = None

    # Create status history
    create_status_history(
        db=db,
        order_id=order_id,
        from_status="lead_purchased",
        to_status="assigned_to_agent",
        changed_by_user_type="partner",
        changed_by_user_id=current_partner.id,
        notes=f"Assigned to agent {agent.full_name} (ID: {agent_id})",
    )

    db.commit()

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    loop.run_until_complete(
        sio.emit(
            "new_agent_order",
            {
                "order_id": order.id,
                "customer_name": order.customer_name,
                "brand": order.brand,
                "model": order.model,
                "phone_name": order.phone_name,
                "pickup_city": order.pickup_city,
                "status": order.status,
            },
            room=f"agent_{agent.id}",
        )
    )

    if agent.expo_push_token:

        print("SENDING AGENT PUSH:", agent.expo_push_token)

        send_push_notification(
            agent.expo_push_token,
            "New Pickup Assigned",
            f"{order.brand} {order.model}",
            {
                "order_id": order.id,
                "screen": "agent-order",
            },
        )

        print("AGENT PUSH SENT")

    loop.close()

    return {
        "message": "Order assigned successfully",
        "order_id": order_id,
        "agent_id": agent_id,
        "agent_name": agent.full_name,
        "agent_phone": agent.phone,
        "agent_email": agent.email,
    }


@router.post("/orders/{order_id}/reassign", status_code=200)
def reassign_order_to_agent(
    order_id: int,
    new_agent_id: int = Query(..., description="ID of the new agent"),
    db: Session = Depends(get_db),
    current_partner: Partner = Depends(auth_utils.get_current_partner),
):
    """
    Reassign an order to a different agent.
    """
    # Check if partner is on hold
    if partner_utils.check_partner_on_hold(db, current_partner.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is on hold. You cannot reassign orders at this time. Contact support for details.",
        )

    # Validate partner owns this order
    order = partner_utils.validate_partner_order_access(
        db, current_partner.id, order_id
    )

    # Validate new agent
    new_agent = (
        db.query(Agent)
        .filter(
            Agent.id == new_agent_id,
            Agent.partner_id == current_partner.id,
            Agent.is_active == True,
        )
        .first()
    )

    if not new_agent:
        raise HTTPException(status_code=404, detail="New agent not found or not active")

    # Validate order can be reassigned
    valid_statuses = ["assigned_to_agent", "accepted_by_agent"]
    if order.status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Order cannot be reassigned (current status: {order.status})",
        )

    old_agent_id = order.agent_id
    old_status = order.status

    # Reassign
    order.agent_id = new_agent_id
    order.agent_name = new_agent.full_name
    order.agent_phone = new_agent.phone
    order.agent_email = new_agent.email
    order.status = "assigned_to_agent"  # Reset to assigned status
    order.assigned_at = datetime.utcnow()
    order.accepted_at = None  # Clear acceptance timestamp

    # Create status history
    create_status_history(
        db=db,
        order_id=order_id,
        from_status=old_status,
        to_status="assigned_to_agent",
        changed_by_user_type="partner",
        changed_by_user_id=current_partner.id,
        notes=f"Reassigned from agent {old_agent_id} to agent {new_agent.full_name} (ID: {new_agent_id})",
    )

    db.commit()

    return {
        "message": "Order reassigned successfully",
        "order_id": order_id,
        "new_agent_id": new_agent_id,
        "new_agent_name": new_agent.full_name,
        "new_agent_phone": new_agent.phone,
        "new_agent_email": new_agent.email,
    }


# ================================
# AGENT PICKUP DETAILS ENDPOINTS
# ================================


@router.get("/orders/{order_id}/pickup-details", response_model=dict)
def get_order_pickup_details(
    order_id: int,
    db: Session = Depends(get_db),
    current_partner: Partner = Depends(auth_utils.get_current_partner),
):
    """
    Get detailed pickup information including photos and inspection form data.
    Photos are returned as base64 encoded strings.
    Only accessible to the partner who purchased the order.
    """
    # Validate partner owns this order
    order = partner_utils.validate_partner_order_access(
        db, current_partner.id, order_id
    )

    # Get pickup details
    pickup_details = (
        db.query(AgentPickupDetails)
        .filter(AgentPickupDetails.order_id == order_id)
        .first()
    )

    if not pickup_details:
        return {
            "order_id": order_id,
            "has_pickup_details": False,
            "message": "No pickup details found for this order",
        }

    # Get agent info
    agent = db.query(Agent).filter(Agent.id == pickup_details.agent_id).first()

    # Return photos as base64 encoded string for JSON serialization
    photos_base64 = None
    if pickup_details.photos_blob:
        try:
            photos_base64 = base64.b64encode(pickup_details.photos_blob).decode("utf-8")
        except Exception as e:
            print(f"Error encoding photos to base64: {e}")
            photos_base64 = None

    return {
        "order_id": order_id,
        "has_pickup_details": True,
        "agent": (
            {
                "id": agent.id,
                "name": agent.full_name,
                "email": agent.email,
                "phone": agent.phone,
            }
            if agent
            else None
        ),
        "phone_conditions": pickup_details.phone_conditions,
        "final_offered_price": pickup_details.final_offered_price,
        "customer_accepted_offer": pickup_details.customer_accepted_offer == 1,
        "payment_method": pickup_details.payment_method,
        "pickup_notes": pickup_details.pickup_notes,
        "actual_condition": pickup_details.actual_condition,
        "photos_metadata": pickup_details.photos_metadata,  # JSON metadata for each photo
        "photos_blob": photos_base64,  # Base64 encoded string for all photos
        "photos_count": (
            len(pickup_details.photos_metadata) if pickup_details.photos_metadata else 0
        ),
        "total_blob_size": (
            len(pickup_details.photos_blob) if pickup_details.photos_blob else 0
        ),
        "captured_at": (
            pickup_details.captured_at.isoformat()
            if pickup_details.captured_at
            else None
        ),
        "created_at": (
            pickup_details.created_at.isoformat() if pickup_details.created_at else None
        ),
    }
