from urllib import response

from fastapi import APIRouter, Depends, Query, HTTPException, status, Body
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from backend.shared.db.connections import get_db
from ..schema.models import PhoneList, Order, LeadLock, OrderStatusHistory, Coupon
from ..schema import schemas as sell_schemas
from ..utils import (
    mock_ai_price_prediction,
    get_serviceable_partners,
    calculate_lead_cost,
    check_active_lock,
    create_status_history,
    get_lock_duration_minutes,
    deduct_partner_credits,
    expire_lock_if_needed,
)
from backend.services.auth import utils as auth_utils, models as auth_models
from backend.services.partner.schema.models import Partner, PartnerServiceablePincode
from backend.services.admin.schema.models import PartnerCreditTransaction
from math import ceil
from datetime import datetime, timedelta
from typing import List, Optional
from backend.socket_manager import (
    sio,
    connected_partner_pincodes,
    connected_partners,
)
import threading
import requests

router = APIRouter(prefix="/sell-phone", tags=["Sell Phone"])

# Simple geocoder (Nominatim via geopy)
# Note: pickup coordinates removed — geocoding not required here anymore.


@router.get("/phones")
def get_phones_list(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(10, ge=1, le=1000, description="Items per page"),
    search: str = Query(None, description="Search query"),
    brand: str = Query(None, description="Brand filter"),
):
    """
    Fuzzy/typo-tolerant phone search endpoint.

    Features:
    - Trigram-based similarity search using PostgreSQL pg_trgm
    - Handles typos and partial matches (e.g., "7T pro", "nord 5", "onepluss 7T")
    - Deduplicates by Brand + Model (returns highest variant price)
    - Supports pagination with page and limit parameters
    - Returns top-N results ordered by similarity score

    Example:
        GET /sell-phone/phones?search=7t+pro&page=1&limit=10
    """

    if not search:
        # If no search query, return all unique phones paginated
        subquery = (
            db.query(
                PhoneList.Brand, PhoneList.Model, func.max(PhoneList.id).label("max_id")
            )
            .group_by(PhoneList.Brand, PhoneList.Model)
            .subquery()
        )

        phones_query = db.query(PhoneList).join(
            subquery, PhoneList.id == subquery.c.max_id
        )

        # Apply brand filter
        if brand:
            phones_query = phones_query.filter(
                func.lower(PhoneList.Brand) == brand.lower()
            )

        total_phones = phones_query.count()

        phones_query = phones_query.order_by(PhoneList.Brand, PhoneList.Model)

        phones = phones_query.offset((page - 1) * limit).limit(limit).all()
    else:
        # Normalize search input: strip whitespace and convert to lowercase
        search_normalized = search.lower().strip()

        # Similarity score calculation using PostgreSQL pg_trgm
        similarity_score = func.similarity(PhoneList.search_text, search_normalized)

        # Build the query with trigram similarity filtering
        # Use both ILIKE (for exact substring matches) and % operator (for fuzzy trigram matches)
        query = db.query(PhoneList, similarity_score.label("similarity"))

        # Apply brand filter
        if brand:
            query = query.filter(func.lower(PhoneList.Brand) == brand.lower())

        query = query.filter(
            # Match using trigram % operator OR substring match
            PhoneList.search_text.op("%")(search_normalized)
            | PhoneList.search_text.ilike(f"%{search_normalized}%")
        ).order_by(
            # Order by similarity score (descending) and then by Brand/Model for consistency
            similarity_score.desc(),
            PhoneList.Brand,
            PhoneList.Model,
        )

        # Fetch all results and deduplicate by Brand + Model
        # Keep only the highest-priced variant for each Brand+Model combo
        all_results = query.all()

        # Dictionary to store deduplicated results: (Brand, Model) -> (PhoneList object, similarity)
        deduped = {}
        for phone_obj, sim_score in all_results:
            key = (phone_obj.Brand, phone_obj.Model)
            if key not in deduped:
                deduped[key] = (phone_obj, sim_score)
            else:
                # Keep the one with higher selling price for the same Brand+Model
                existing_phone, existing_sim = deduped[key]
                if phone_obj.Selling_Price > existing_phone.Selling_Price:
                    deduped[key] = (phone_obj, sim_score)

        # Sort deduplicated results by similarity score
        sorted_results = sorted(deduped.values(), key=lambda x: x[1], reverse=True)

        total_phones = len(sorted_results)
        # Apply pagination to the deduplicated, sorted results
        paginated_results = sorted_results[
            (page - 1) * limit : (page - 1) * limit + limit
        ]
        phones = [phone_obj for phone_obj, _ in paginated_results]

    # Format response
    result_phones = []
    for phone in phones:
        # Get highest variant price for the same brand/model
        highest_variant = (
            db.query(func.max(PhoneList.Selling_Price))
            .filter(PhoneList.Brand == phone.Brand, PhoneList.Model == phone.Model)
            .scalar()
        )

        result_phones.append(
            {
                "id": phone.id,
                "Brand": phone.Brand,
                "Series": phone.Series,
                "Model": phone.Model,
                "Storage_Raw": phone.Storage_Raw,
                "Original_Price": phone.Original_Price,
                "Selling_Price": highest_variant or phone.Selling_Price,
                "RAM_GB": phone.RAM_GB,
                "Internal_Storage_GB": phone.Internal_Storage_GB,
                "image_url": phone.image_url,
                "image_blob": phone.image_blob,
            }
        )

    total_pages = ceil(total_phones / limit) if total_phones > 0 else 1

    return {
        "phones": result_phones,
        "page": page,
        "limit": limit,
        "total": total_phones,
        "total_pages": total_pages,
    }


