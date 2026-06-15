from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    Query,
    Form,
    UploadFile,
    File,
)
from sqlalchemy.orm import Session
from backend.shared.db.connections import get_db
from backend.services.partner.schema import schemas as partner_schemas
from backend.services.partner.schema.models import Agent, Partner
from backend.services.partner import utils as partner_utils
from backend.services.auth import utils as auth_utils
from backend.services.sell_phone.schema.models import Order
from backend.services.sell_phone.schema.agent_pickup_details import AgentPickupDetails
from backend.services.sell_phone.utils import create_status_history
from typing import List, Optional
from datetime import datetime
import json

router = APIRouter(prefix="/agent", tags=["Agent"])


@router.post("/save-fcm-token")
def save_fcm_token(
    payload: dict,
    db: Session = Depends(get_db),
    current_agent: Agent = Depends(auth_utils.get_current_agent),
):
    token = payload.get("token")

    if not token:
        raise HTTPException(
            status_code=400,
            detail="Token required",
        )

    current_agent.expo_push_token = token

    db.add(current_agent)

    db.commit()

    return {
        "success": True,
    }


# ================================
# AGENT AUTHENTICATION
# ================================


@router.post("/login", response_model=partner_schemas.AgentToken)
def agent_login(
    payload: partner_schemas.AgentLogin,
    db: Session = Depends(get_db),
):
    """
    Agent login endpoint.
    """
    try:
        agent = partner_utils.authenticate_agent(db, payload.email, payload.password)
        token = partner_utils.create_agent_token(agent)

        return partner_schemas.AgentToken(
            access_token=token, agent=partner_schemas.AgentOut.from_orm(agent)
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.get("/me")
def get_current_agent_profile(
    db: Session = Depends(get_db),
    current_agent: Agent = Depends(auth_utils.get_current_agent),
):
    """
    Get current agent's profile with partner hold status.
    """
    # Check if agent's partner is on hold
    hold = partner_utils.get_partner_hold_details(db, current_agent.partner_id)
    is_on_hold = hold is not None

    # Check if this agent is self-assigned (agent email == partner email)
    partner = (
        db.query(Partner)
        .filter(
            Partner.id == current_agent.partner_id,
            Partner.email == current_agent.email,
        )
        .first()
    )
    is_self_assigned = partner is not None

    return {
        "id": current_agent.id,
        "partner_id": current_agent.partner_id,
        "full_name": current_agent.full_name,
        "email": current_agent.email,
        "phone": current_agent.phone,
        "is_active": current_agent.is_active,
        "is_on_hold": is_on_hold,
        "hold_reason": hold.reason if hold else None,
        "hold_lift_date": hold.lift_date if hold else None,
        "is_self_assigned": is_self_assigned,
    }


@router.post("/switch-to-partner", response_model=dict)
def switch_to_partner_portal(
    db: Session = Depends(get_db),
    current_agent: Agent = Depends(auth_utils.get_current_agent),
):
    """
    Returns a partner JWT token for the partner associated with this self-assigned agent.
    Allows a self-assigned agent (whose email matches their partner account) to switch
    back to the partner portal without logging out and back in.
    """
    # Check that this agent is self-assigned (agent.email == partner.email)
    partner = (
        db.query(Partner)
        .filter(
            Partner.id == current_agent.partner_id,
            Partner.email == current_agent.email,
        )
        .first()
    )

    if not partner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This agent account is not self-assigned. Only self-assigned agents can switch to the partner portal.",
        )

    if partner.verification_status != "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Partner account is not approved.",
        )

    token = partner_utils.create_partner_token(partner)
    return {"access_token": token, "token_type": "bearer"}


# ================================
# AGENT ORDER MANAGEMENT
# ================================


