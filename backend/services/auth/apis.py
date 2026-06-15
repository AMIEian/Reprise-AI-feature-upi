from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from backend.services.auth import models, schemas, utils
from backend.shared.db.connections import Base, engine, get_db
from datetime import datetime, timedelta
from backend.services.partner.schema.models import Partner
from backend.services.partner.schema.models import Agent

router = APIRouter()

# ensure tables exist
Base.metadata.create_all(bind=engine)


@router.post("/signup", response_model=schemas.UserRegistrationResponse, tags=["auth"])
def signup(user_in: schemas.UserCreate, db: Session = Depends(utils.get_db)):
    # Check for duplicate email
    existing_email = (
        db.query(models.User).filter(models.User.email == user_in.email).first()
    )
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check for duplicate phone if provided
    if user_in.phone:
        existing_phone = (
            db.query(models.User).filter(models.User.phone == user_in.phone).first()
        )
        if existing_phone:
            raise HTTPException(
                status_code=400, detail="Phone number already registered"
            )

    hashed = utils.get_password_hash(user_in.password)
    user = models.User(
        email=user_in.email,
        full_name=user_in.full_name,
        phone=user_in.phone,
        address=user_in.address,
        hashed_password=hashed,
        pincode=user_in.pincode,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Handle referral code if provided
    if user_in.referral_code:
        from backend.services.referral.utils import redeem_referral_code

        success, message = redeem_referral_code(db, user_in.referral_code, user.id)
        # Refresh user to get updated referral_points
        db.refresh(user)

    # Check pincode serviceability using utility function
    serviceability_info = utils.check_pincode_serviceability(user_in.pincode or "", db)

    return {
        "user": user,
        "serviceable": serviceability_info["serviceable"],
        "serviceable_partners_count": serviceability_info["partner_count"],
        "warning": serviceability_info.get("message"),
    }


@router.post("/login", response_model=schemas.Token, tags=["auth"])
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = (
        db.query(models.User)
        .filter(
            (models.User.phone == payload.identifier)
            | (models.User.email == payload.identifier)
        )
        .first()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect credentials"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Account is inactive"
        )
    if not utils.verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect credentials"
        )
    token = utils.create_access_token(data={"user_id": user.id})
    return {"access_token": token, "token_type": "bearer"}


""""
@router.post("/send-otp")
def send_otp(payload: dict = Body(...), db: Session = Depends(get_db)):
    phone = payload.get("phone")
    email = payload.get("email")

    if not phone and not email:
        raise HTTPException(status_code=400, detail="Phone or Email required")

    otp = utils.generate_otp()

    key = phone or email

    utils.otp_store[key] = {
        "otp": otp,
        "expires": datetime.utcnow() + timedelta(minutes=5),
    }

    if phone:
        utils.send_otp_sms(phone, otp)

    if email:
        print(f"📧 Email OTP for {email}: {otp}")  # TEMP (check terminal)

    return {"success": True}
"""

"""
@router.post("/verify-otp")
def verify_otp(payload: dict = Body(...), db: Session = Depends(get_db)):
    phone = payload.get("phone")
    email = payload.get("email")
    otp = payload.get("otp")

    key = phone or email

    record = utils.otp_store.get(key)

    if not record:
        raise HTTPException(status_code=400, detail="OTP not found")

    if datetime.utcnow() > record["expires"]:
        raise HTTPException(status_code=400, detail="OTP expired")

    if record["otp"] != otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    role = payload.get("role")

    # Partner Login
    if role == "partner":

        if phone:
            user = db.query(Partner).filter(Partner.phone == phone).first()
        else:
            user = db.query(Partner).filter(Partner.email == email).first()

    # Agent Login
    elif role == "agent":

        if phone:
            user = db.query(Agent).filter(Agent.phone == phone).first()
        else:
            user = db.query(Agent).filter(Agent.email == email).first()

    # Customer Login (OLD LOGIC)
    else:

        if phone:
            user = db.query(models.User).filter(models.User.phone == phone).first()
        else:
            user = db.query(models.User).filter(models.User.email == email).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Partner token
    if role == "partner":

        token = utils.create_access_token(
            data={
                "partner_id": user.id,
                "email": user.email,
                "verification_status": getattr(user, "verification_status", "approved"),
                "role": "partner",
            }
        )

    # Agent token
    elif role == "agent":

        token = utils.create_access_token(
            data={
                "agent_id": user.id,
                "partner_id": user.partner_id,
                "email": user.email,
                "role": "agent",
            }
        )

    # Customer token
    else:

        token = utils.create_access_token(data={"user_id": user.id, "role": "customer"})

    del utils.otp_store[key]

    return {"access_token": token, "token_type": "bearer"}
"""