@router.get("/phones/{phone_id}")
def get_phone(phone_id: int, db: Session = Depends(get_db)):
    phone = db.query(PhoneList).filter(PhoneList.id == phone_id).first()
    if not phone:
        raise HTTPException(status_code=404, detail="Phone not found")

    # Get the highest variant price for this phone model
    highest_variant = (
        db.query(func.max(PhoneList.Selling_Price))
        .filter(PhoneList.Brand == phone.Brand, PhoneList.Model == phone.Model)
        .scalar()
    )

    return {
        "id": phone.id,
        "Brand": phone.Brand,
        "Series": phone.Series,
        "Model": phone.Model,
        "Storage_Raw": phone.Storage_Raw,
        "Original_Price": phone.Original_Price,
        "Selling_Price": highest_variant or phone.Selling_Price,
        "RAM_GB": phone.RAM_GB,
        "Internal_Storage_GB": phone.Internal_Storage_GB,
        "image_url": phone.image_url,
        "image_blob": phone.image_blob,
    }


@router.get("/phones/{phone_id}/variants")
def get_phone_variants(phone_id: int, db: Session = Depends(get_db)):
    phone = db.query(PhoneList).filter(PhoneList.id == phone_id).first()
    if not phone:
        raise HTTPException(status_code=404, detail="Phone not found")

    variants = (
        db.query(PhoneList.RAM_GB, PhoneList.Internal_Storage_GB)
        .filter(PhoneList.Brand == phone.Brand, PhoneList.Model == phone.Model)
        .distinct()
        .all()
    )

    rams = sorted(set(v.RAM_GB for v in variants if v.RAM_GB is not None))
    storages = sorted(
        set(
            v.Internal_Storage_GB for v in variants if v.Internal_Storage_GB is not None
        )
    )

    return {"rams": rams, "storages": storages}


def send_push_notification(token, title, body, data=None):
    message = {
        "to": token,
        "sound": "default",
        "title": title,
        "body": body,
        "channelId": "default",
        "priority": "high",
        "data": data or {},
    }

    response = requests.post(
        "https://exp.host/--/api/v2/push/send",
        json=message,
    )

    print("EXPO PUSH RESPONSE:", response.text)


@router.get("/phones/{phone_id}/price")
def get_phone_variant_price(
    phone_id: int,
    ram_gb: int = Query(..., description="RAM in GB"),
    storage_gb: int = Query(..., description="Storage in GB"),
    db: Session = Depends(get_db),
):
    phone = db.query(PhoneList).filter(PhoneList.id == phone_id).first()
    if not phone:
        raise HTTPException(status_code=404, detail="Phone not found")

    variant_query = db.query(PhoneList.Selling_Price).filter(
        PhoneList.Brand == phone.Brand,
        PhoneList.Model == phone.Model,
        PhoneList.Internal_Storage_GB == storage_gb,
    )

    if ram_gb and ram_gb > 0:
        variant_query = variant_query.filter(PhoneList.RAM_GB == ram_gb)

    variant = variant_query.first()

    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")

    return {"base_price": variant.Selling_Price}