@router.get("/orders", response_model=List[dict])
def get_agent_orders(
    status_filter: str = Query(None, description="Filter by order status"),
    db: Session = Depends(get_db),
    current_agent: Agent = Depends(auth_utils.get_current_agent),
):
    """
    Get all orders assigned to the current agent.
    """
    orders = partner_utils.get_agent_orders(
        db=db, agent_id=current_agent.id, status_filter=status_filter
    )

    result = []
    for order in orders:
        result.append(
            {
                "id": order.id,
                "phone_name": order.phone_name,
                "brand": order.brand,
                "model": order.model,
                "specs": f"{int(order.ram_gb)}GB RAM • {int(order.storage_gb)}GB Storage",
                "status": (
                    "pickup completed"
                    if order.status == "pickup_completed"
                    else order.status
                ),
                "estimated_value": order.ai_estimated_price,
                "customer_name": order.customer_name,
                "customer_phone": order.customer_phone,
                "pickup_address_line": order.pickup_address_line,
                "pickup_city": order.pickup_city,
                "pickup_state": order.pickup_state,
                "pickup_pincode": order.pickup_pincode,
                "pickup_date": (
                    order.pickup_date.strftime("%d/%m/%Y")
                    if order.pickup_date
                    else None
                ),
                "pickup_time": order.pickup_time,
                "payment_method": order.payment_method,
                "ram_gb": order.ram_gb,
                "storage_gb": order.storage_gb,
                "ai_estimated_price": order.ai_estimated_price,
                "final_quoted_price": order.final_quoted_price,
                "status_detail": (
                    "pickup completed"
                    if order.status == "pickup_completed"
                    else order.status
                ),
            }
        )

    return result


@router.get("/orders/{order_id}", response_model=dict)
def get_agent_order_detail(
    order_id: int,
    db: Session = Depends(get_db),
    current_agent: Agent = Depends(auth_utils.get_current_agent),
):
    """
    Get detailed information about a specific order.
    """
    order = partner_utils.validate_agent_order_access(db, current_agent.id, order_id)
    return {
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
        "pickup_date": (
            order.pickup_date.strftime("%d/%m/%Y") if order.pickup_date else None
        ),
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
    }