@router.get("/check-pincode/{pincode}", tags=["auth"])
def check_pincode_serviceability(pincode: str, db: Session = Depends(get_db)):
    """
    Public endpoint to check if a pincode is serviceable.
    Useful for frontend to show availability before registration.
    """
    serviceability_info = utils.check_pincode_serviceability(pincode, db)

    return {
        "pincode": pincode,
        "serviceable": serviceability_info["serviceable"],
        "partner_count": serviceability_info["partner_count"],
        "message": serviceability_info.get("message"),
    }


@router.get("/check-email/{email}", tags=["auth"])
def check_email_availability(email: str, db: Session = Depends(get_db)):
    """
    Check if an email is already registered.
    """
    existing = db.query(models.User).filter(models.User.email == email).first()
    return {"available": not bool(existing)}


@router.get("/check-phone/{phone}", tags=["auth"])
def check_phone_availability(phone: str, db: Session = Depends(get_db)):
    """
    Check if a phone number is already registered.
    """
    existing = db.query(models.User).filter(models.User.phone == phone).first()
    return {"available": not bool(existing)}


@router.get("/check-referral/{code}", tags=["auth"])
def check_referral_code(code: str, db: Session = Depends(get_db)):
    """
    Check if a referral code is valid.
    """
    from backend.services.referral.utils import validate_referral_code

    valid, message, _ = validate_referral_code(db, code)
    return {"valid": valid, "message": message}


@router.get("/me", response_model=schemas.FullNameOut, tags=["auth"])
def read_me(current_user: models.User = Depends(utils.get_current_user)):
    # return only the full_name as requested
    return {"full_name": current_user.full_name}


@router.get("/me/details", response_model=schemas.UserOut, tags=["auth"])
def read_me_details(current_user: models.User = Depends(utils.get_current_user)):
    """
    Return full current user details useful for prefilling forms (phone, address, etc).
    """
    # Determine role by checking admin/agent/partner tables
    role = "customer"
    try:
        from backend.services.admin.schema.models import Admin
        from backend.services.partner.schema.models import Agent, Partner

        if current_user and current_user.email:
            admin = (db := None)
            # use the engine-bound session via utils.get_db if needed; here we can query using current session
            # but we do not have db here; instead use simple existence checks via SQL queries using current_user.email
            # Prefer to query via the existing DB session by importing get_db and using a new session
            from backend.shared.db.connections import SessionLocal

            dbs = SessionLocal()
            try:
                if dbs.query(Admin).filter(Admin.email == current_user.email).first():
                    role = "admin"
                elif dbs.query(Agent).filter(Agent.email == current_user.email).first():
                    role = "agent"
                elif (
                    dbs.query(Partner)
                    .filter(Partner.email == current_user.email)
                    .first()
                ):
                    role = "partner"
            finally:
                dbs.close()
    except Exception:
        # if any error, default to customer
        role = "customer"

    # Return plain dict so Pydantic model includes inferred `role` key
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "phone": current_user.phone,
        "address": current_user.address,
        "is_active": current_user.is_active,
        "pincode": getattr(current_user, "pincode", None),
        "referral_points": getattr(current_user, "referral_points", 0),
        "role": role,
    }


@router.get("/me/profile", response_model=schemas.ProfileOut, tags=["auth"])
def read_my_profile(current_user: models.User = Depends(utils.get_current_user)):
    """
    Return profile details for the currently authenticated user without exposing internal identifiers.
    Use this endpoint for frontend profile display where `id` must not be returned.
    """
    return current_user