@router.post(
    "/orders", response_model=sell_schemas.OrderCreateResponse, status_code=201
)
def create_order(
    payload: sell_schemas.OrderCreate,
    current_user: auth_models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create an order linked to current authenticated user.
    Uses the provided quoted price as the AI estimated price.
    Automatically distributes as lead to partners if pincode is serviceable.

    PINCODE VALIDATION:
    - Pincode must be serviceable by at least one partner
    - Non-serviceable pincodes will be rejected with appropriate error message
    """
    # Validate pincode is provided
    if not payload.pincode or len(payload.pincode.strip()) != 6:
        raise HTTPException(
            status_code=400, detail="Invalid pincode format. Must be 6 digits."
        )

    # Check pincode serviceability using utility function
    serviceable_partners = get_serviceable_partners(db, payload.pincode)
    is_serviceable = serviceable_partners > 0

    # BLOCK order creation if pincode is not serviceable
    if not is_serviceable:
        raise HTTPException(
            status_code=400,
            detail="Cannot create orders in this pincode area. Please try a different pincode.",
        )

    # Use quoted_price as ai_estimated_price
    quoted_price = payload.quoted_price or 0

    # Validate/Apply Coupon
    coupon_amount = 0.0
    if payload.coupon_code:
        coupon = (
            db.query(Coupon)
            .filter(Coupon.code == payload.coupon_code, Coupon.is_active == True)
            .first()
        )
        if coupon:
            # Trust that frontend already called /coupons/validate for phone-specific check
            coupon_amount = coupon.amount

    final_quoted_price = quoted_price + coupon_amount

    # Create order
    order = Order(
        # Link to customer
        customer_id=current_user.id,
        user_id=current_user.id,  # Legacy field
        # Phone details
        phone_name=payload.phone_name,
        brand=payload.brand,
        model=payload.model,
        ram_gb=payload.ram_gb,
        storage_gb=payload.storage_gb,
        variant=payload.variant,
        condition=getattr(payload, "condition", None),
        # AI prediction results (using quoted price)
        ai_estimated_price=quoted_price,
        ai_reasoning="Price provided by customer",
        customer_condition_answers=payload.customer_condition_answers,
        # Pricing (base)
        quoted_price=quoted_price,
        final_quoted_price=final_quoted_price,
        coupon_code_applied=payload.coupon_code,
        coupon_bonus_amount=coupon_amount,
        # Customer contact info
        customer_name=payload.customer_name or current_user.full_name,
        customer_phone=payload.phone_number or current_user.phone,
        customer_email=payload.email or current_user.email,
        phone_number=payload.phone_number or current_user.phone,  # Legacy
        email=payload.email or current_user.email,  # Legacy
        # Pickup address
        address_line=payload.address_line,
        city=payload.city,
        state=payload.state,
        pincode=payload.pincode,
        # Canonical pickup fields
        pickup_address_line=payload.address_line,
        pickup_city=payload.city,
        pickup_state=payload.state,
        pickup_pincode=payload.pincode,
        pickup_date=payload.pickup_date,
        pickup_time=payload.pickup_time,
        # Payment method
        payment_method=payload.payment_method,
        # Initial status - set to available_for_partners since we validated serviceability above
        status="available_for_partners",
    )
    # (No coordinates stored for pickup anymore)

    db.add(order)
    db.flush()  # Get order.id before creating history

    # Create status history entry
    create_status_history(
        db=db,
        order_id=order.id,
        from_status=None,
        to_status=order.status,
        changed_by_user_type="customer",
        changed_by_user_id=current_user.id,
        notes=f"Order created with quoted price: ₹{quoted_price}",
    )

    db.commit()
    db.refresh(order)

    # =========================================
    # REALTIME SOCKET NOTIFICATION
    # =========================================

    notification_data = {
        "order_id": order.id,
        "customer_name": order.customer_name,
        "phone_name": order.phone_name,
        "brand": order.brand,
        "model": order.model,
        "pincode": order.pincode,
        "price": order.final_quoted_price,
        "status": order.status,
    }

    # Send realtime event to all connected partners
    for sid, pincodes in connected_partner_pincodes.items():

        print("ORDER PINCODE:", payload.pincode)
        print("PARTNER PINCODES:", pincodes)

        normalized_order_pincode = str(payload.pincode).strip()

        normalized_partner_pincodes = [str(p).strip() for p in pincodes]

        if normalized_order_pincode in normalized_partner_pincodes:

            print("MATCHED PARTNER SOCKET:", sid)

            def emit_notification(current_sid=sid):
                import asyncio

                async def send():
                    await sio.emit(
                        "new_order",
                        notification_data,
                        to=current_sid,
                    )

                asyncio.run(send())

            threading.Thread(target=emit_notification).start()

            print(f"Sent order {order.id} to partner socket {sid}")

            partner_data = connected_partners.get(sid)

            if partner_data:

                partner_id = partner_data.get("partner_id")

                partner = db.query(Partner).filter(Partner.id == partner_id).first()

                if partner and partner.expo_push_token:

                    print("SENDING PUSH TO:", partner.expo_push_token)

                    send_push_notification(
                        partner.expo_push_token,
                        "New Order Available",
                        f"{order.brand} {order.model}",
                        {
                            "order_id": order.id,
                            "screen": "lead-detail",
                        },
                    )

                    print("PUSH NOTIFICATION SENT")

    print("Realtime new_order emitted:", notification_data)

    # Build Pydantic response explicitly (don't return SQLAlchemy model directly)
    pyd_order = sell_schemas.OrderOut.model_validate(order)

    return sell_schemas.OrderCreateResponse(
        order=pyd_order,
        serviceable=is_serviceable,
        serviceable_partners_count=serviceable_partners,
    )


@router.post("/coupons/validate", response_model=sell_schemas.CouponValidateResponse)
def validate_coupon(
    payload: sell_schemas.CouponValidateRequest, db: Session = Depends(get_db)
):
    coupon = (
        db.query(Coupon)
        .filter(Coupon.code == payload.code, Coupon.is_active == True)
        .first()
    )
    if not coupon:
        return sell_schemas.CouponValidateResponse(
            valid=False, message="Invalid or inactive coupon code"
        )

    if not coupon.is_global:
        if not payload.phone_id:
            return sell_schemas.CouponValidateResponse(
                valid=False, message="This coupon is specific to another phone model"
            )

        # Get both phones to compare their model/brand
        current_phone = (
            db.query(PhoneList).filter(PhoneList.id == payload.phone_id).first()
        )
        applicable_phone = (
            db.query(PhoneList)
            .filter(PhoneList.id == coupon.applicable_phone_id)
            .first()
        )

        if not current_phone or not applicable_phone:
            return sell_schemas.CouponValidateResponse(
                valid=False, message="This coupon is not applicable to this phone"
            )

        # Compare Model and Brand instead of internal variant ID
        if (
            current_phone.Brand.lower() != applicable_phone.Brand.lower()
            or current_phone.Model.lower() != applicable_phone.Model.lower()
        ):
            return sell_schemas.CouponValidateResponse(
                valid=False, message="This coupon is not applicable to this phone model"
            )

    return sell_schemas.CouponValidateResponse(
        valid=True, message="Coupon applied successfully", amount=coupon.amount
    )


@router.get("/my-orders", response_model=list[sell_schemas.OrderOut])
def get_my_orders(
    db: Session = Depends(get_db),
    current_user: auth_models.User = Depends(auth_utils.get_current_user),
):
    """
    Get orders for the current user.
    """
    query = db.query(Order).filter(Order.customer_id == current_user.id)
    return query.order_by(Order.created_at.desc()).all()


@router.post(
    "/orders/{order_id}/cancel", response_model=sell_schemas.OrderCancelResponse
)
def cancel_order(
    order_id: int,
    cancel_data: sell_schemas.OrderCancel,
    db: Session = Depends(get_db),
    current_user: auth_models.User = Depends(auth_utils.get_current_user),
):
    """
    Cancel an order if it hasn't been purchased by a partner.
    Only the order owner can cancel their order.
    """
    # Find the order
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Check if user owns this order
    if order.customer_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="You can only cancel your own orders"
        )

    # Check if order can be cancelled (not purchased by partner)
    if order.status == "lead_purchased":
        raise HTTPException(
            status_code=400,
            detail="Order cannot be cancelled as it has already been purchased by a partner",
        )

    # Check if order is already cancelled
    if order.status == "cancelled":
        raise HTTPException(status_code=400, detail="Order is already cancelled")

    # Check if order is completed
    if order.status in ["pickup_completed", "payment_processed"]:
        raise HTTPException(
            status_code=400, detail="Completed orders cannot be cancelled"
        )

    # Cancel the order
    from datetime import datetime

    order.status = "cancelled"
    order.cancelled_at = datetime.utcnow()
    order.cancellation_reason = cancel_data.reason

    # Create status history
    create_status_history(
        db,
        order.id,
        "cancelled",
        f"Cancelled by customer: {cancel_data.reason or 'No reason provided'}",
    )

    db.commit()
    db.refresh(order)

    return sell_schemas.OrderCancelResponse(
        success=True,
        message="Order cancelled successfully",
        order_id=order.id,
        cancelled_at=order.cancelled_at,
        phone_name=order.phone_name,
        brand=order.brand,
        model=order.model,
        ram_gb=order.ram_gb,
        storage_gb=order.storage_gb,
        variant=order.variant,
    )


# ================================
# PARTNER LEAD MARKETPLACE ENDPOINTS
# ================================


@router.get("/partner/leads/available", response_model=List[sell_schemas.LeadSummary])
def get_available_leads(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    brand: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_partner: Partner = Depends(auth_utils.get_current_partner),
):
    """
    Get available leads in partner's serviceable pincodes.
    Shows leads that are not locked or purchased by others.
    """
    # Check if partner is on hold
    from backend.services.partner import utils as partner_utils

    if partner_utils.check_partner_on_hold(db, current_partner.id):
        return []  # Return empty list instead of raising error for better UX

    # Get partner's serviceable pincodes
    serviceable_pincodes = (
        db.query(PartnerServiceablePincode.pincode)
        .filter(
            PartnerServiceablePincode.partner_id == current_partner.id,
            PartnerServiceablePincode.is_active == True,
        )
        .all()
    )

    pincode_list = [p.pincode for p in serviceable_pincodes]

    if not pincode_list:
        return []

    # Base query: orders in partner's pincodes with status available_for_partners
    # Use pickup_pincode when available, fall back to legacy pincode
    query = db.query(Order).filter(
        func.coalesce(Order.pickup_pincode, Order.pincode).in_(pincode_list),
        Order.status == "available_for_partners",
    )

    # Apply filters
    if min_price is not None:
        query = query.filter(Order.final_quoted_price >= min_price)
    if max_price is not None:
        query = query.filter(Order.final_quoted_price <= max_price)
    if brand:
        query = query.filter(Order.brand.ilike(f"%{brand}%"))

    # Get total count before pagination
    total = query.count()

    # Paginate
    orders = (
        query.order_by(Order.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    # Calculate lead cost for each and check lock status
    leads = []
    for order in orders:
        # Expire any expired locks before checking
        expire_lock_if_needed(db, order.id)

        lead_cost = calculate_lead_cost(
            db, order.final_quoted_price or order.quoted_price
        )

        # Check if this lead is actively locked
        active_lock = check_active_lock(db, order.id)
        is_locked = active_lock is not None
        locked_by_me = is_locked and active_lock.partner_id == current_partner.id

        leads.append(
            sell_schemas.LeadSummary(
                order_id=order.id,
                phone_name=order.phone_name,
                brand=order.brand,
                model=order.model,
                ram_gb=order.ram_gb,
                storage_gb=order.storage_gb,
                condition=order.condition,
                quoted_price=order.final_quoted_price or order.quoted_price,
                ai_estimated_price=order.ai_estimated_price,
                pickup_pincode=(order.pickup_pincode or order.pincode),
                pickup_city=(order.pickup_city or order.city),
                pickup_state=(order.pickup_state or order.state),
                pickup_date=order.pickup_date,
                lead_cost=lead_cost,
                is_locked=is_locked,
                locked_by_me=locked_by_me,
                created_at=order.created_at,
            )
        )

    return leads


@router.get("/partner/leads/{order_id}", response_model=sell_schemas.LeadDetailResponse)
def get_lead_detail(
    order_id: int,
    db: Session = Depends(get_db),
    current_partner: Partner = Depends(auth_utils.get_current_partner),
):
    """
    Get full lead details. Only available if:
    1. Lead is in partner's serviceable pincode
    2. Lead is not locked by another partner
    3. Partner has locked this lead OR lead is available
    """
    # Get order
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Verify partner services this pincode (use pickup_pincode with fallback)
    serviceable = (
        db.query(PartnerServiceablePincode)
        .filter(
            PartnerServiceablePincode.partner_id == current_partner.id,
            PartnerServiceablePincode.pincode
            == (order.pickup_pincode or order.pincode),
            PartnerServiceablePincode.is_active == True,
        )
        .first()
    )

    if not serviceable:
        raise HTTPException(
            status_code=403, detail="This lead is not in your serviceable area"
        )

    # Check lock status
    expire_lock_if_needed(db, order_id)
    active_lock = check_active_lock(db, order_id)

    if active_lock:
        # If locked by another partner, deny access
        if active_lock.partner_id != current_partner.id:
            raise HTTPException(
                status_code=403,
                detail="This lead is currently locked by another partner",
            )

    # Calculate lead cost
    lead_cost = calculate_lead_cost(db, order.final_quoted_price or order.quoted_price)

    # Return full details including customer contact info
    return sell_schemas.LeadDetailResponse(
        order_id=order.id,
        phone_name=order.phone_name,
        brand=order.brand,
        model=order.model,
        ram_gb=order.ram_gb,
        storage_gb=order.storage_gb,
        variant=order.variant,
        condition=order.condition,
        customer_condition_answers=order.customer_condition_answers,
        quoted_price=order.final_quoted_price or order.quoted_price,
        ai_estimated_price=order.ai_estimated_price,
        ai_reasoning=order.ai_reasoning,
        customer_name=order.customer_name,
        customer_phone=order.customer_phone,
        customer_email=order.customer_email,
        pickup_address=(order.pickup_address_line or order.address_line or ""),
        pickup_pincode=(order.pickup_pincode or order.pincode or ""),
        pickup_city=(order.pickup_city or order.city or None),
        pickup_state=(order.pickup_state or order.state or None),
        pickup_date=order.pickup_date,
        pickup_time=order.pickup_time,
        lead_cost=lead_cost,
        is_locked=active_lock is not None,
        locked_until=active_lock.expires_at if active_lock else None,
        created_at=order.created_at,
    )


@router.post("/partner/leads/{order_id}/lock", status_code=200)
def lock_lead(
    order_id: int,
    db: Session = Depends(get_db),
    current_partner: Partner = Depends(auth_utils.get_current_partner),
):
    """
    Lock a lead for exclusive viewing. Race-condition safe.
    Lock expires after configured duration (default 15 minutes).
    """
    # Check if partner is on hold
    from backend.services.partner import utils as partner_utils

    if partner_utils.check_partner_on_hold(db, current_partner.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is on hold. You cannot access leads at this time. Contact support for details.",
        )

    # Get order
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Verify status
    if order.status != "available_for_partners":
        raise HTTPException(
            status_code=400,
            detail=f"Lead is not available (current status: {order.status})",
        )

    # Verify partner services this pincode
    serviceable = (
        db.query(PartnerServiceablePincode)
        .filter(
            PartnerServiceablePincode.partner_id == current_partner.id,
            PartnerServiceablePincode.pincode
            == (order.pickup_pincode or order.pincode),
            PartnerServiceablePincode.is_active == True,
        )
        .first()
    )

    if not serviceable:
        raise HTTPException(
            status_code=403, detail="This lead is not in your serviceable area"
        )

    # Check for existing active lock (race-safe with SELECT FOR UPDATE)
    existing_lock = (
        db.query(LeadLock)
        .filter(
            LeadLock.order_id == order_id,
            LeadLock.is_active == True,
            LeadLock.expires_at > datetime.utcnow(),
        )
        .with_for_update()
        .first()
    )

    if existing_lock:
        if existing_lock.partner_id == current_partner.id:
            # Partner already has the lock, extend it
            lock_duration = get_lock_duration_minutes(db)
            print("LOCK DURATION:", lock_duration)
            existing_lock.expires_at = datetime.utcnow() + timedelta(
                minutes=lock_duration
            )
            db.commit()

            return {
                "message": "Lock extended successfully",
                "lock_expires_at": existing_lock.expires_at,
                "order_id": order_id,
            }
        else:
            # Another partner has an active lock
            raise HTTPException(
                status_code=409,
                detail=f"Lead is currently locked by another partner until {existing_lock.expires_at}",
            )

    # Create new lock
    lock_duration = get_lock_duration_minutes(db)
    new_lock = LeadLock(
        order_id=order_id,
        partner_id=current_partner.id,
        locked_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(minutes=lock_duration),
        is_active=True,
    )

    db.add(new_lock)

    print("CURRENT UTC:", datetime.utcnow())
    print("LOCK EXPIRES AT:", new_lock.expires_at)

    # Update order status and timestamps
    order.status = "lead_locked"
    order.partner_id = current_partner.id
    order.lead_locked_at = datetime.utcnow()
    order.lead_lock_expires_at = new_lock.expires_at

    # Create status history
    create_status_history(
        db=db,
        order_id=order_id,
        from_status="available_for_partners",
        to_status="lead_locked",
        changed_by_user_type="partner",
        changed_by_user_id=current_partner.id,
        notes=f"Lead locked by partner for {lock_duration} minutes",
    )

    db.commit()

    return {
        "message": "Lead locked successfully",
        "lock_expires_at": new_lock.expires_at,
        "order_id": order_id,
    }


@router.delete("/partner/leads/{order_id}/unlock", status_code=200)
def unlock_lead(
    order_id: int,
    db: Session = Depends(get_db),
    current_partner: Partner = Depends(auth_utils.get_current_partner),
):
    """
    Release a locked lead back to the marketplace.
    Can only unlock leads locked by the current partner.
    """
    # Get active lock
    active_lock = (
        db.query(LeadLock)
        .filter(
            LeadLock.order_id == order_id,
            LeadLock.partner_id == current_partner.id,
            LeadLock.is_active == True,
        )
        .first()
    )

    if not active_lock:
        raise HTTPException(
            status_code=404, detail="No active lock found for this lead by your account"
        )

    # Deactivate lock
    active_lock.is_active = False

    # Update order status back to available
    order = db.query(Order).filter(Order.id == order_id).first()
    if order:
        order.status = "available_for_partners"
        order.partner_id = None
        order.lead_locked_at = None
        order.lead_lock_expires_at = None

        # Create status history
        create_status_history(
            db=db,
            order_id=order_id,
            from_status="lead_locked",
            to_status="available_for_partners",
            changed_by_user_type="partner",
            changed_by_user_id=current_partner.id,
            notes="Lead unlocked and returned to marketplace",
        )

    db.commit()

    return {"message": "Lead unlocked successfully", "order_id": order_id}


@router.post("/partner/leads/{order_id}/purchase", status_code=200)
def purchase_lead(
    order_id: int,
    db: Session = Depends(get_db),
    current_partner: Partner = Depends(auth_utils.get_current_partner),
):
    """
    Purchase a locked lead by deducting credits from partner account.
    Race-condition safe with SELECT FOR UPDATE on partner credits.
    """
    # Check if partner is on hold
    from backend.services.partner import utils as partner_utils

    if partner_utils.check_partner_on_hold(db, current_partner.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is on hold. You cannot purchase leads at this time. Contact support for details.",
        )

    # Verify active lock owned by this partner
    expire_lock_if_needed(db, order_id)
    active_lock = (
        db.query(LeadLock)
        .filter(
            LeadLock.order_id == order_id,
            LeadLock.partner_id == current_partner.id,
            LeadLock.is_active == True,
            LeadLock.expires_at > datetime.utcnow(),
        )
        .first()
    )

    if not active_lock:
        raise HTTPException(
            status_code=403,
            detail="You must have an active lock on this lead to purchase it",
        )

    # Get order
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status != "lead_locked":
        raise HTTPException(
            status_code=400,
            detail=f"Lead is not in locked status (current: {order.status})",
        )

    # Calculate lead cost
    lead_cost = calculate_lead_cost(db, order.final_quoted_price or order.quoted_price)

    # Deduct credits (race-safe with SELECT FOR UPDATE)
    try:
        transaction = deduct_partner_credits(
            db=db,
            partner_id=current_partner.id,
            amount=lead_cost,
            transaction_type="lead_purchase",
            description=f"Purchase lead #{order_id} - {order.brand} {order.model}",
            order_id=order_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Update order with partner info
    order.partner_id = current_partner.id
    order.status = "lead_purchased"
    order.purchased_at = datetime.utcnow()

    # Deactivate lock (lead is now owned)
    active_lock.is_active = False

    # Create status history
    create_status_history(
        db=db,
        order_id=order_id,
        from_status="lead_locked",
        to_status="lead_purchased",
        changed_by_user_type="partner",
        changed_by_user_id=current_partner.id,
        notes=f"Lead purchased for ₹{lead_cost} credits",
    )

    db.commit()
    db.refresh(order)

    return {
        "message": "Lead purchased successfully",
        "order_id": order_id,
        "credits_deducted": lead_cost,
        "remaining_credits": transaction.balance_after,
        "order_status": order.status,
    }
