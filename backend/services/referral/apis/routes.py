from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.shared.db.connections import get_db
from backend.services.auth.utils import get_current_user
from backend.services.referral.models import ReferralCode, ReferralSettings
from backend.services.referral.schemas import (
    ReferralCodeOut,
    ReferralCodeCreate,
    ReferralSettingsOut,
    ReferralSettingsUpdate,
    ReferralValidationResponse,
    ReferralRedeemRequest,
    UserReferralInfo
)
from backend.services.referral.utils import (
    create_referral_code_for_user,
    validate_referral_code,
    redeem_referral_code,
    get_user_referral_info,
    get_or_create_referral_settings
)
from backend.services.auth.models import User

router = APIRouter(prefix="/referral", tags=["referral"])


@router.post("/generate-code", response_model=ReferralCodeOut)
async def generate_referral_code(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate a new referral code for the logged-in user.
    One code per user (previous code becomes inactive if exists).
    """
    # Check if user has an active code
    active_code = db.query(ReferralCode).filter(
        ReferralCode.referrer_id == current_user.id,
        ReferralCode.is_active == True,
        ReferralCode.redeemed_by_user_id == None
    ).first()
    
    # Create new code (old one will remain but new one is the active one)
    new_code = create_referral_code_for_user(db, current_user.id)
    
    return ReferralCodeOut.model_validate(new_code)


@router.get("/my-code", response_model=ReferralCodeOut | None)
async def get_my_referral_code(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get the current active referral code for the logged-in user.
    """
    active_code = db.query(ReferralCode).filter(
        ReferralCode.referrer_id == current_user.id,
        ReferralCode.is_active == True,
        ReferralCode.redeemed_by_user_id == None
    ).first()
    
    if not active_code:
        return None
    
    return ReferralCodeOut.model_validate(active_code)


@router.get("/info", response_model=UserReferralInfo)
async def get_my_referral_info(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get referral information for the logged-in user.
    Includes points and active referral code.
    """
    info = get_user_referral_info(db, current_user.id)
    if not info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return UserReferralInfo(**info)


@router.post("/validate", response_model=ReferralValidationResponse)
async def validate_code(
    code: str,
    db: Session = Depends(get_db)
):
    """
    Validate a referral code without redeeming it.
    Used during signup form validation.
    """
    is_valid, message, referrer = validate_referral_code(db, code)
    
    return ReferralValidationResponse(
        valid=is_valid,
        message=message,
        referrer_name=referrer.full_name if referrer else None
    )


@router.post("/redeem")
async def redeem_code(
    request: ReferralRedeemRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Redeem a referral code for the current user.
    Should be called after signup to award points.
    """
    success, message = redeem_referral_code(db, request.referral_code, current_user.id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    return {
        "success": True,
        "message": message,
        "referral_points": current_user.referral_points
    }
