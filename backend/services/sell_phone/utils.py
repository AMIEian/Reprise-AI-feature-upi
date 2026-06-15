"""
Utility functions for order and lead management.
"""

from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from backend.services.sell_phone.schema.models import (
    Order,
    OrderStatusHistory,
    LeadLock,
)
from backend.services.partner.schema.models import Partner, PartnerServiceablePincode
from backend.services.admin.schema.models import (
    AdminCreditConfiguration,
    PartnerCreditTransaction,
)


def get_lead_cost_percentage(db: Session) -> float:
    """
    Get the lead cost percentage from admin configuration.
    Default to 15% if not configured.
    """
    config = (
        db.query(AdminCreditConfiguration)
        .filter(AdminCreditConfiguration.config_key == "lead_cost_percentage")
        .first()
    )

    if config:
        try:
            return float(config.config_value)
        except ValueError:
            pass

    return 15.0  # Default


def calculate_lead_cost(db: Session, quoted_price: float) -> float:
    """
    Calculate lead cost based on quoted price and admin configuration.
    Signature: (db, quoted_price) to match callers in routes.
    Lead Cost = Quoted Price × (Lead Cost Percentage / 100)
    """
    percentage = get_lead_cost_percentage(db)
    try:
        price = float(quoted_price or 0.0)
    except Exception:
        price = 0.0
    return round(price * (percentage / 100), 2)


def get_lock_duration_minutes(db: Session) -> int:
    """
    Get the default lock duration from admin configuration.
    Default to 10 minutes if not configured.
    """

    config = (
        db.query(AdminCreditConfiguration)
        .filter(AdminCreditConfiguration.config_key == "default_lock_duration_minutes")
        .first()
    )

    if config:
        try:

            minutes = int(config.config_value)

            print("LOCK DURATION FROM DB:", minutes)

            if minutes <= 0:
                print("INVALID LOCK DURATION, USING DEFAULT 10")
                return 10

            return minutes

        except Exception as e:

            print("LOCK DURATION ERROR:", e)

            return 10

    return 10


def check_active_lock(db: Session, order_id: int) -> Optional[LeadLock]:
    """
    Check if there's an active lock on an order.
    Signature: (db, order_id) to match callers.
    Returns the lock if active and not expired, None otherwise.
    """
    lock = (
        db.query(LeadLock)
        .filter(
            LeadLock.order_id == order_id,
            LeadLock.is_active == True,
            LeadLock.expires_at > datetime.utcnow(),
        )
        .first()
    )

    return lock


def create_status_history(
    order_id: int,
    from_status: Optional[str],
    to_status: str,
    changed_by_user_type: Optional[str] = None,
    changed_by_user_id: Optional[int] = None,
    notes: Optional[str] = None,
    db: Session = None,
):
    """
    Create an order status history entry.
    """
    if not db:
        return None

    history = OrderStatusHistory(
        order_id=order_id,
        from_status=from_status,
        to_status=to_status,
        changed_by_user_type=changed_by_user_type,
        changed_by_user_id=changed_by_user_id,
        notes=notes,
    )
    db.add(history)
    return history


def check_partner_credit_balance(
    partner_id: int, required_amount: float, db: Session
) -> bool:
    """
    Check if partner has sufficient credit balance.
    """
    partner = db.query(Partner).filter(Partner.id == partner_id).first()
    if not partner:
        return False

    return partner.credit_balance >= required_amount


def deduct_partner_credits(
    db: Session,
    partner_id: int,
    amount: float,
    transaction_type: str = "lead_purchase",
    description: Optional[str] = None,
    order_id: Optional[int] = None,
    payment_method: Optional[str] = None,
    payment_transaction_id: Optional[str] = None,
) -> Optional[PartnerCreditTransaction]:
    """
    Deduct credits from partner and create transaction record.
    Signature accepts `db` first and keyword args for flexibility.
    Uses SELECT FOR UPDATE to prevent race conditions.
    Returns the transaction record if successful, None otherwise.
    """
    # Lock partner row
    partner = (
        db.query(Partner).filter(Partner.id == partner_id).with_for_update().first()
    )

    if not partner:
        return None

    if partner.credit_balance < amount:
        raise ValueError("Insufficient credits to purchase lead")

    balance_before = partner.credit_balance
    partner.credit_balance -= amount
    balance_after = partner.credit_balance

    # Create transaction record
    transaction = PartnerCreditTransaction(
        partner_id=partner_id,
        transaction_type=transaction_type,
        amount=-amount,
        balance_before=balance_before,
        balance_after=balance_after,
        reference_id=order_id,
        reference_type="order" if order_id is not None else None,
        payment_method=payment_method,
        payment_transaction_id=payment_transaction_id,
        notes=description,
    )

    db.add(partner)
    db.add(transaction)

    return transaction