@router.post("/orders/{order_id}/complete-pickup", status_code=200)
def complete_pickup(
    order_id: int,
    final_offered_price: float = Form(...),
    customer_accepted: bool = Form(...),
    actual_condition: str = Form(default="Inspected"),
    pickup_notes: str = Form(default=""),
    payment_method: str = Form(default=""),
    phone_conditions: str = Form(default=None),
    photos: List[UploadFile] = File(default=None),
    db: Session = Depends(get_db),
    current_agent: Agent = Depends(auth_utils.get_current_agent),
):
    """
    Complete the pickup process with detailed phone inspection.
    Records actual condition, final price, customer acceptance, and photos.
    Stores all photos as binary BLOB data in the database.
    """
    # Check if agent's partner is on hold
    if partner_utils.check_partner_on_hold(db, current_agent.partner_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your partner account is on hold. You cannot complete pickups at this time. Contact your partner administrator.",
        )

    order = partner_utils.validate_agent_order_access(db, current_agent.id, order_id)

    # Validate order status - can complete from accepted_by_agent
    if order.status != "accepted_by_agent":
        raise HTTPException(
            status_code=400,
            detail=f"Can only complete pickup from accepted_by_agent status (current status: {order.status})",
        )

    # Update order with pickup completion details
    order.actual_condition = actual_condition
    order.final_offered_price = final_offered_price
    order.customer_accepted_offer = customer_accepted
    order.pickup_notes = pickup_notes or ""
    order.completed_at = datetime.utcnow()

    if payment_method:
        order.payment_method = payment_method

    # Parse phone conditions if provided
    phone_conditions_data = None
    if phone_conditions:
        try:
            phone_conditions_data = (
                json.loads(phone_conditions)
                if isinstance(phone_conditions, str)
                else phone_conditions
            )
        except:
            phone_conditions_data = None

    # Process and store photos as BLOB
    photos_metadata = []
    all_photos_blob = b""

    if photos and len(photos) > 0:
        for idx, photo in enumerate(photos):
            try:
                # Read photo file as binary
                # Try to read from file attribute first, then fallback to direct read
                if hasattr(photo, "file") and hasattr(photo.file, "read"):
                    photo_bytes = photo.file.read()
                else:
                    photo_bytes = photo.read()

                # Validate photo data
                if not photo_bytes or len(photo_bytes) == 0:
                    print(f"Warning: Photo {idx} is empty, skipping")
                    continue

                # Store binary data
                all_photos_blob += photo_bytes

                # Store metadata only (no base64 data)
                photos_metadata.append(
                    {
                        "index": idx,
                        "filename": photo.filename,
                        "content_type": photo.content_type,
                        "size_bytes": len(photo_bytes),
                        "captured_at": datetime.utcnow().isoformat(),
                    }
                )

                print(
                    f"Processed photo {idx}: {photo.filename} ({len(photo_bytes)} bytes)"
                )
            except Exception as e:
                # Log error but don't fail the entire request
                print(f"Error processing photo {idx}: {str(e)}")
                import traceback

                traceback.print_exc()
                continue

    # Create or update AgentPickupDetails record
    pickup_details = (
        db.query(AgentPickupDetails)
        .filter(AgentPickupDetails.order_id == order_id)
        .first()
    )

    if not pickup_details:
        pickup_details = AgentPickupDetails(
            order_id=order_id, agent_id=current_agent.id
        )
        db.add(pickup_details)

    # Update pickup details with BLOB data
    pickup_details.phone_conditions = phone_conditions_data
    pickup_details.photos_metadata = photos_metadata if photos_metadata else None
    pickup_details.photos_blob = all_photos_blob if all_photos_blob else None
    pickup_details.final_offered_price = int(final_offered_price)
    pickup_details.customer_accepted_offer = 1 if customer_accepted else 0
    pickup_details.payment_method = payment_method or None
    pickup_details.pickup_notes = pickup_notes or None
    pickup_details.actual_condition = actual_condition
    pickup_details.captured_at = datetime.utcnow()

    # Determine next status based on customer acceptance
    if customer_accepted:
        order.status = "pickup_completed"
        new_status = "pickup_completed"
        notes = f"Pickup completed. Customer accepted offer of ₹{final_offered_price}"
    else:
        order.status = "pickup_completed_declined"
        new_status = "pickup_completed_declined"
        notes = f"Pickup completed. Customer declined offer of ₹{final_offered_price}"

    if pickup_notes:
        notes += f" - Notes: {pickup_notes}"

    # Create status history
    create_status_history(
        db=db,
        order_id=order_id,
        from_status="accepted_by_agent",
        to_status=new_status,
        changed_by_user_type="agent",
        changed_by_user_id=current_agent.id,
        notes=notes,
    )

    db.commit()

    return {
        "message": "Pickup completed successfully",
        "order_id": order_id,
        "status": order.status,
        "customer_accepted": customer_accepted,
        "photos_count": len(photos_metadata),
        "total_blob_size": len(all_photos_blob),
    }


@router.post("/orders/{order_id}/process-payment", status_code=200)
def process_payment(
    order_id: int,
    payload: partner_schemas.ProcessPaymentRequest,
    db: Session = Depends(get_db),
    current_agent: Agent = Depends(auth_utils.get_current_agent),
):
    """
    Process payment for a completed pickup.
    Only available if customer accepted the offer.
    """
    # Check if agent's partner is on hold
    if partner_utils.check_partner_on_hold(db, current_agent.partner_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your partner account is on hold. You cannot process payments at this time. Contact your partner administrator.",
        )

    order = partner_utils.validate_agent_order_access(db, current_agent.id, order_id)

    # Validate order status
    if order.status != "pickup_completed":
        raise HTTPException(
            status_code=400,
            detail=f"Can only process payment for completed pickups (current status: {order.status})",
        )

    if not order.customer_accepted_offer:
        raise HTTPException(
            status_code=400,
            detail="Cannot process payment - customer declined the offer",
        )

    # Update order with payment details
    order.payment_amount = payload.payment_amount
    order.payment_method = payload.payment_method
    order.payment_transaction_id = payload.transaction_id
    order.payment_notes = payload.payment_notes
    order.payment_processed_at = datetime.utcnow()
    order.status = "payment_processed"

    # Create status history
    notes = (
        f"Payment of ₹{payload.payment_amount} processed via {payload.payment_method}"
    )
    if payload.transaction_id:
        notes += f" (Transaction ID: {payload.transaction_id})"
    if payload.payment_notes:
        notes += f" - Notes: {payload.payment_notes}"

    create_status_history(
        db=db,
        order_id=order_id,
        from_status="pickup_completed",
        to_status="payment_processed",
        changed_by_user_type="agent",
        changed_by_user_id=current_agent.id,
        notes=notes,
    )

    db.commit()

    return {
        "message": "Payment processed successfully",
        "order_id": order_id,
        "payment_amount": payload.payment_amount,
        "payment_method": payload.payment_method,
        "status": order.status,
    }