@router.post("/google", tags=["auth"])
def google_auth(payload: dict = Body(...), db: Session = Depends(get_db)):
    """
    Exchange a Google auth code for an id_token, then create or retrieve the user and
    return an access token for the app.

    Expected body: { "auth_code": "...", "pincode": "...", "signup": true/false, "referral_code": "..." }

    For signup flow, pincode is optional. If not provided, we'll allow signup anyway.
    Pincode validation will be enforced at checkout time when creating orders.
    """
    auth_code = payload.get("auth_code")
    pincode = payload.get("pincode")
    signup_flag = bool(payload.get("signup", False))
    referral_code = payload.get("referral_code")

    if not auth_code:
        raise HTTPException(status_code=400, detail="auth_code is required")

    try:
        # Exchange the auth code for an id_token
        id_token = utils.exchange_auth_code_for_id_token(auth_code)

        # For signup flow, allow pincode to be optional (will validate at checkout)
        # No longer blocking signup based on pincode serviceability
        # Pincode validation is now only enforced at order creation time (checkout)

        # Verify id_token and create/get user (pass pincode for new user creation)
        user, created = utils.create_or_get_user_from_google(
            id_token, db, pincode=pincode
        )

        # Handle referral code if provided and user is newly created
        if created and referral_code:
            from backend.services.referral.utils import redeem_referral_code

            success, message = redeem_referral_code(db, referral_code, user.id)
            # Refresh user to get updated referral_points
            db.refresh(user)

        # create access token
        token = utils.create_access_token(data={"user_id": user.id})

        needs_profile = (not user.phone) or (not user.address)

        # infer role for client convenience
        role = "customer"
        try:
            from backend.services.admin.schema.models import Admin
            from backend.services.partner.schema.models import Agent, Partner

            if db.query(Admin).filter(Admin.email == user.email).first():
                role = "admin"
            elif db.query(Agent).filter(Agent.email == user.email).first():
                role = "agent"
            elif db.query(Partner).filter(Partner.email == user.email).first():
                role = "partner"
        except Exception:
            role = "customer"

        return {
            "access_token": token,
            "token_type": "bearer",
            "needs_profile": needs_profile,
            "new_user": bool(created),
            "role": role,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if not auth_code:
        raise HTTPException(status_code=400, detail="auth_code is required")

    try:
        # Exchange the auth code for an id_token
        id_token = utils.exchange_auth_code_for_id_token(auth_code)

        # For signup flow, allow pincode to be optional (will validate at checkout)
        # No longer blocking signup based on pincode serviceability
        # Pincode validation is now only enforced at order creation time (checkout)

        # Verify id_token and create/get user (pass pincode for new user creation)
        user, created = utils.create_or_get_user_from_google(
            id_token, db, pincode=pincode
        )

        # create access token
        token = utils.create_access_token(data={"user_id": user.id})

        needs_profile = (not user.phone) or (not user.address)

        # infer role for client convenience
        role = "customer"
        try:
            from backend.services.admin.schema.models import Admin
            from backend.services.partner.schema.models import Agent, Partner

            if db.query(Admin).filter(Admin.email == user.email).first():
                role = "admin"
            elif db.query(Agent).filter(Agent.email == user.email).first():
                role = "agent"
            elif db.query(Partner).filter(Partner.email == user.email).first():
                role = "partner"
        except Exception:
            role = "customer"

        return {
            "access_token": token,
            "token_type": "bearer",
            "needs_profile": needs_profile,
            "new_user": bool(created),
            "role": role,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/me", response_model=schemas.UserOut, tags=["auth"])
def update_current_user(
    payload: schemas.UserUpdate,
    current_user: models.User = Depends(utils.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update current user's profile fields. Only allowed fields are updated.
    Intended usage: save missing phone/address during checkout.
    If pincode is updated, logs serviceability info (non-blocking).
    """
    # refresh user from this session
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Track if pincode changed for serviceability check
    pincode_changed = False
    new_pincode = None

    # Only update non-null fields supplied in payload. Do NOT allow role/is_active changes here.
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.phone is not None:
        # Check for duplicate phone if changing it
        if user.phone != payload.phone:
            existing_phone = (
                db.query(models.User)
                .filter(
                    models.User.phone == payload.phone,
                    models.User.id != current_user.id,
                )
                .first()
            )
            if existing_phone:
                raise HTTPException(
                    status_code=400, detail="Phone number already registered"
                )
        user.phone = payload.phone
    if payload.address is not None:
        user.address = payload.address
    # latitude/longitude removed
    if payload.pincode is not None:
        if user.pincode != payload.pincode:
            pincode_changed = True
            new_pincode = payload.pincode
        user.pincode = payload.pincode

    db.add(user)
    db.commit()
    db.refresh(user)

    # Log serviceability info if pincode changed (non-blocking, just for info)
    if pincode_changed and new_pincode:
        serviceability_info = utils.check_pincode_serviceability(new_pincode, db)
        # Log for monitoring (in production, use proper logging framework)
        print(
            f"User {user.id} updated pincode to {new_pincode}. Serviceable: {serviceability_info['serviceable']}, Partners: {serviceability_info['partner_count']}"
        )

    return user


@router.get("/users", response_model=list[schemas.UserOut], tags=["auth"])
def list_users(
    current_user: models.User = Depends(utils.get_current_user),
    db: Session = Depends(get_db),
):
    # role-based admin protection removed; endpoint requires authentication
    return db.query(models.User).all()


@router.get("/users/{user_id}", response_model=schemas.UserOut, tags=["auth"])
def get_user(
    user_id: int,
    current_user: models.User = Depends(utils.get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # allow only owner (previous admin shortcut removed)
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return user


@router.put("/users/{user_id}", response_model=schemas.UserOut, tags=["auth"])
def update_user(
    user_id: int,
    payload: schemas.UserUpdate,
    current_user: models.User = Depends(utils.get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.phone is not None:
        # Check for duplicate phone if changing it
        if user.phone != payload.phone:
            existing_phone = (
                db.query(models.User)
                .filter(models.User.phone == payload.phone, models.User.id != user_id)
                .first()
            )
            if existing_phone:
                raise HTTPException(
                    status_code=400, detail="Phone number already registered"
                )
        user.phone = payload.phone
    # role change removed
    if payload.is_active is not None:
        # allow owner to toggle their is_active (no roles)
        user.is_active = payload.is_active
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=204, tags=["auth"])
def delete_user(
    user_id: int,
    current_user: models.User = Depends(utils.get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # allow only owner to delete their account (admin/role removed)
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    db.delete(user)
    db.commit()
    return None