def get_serviceable_partners(db: Session, pincode: str) -> int:
    """
    Get count of partners that service a given pincode.
    Only counts approved partners.
    Signature accepts (db, pincode) to match callers across the codebase.
    """
    from backend.services.partner.schema.models import (
        Partner,
        PartnerServiceablePincode,
    )

    count = (
        db.query(PartnerServiceablePincode)
        .join(Partner, Partner.id == PartnerServiceablePincode.partner_id)
        .filter(
            PartnerServiceablePincode.pincode == pincode,
            PartnerServiceablePincode.is_active == True,
            Partner.verification_status == "approved",
            Partner.is_active == True,
        )
        .count()
    )

    return count


def mock_ai_price_prediction(order_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Mock AI price prediction.
    In production, this would call the actual AI service.

    Returns:
        {
            "estimated_price": float,
            "reasoning": str
        }
    """
    # Extract condition answers
    condition_answers = order_data.get("customer_condition_answers", {})

    # Simple mock logic based on phone details
    base_price = 25000  # Default base price

    # Adjust based on storage
    storage_gb = order_data.get("storage_gb", 128)
    if storage_gb >= 256:
        base_price += 5000
    elif storage_gb >= 512:
        base_price += 10000

    # Adjust based on RAM
    ram_gb = order_data.get("ram_gb", 4)
    if ram_gb >= 8:
        base_price += 3000

    # Adjust based on condition
    screen_condition = condition_answers.get("screen_condition", "good")
    if screen_condition == "excellent":
        multiplier = 0.85
    elif screen_condition == "good":
        multiplier = 0.75
    elif screen_condition == "fair":
        multiplier = 0.60
    else:
        multiplier = 0.45

    estimated_price = round(base_price * multiplier, 2)

    reasoning = f"Based on {order_data.get('phone_name', 'the phone')} with {storage_gb}GB storage, {ram_gb}GB RAM, and {screen_condition} screen condition. "

    if condition_answers.get("functional_issues"):
        reasoning += "Noted functional issues may affect final valuation. "

    if condition_answers.get("battery_health"):
        reasoning += f"Battery health: {condition_answers['battery_health']}. "

    reasoning += "Price subject to physical inspection."

    return {"estimated_price": estimated_price, "reasoning": reasoning}


def expire_lock_if_needed(db: Session, order_id: int):
    """
    Check if the lock on an order has expired. If so, deactivate it,
    reset order.partner_id to None, status to available_for_partners,
    and create status history.
    """
    expired_lock = (
        db.query(LeadLock)
        .filter(
            LeadLock.order_id == order_id,
            LeadLock.is_active == True,
            LeadLock.expires_at <= datetime.utcnow(),
        )
        .first()
    )

    if expired_lock:
        # Deactivate the lock
        expired_lock.is_active = False
        db.add(expired_lock)

        # Reset order fields
        order = db.query(Order).filter(Order.id == order_id).first()
        if order:
            order.partner_id = None
            order.status = "available_for_partners"
            order.lead_locked_at = None
            order.lead_lock_expires_at = None
            db.add(order)

            # Create status history
            create_status_history(
                db=db,
                order_id=order_id,
                from_status="lead_locked",
                to_status="available_for_partners",
                changed_by_user_type="system",
                notes="Lock expired, lead returned to marketplace",
            )
        # Commit changes so DB reflects availability immediately
        db.commit()
        return True

    return False


def expire_all_expired_locks(db: Session) -> int:
    """Find all expired active lead locks and deactivate them.
    Returns the number of locks expired.
    """
    now = datetime.utcnow()
    expired_locks = (
        db.query(LeadLock)
        .filter(LeadLock.is_active == True, LeadLock.expires_at <= now)
        .all()
    )

    count = 0
    for lock in expired_locks:
        lock.is_active = False
        db.add(lock)

        order = db.query(Order).filter(Order.id == lock.order_id).first()
        if order:
            order.partner_id = None
            order.status = "available_for_partners"
            order.lead_locked_at = None
            order.lead_lock_expires_at = None
            db.add(order)

            create_status_history(
                db=db,
                order_id=order.id,
                from_status="lead_locked",
                to_status="available_for_partners",
                changed_by_user_type="system",
                notes="Lock expired, lead returned to marketplace",
            )

        count += 1

    if count > 0:
        db.commit()

    return count