@router.post("/orders/{order_id}/reschedule-pickup", status_code=200)
def reschedule_pickup(
    order_id: int,
    payload: partner_schemas.ReschedulePickupRequest,
    db: Session = Depends(get_db),
    current_agent: Agent = Depends(auth_utils.get_current_agent),
):
    """
    Reschedule a pickup that was previously scheduled.
    """
    order = partner_utils.validate_agent_order_access(db, current_agent.id, order_id)

    # Validate order status
    if order.status != "accepted_by_agent":
        raise HTTPException(
            status_code=400,
            detail=f"Can only reschedule pickup from accepted_by_agent status (current status: {order.status})",
        )

    old_date = (
        order.pickup_date.strftime("%d/%m/%Y") if order.pickup_date else "Not set"
    )
    old_time = order.pickup_time or "Not set"

    # Update order with new pickup schedule
    order.pickup_date = payload.new_date
    order.pickup_time = payload.new_time

    # Create status history
    notes = f"Pickup rescheduled from {old_date} {old_time} to {payload.new_date} at {payload.new_time}. Reason: {payload.reschedule_reason}"
    if payload.notes:
        notes += f" - Notes: {payload.notes}"

    create_status_history(
        db=db,
        order_id=order_id,
        from_status="accepted_by_agent",
        to_status="assigned_to_agent",
        changed_by_user_type="agent",
        changed_by_user_id=current_agent.id,
        notes=notes,
    )

    db.commit()

    return {
        "message": "Pickup rescheduled successfully",
        "order_id": order_id,
        "new_pickup_date": payload.new_date,
        "new_pickup_time": payload.new_time,
    }


@router.post("/orders/{order_id}/cancel-pickup", status_code=200)
def cancel_pickup(
    order_id: int,
    payload: partner_schemas.CancelPickupRequest,
    db: Session = Depends(get_db),
    current_agent: Agent = Depends(auth_utils.get_current_agent),
):
    """
    Cancel a pickup when customer is not willing to sell.
    Marks the order as cancelled (terminal state).
    """
    order = partner_utils.validate_agent_order_access(db, current_agent.id, order_id)

    # Validate order status
    if order.status != "accepted_by_agent":
        raise HTTPException(
            status_code=400,
            detail=f"Can only cancel pickup from accepted_by_agent status (current status: {order.status})",
        )

    old_status = order.status

    # Update order - mark as cancelled (customer doesn't want to sell)
    order.status = "cancelled"
    order.cancelled_at = datetime.utcnow()
    order.cancellation_reason = payload.cancellation_reason
    # Keep agent assignment but mark as cancelled

    # Create status history
    notes = f"Order cancelled by agent {current_agent.full_name}. Customer not willing to sell. Reason: {payload.cancellation_reason}"
    if payload.notes:
        notes += f" - Notes: {payload.notes}"

    create_status_history(
        db=db,
        order_id=order_id,
        from_status=old_status,
        to_status="cancelled",
        changed_by_user_type="agent",
        changed_by_user_id=current_agent.id,
        notes=notes,
    )

    db.commit()

    return {
        "message": "Order cancelled. Customer is not willing to sell.",
        "order_id": order_id,
        "status": order.status,
    }
