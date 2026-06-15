import random
import string
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from backend.services.referral.models import ReferralCode, ReferralSettings, ReferralHistory
from backend.services.auth.models import User


def get_or_create_referral_settings(db: Session) -> ReferralSettings:
    """
    Get the referral settings, or create default ones if none exist.
    """
    settings = db.query(ReferralSettings).first()
    if not settings:
        settings = ReferralSettings(
            points_for_referrer=100,
            points_for_new_user=50,
            validity_days=2
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def generate_unique_referral_code(db: Session) -> str:
    """
    Generate a unique 6-digit numerical referral code.
    Ensures the code doesn't already exist as an active (valid) code.
    """
    max_attempts = 100
    for _ in range(max_attempts):
        code = ''.join(random.choices(string.digits, k=6))
        
        # Check if this code exists and is still active (not expired)
        existing = db.query(ReferralCode).filter(
            ReferralCode.code == code,
            ReferralCode.is_active == True
        ).first()
        
        if not existing:
            return code
    
    # Fallback: This is extremely unlikely but just in case
    raise Exception("Could not generate unique referral code after max attempts")


def create_referral_code_for_user(db: Session, user_id: int) -> ReferralCode:
    """
    Create a new referral code for a user.
    """
    settings = get_or_create_referral_settings(db)
    
    # Generate unique code
    code = generate_unique_referral_code(db)
    
    # Calculate expiry time
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.validity_days)
    
    # Create the referral code
    referral_code = ReferralCode(
        code=code,
        referrer_id=user_id,
        expires_at=expires_at
    )
    
    db.add(referral_code)
    db.commit()
    db.refresh(referral_code)
    
    return referral_code


def validate_referral_code(db: Session, code: str) -> tuple[bool, str, User | None]:
    """
    Validate a referral code.
    Returns: (is_valid, message, referrer_user_object)
    """
    # Check if code exists
    referral_code = db.query(ReferralCode).filter(
        ReferralCode.code == code
    ).first()
    
    if not referral_code:
        return False, "Invalid referral code", None
    
    # Check if code is already redeemed
    if referral_code.redeemed_by_user_id is not None:
        return False, "This referral code has already been used", None
    
    # Check if code is still active
    if not referral_code.is_active:
        return False, "This referral code is no longer active", None
    
    # Check if code has expired
    if datetime.now(timezone.utc) > referral_code.expires_at:
        referral_code.is_active = False
        db.commit()
        return False, "This referral code has expired", None
    
    # Get referrer info
    referrer = db.query(User).filter(User.id == referral_code.referrer_id).first()
    
    if not referrer:
        return False, "Referrer not found", None
    
    if not referrer.is_active:
        return False, "Referrer account is not active", None
    
    return True, "Valid referral code", referrer


def redeem_referral_code(db: Session, code: str, new_user_id: int) -> tuple[bool, str]:
    """
    Redeem a referral code for a new user.
    Awards points to both the referrer and the new user.
    Returns: (success, message)
    """
    # Validate the code
    is_valid, message, referrer = validate_referral_code(db, code)
    
    if not is_valid:
        return False, message
    
    # Get settings
    settings = get_or_create_referral_settings(db)
    
    # Mark code as redeemed
    referral_code = db.query(ReferralCode).filter(
        ReferralCode.code == code
    ).first()
    
    referral_code.redeemed_by_user_id = new_user_id
    referral_code.redeemed_at = datetime.now(timezone.utc)
    referral_code.is_active = False
    
    # Get the new user
    new_user = db.query(User).filter(User.id == new_user_id).first()
    if not new_user:
        return False, "New user not found"
    
    # Award points to referrer
    referrer.referral_points = (referrer.referral_points or 0) + settings.points_for_referrer
    
    # Award points to new user
    new_user.referral_points = (new_user.referral_points or 0) + settings.points_for_new_user
    
    # Create referral history record
    referral_history = ReferralHistory(
        referral_code_id=referral_code.id,
        referrer_id=referrer.id,
        new_user_id=new_user_id,
        points_awarded_to_referrer=settings.points_for_referrer,
        points_awarded_to_new_user=settings.points_for_new_user
    )
    
    db.add(referral_history)
    db.commit()
    
    return True, "Referral code redeemed successfully"


def get_user_referral_info(db: Session, user_id: int) -> dict:
    """
    Get referral information for a user.
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        return None
    
    # Get active referral code for this user (if any)
    active_code = db.query(ReferralCode).filter(
        ReferralCode.referrer_id == user_id,
        ReferralCode.is_active == True,
        ReferralCode.redeemed_by_user_id == None
    ).first()
    
    return {
        "user_id": user.id,
        "referral_points": user.referral_points or 0,
        "referral_code": active_code.code if active_code else None,
        "referral_code_expires_at": active_code.expires_at if active_code else None
    }


def deactivate_expired_codes(db: Session) -> int:
    """
    Deactivate all expired referral codes.
    Returns the number of codes deactivated.
    """
    expired_codes = db.query(ReferralCode).filter(
        ReferralCode.is_active == True,
        ReferralCode.expires_at <= datetime.now(timezone.utc)
    ).all()
    
    count = len(expired_codes)
    for code in expired_codes:
        code.is_active = False
    
    if count > 0:
        db.commit()
    
    return count
