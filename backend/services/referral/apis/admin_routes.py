from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.shared.db.connections import get_db
from backend.services.admin.utils.utils import get_current_admin
from backend.services.referral.models import ReferralSettings
from backend.services.referral.schemas import ReferralSettingsOut, ReferralSettingsUpdate
from backend.services.referral.utils import get_or_create_referral_settings

router = APIRouter(prefix="/referral", tags=["admin-referral"])


@router.get("/settings", response_model=ReferralSettingsOut)
async def get_referral_settings(
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """
    Get current referral system settings (admin only).
    """
    settings = get_or_create_referral_settings(db)
    return ReferralSettingsOut.model_validate(settings)


@router.put("/settings", response_model=ReferralSettingsOut)
async def update_referral_settings(
    update_data: ReferralSettingsUpdate,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """
    Update referral system settings (admin only).
    """
    settings = get_or_create_referral_settings(db)
    
    # Update only provided fields
    if update_data.points_for_referrer is not None:
        if update_data.points_for_referrer < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Points for referrer cannot be negative"
            )
        settings.points_for_referrer = update_data.points_for_referrer
    
    if update_data.points_for_new_user is not None:
        if update_data.points_for_new_user < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Points for new user cannot be negative"
            )
        settings.points_for_new_user = update_data.points_for_new_user
    
    if update_data.validity_days is not None:
        if update_data.validity_days <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Validity days must be greater than 0"
            )
        settings.validity_days = update_data.validity_days
    
    db.commit()
    db.refresh(settings)
    
    return ReferralSettingsOut.model_validate(settings)
