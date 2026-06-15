from datetime import datetime, timedelta
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status, utils
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from backend.shared.db.connections import get_db
from backend.services.auth import models, schemas
import requests
import random
import os
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText
import secrets
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as grequests

load_dotenv()


# Custom exception for partner verification status
class PartnerNotApprovedException(HTTPException):
    def __init__(self, verification_status: str, detail: str = None):
        self.verification_status = verification_status
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail
            or f"Partner account not approved (status: {verification_status})",
        )


# Secret for demo; replace with env var in production
SECRET_KEY = "replace-this-with-secure-secret"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
# FAST2SMS_API_KEY = os.getenv("FAST2SMS_API_KEY")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
# otp_store = {}


def get_password_hash(password: str) -> str:
    # bcrypt returns bytes; decode to store as string
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"), hashed_password.encode("utf-8")
        )
    except ValueError:
        return False


def create_access_token(*, data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    now = datetime.utcnow()
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": now})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


# def generate_otp():
# return str(random.randint(100000, 999999))

"""
def send_otp_sms(phone: str, otp: str):
    url = "https://www.fast2sms.com/dev/bulkV2"

    payload = {
        "route": "q",
        "message": f"Your CashNow OTP is {otp}",
        "language": "english",
        "flash": 0,
        "numbers": phone,
    }

    headers = {
        "authorization": FAST2SMS_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
    }

    try:
        response = requests.post(
            url,
            data=payload,
            headers=headers,
            timeout=10,
        )

        print("========== FAST2SMS QUICK SMS ==========")
        print("STATUS:", response.status_code)
        print("RESPONSE:", response.text)
        print("========================================")

        return response.json()

    except Exception as e:
        print("SMS ERROR:", str(e))

        return {
            "success": False,
            "error": str(e),
        }
"""
"""
def send_otp_email(email: str, otp: str):
    sender = "your_email@gmail.com"
    password = "your_app_password"

    msg = MIMEText(f"Your OTP is {otp}")
    msg["Subject"] = "Your OTP Code"
    msg["From"] = sender
    msg["To"] = email

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(sender, password)
        server.send_message(msg)

    if email:
        utils.send_otp_email(email, otp)
"""


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> models.User:
    payload = decode_access_token(token)
    if not payload or "user_id" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    user = (
        db.query(models.User).filter(models.User.id == int(payload["user_id"])).first()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )
    return user


def get_current_partner(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
):
    """
    Dependency to get the currently authenticated partner from JWT token.
    Expects token payload to have 'partner_id' field.
    """
    from backend.services.partner.schema.models import Partner

    payload = decode_access_token(token)
    if not payload or "partner_id" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid partner authentication credentials",
        )

    partner = db.query(Partner).filter(Partner.id == int(payload["partner_id"])).first()
    if not partner:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Partner not found"
        )

    # Check if partner is verified and active
    if partner.verification_status != "approved":
        raise PartnerNotApprovedException(partner.verification_status)

    return partner


def get_current_partner_any_status(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
):
    """
    Dependency to get the currently authenticated partner from JWT token.
    Allows partners with ANY verification status (pending, under_review, etc).
    Used for endpoints like document uploads that should work before approval.
    """
    from backend.services.partner.schema.models import Partner

    payload = decode_access_token(token)
    if not payload or "partner_id" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid partner authentication credentials",
        )

    partner = db.query(Partner).filter(Partner.id == int(payload["partner_id"])).first()
    if not partner:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Partner not found"
        )

    return partner


def get_current_agent(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
):
    """
    Dependency to get the currently authenticated agent from JWT token.
    Expects token payload to have 'agent_id' field.
    """
    from backend.services.partner.schema.models import Agent

    payload = decode_access_token(token)
    if not payload or "agent_id" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid agent authentication credentials",
        )

    agent = db.query(Agent).filter(Agent.id == int(payload["agent_id"])).first()
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Agent not found"
        )

    # Check if agent is active
    if not agent.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Agent account is deactivated"
        )

    return agent


def create_or_get_user_from_google(
    id_token_str: str, db: Session, pincode: str | None = None
):
    """
    Verify Google ID token, create user if not exists, return models.User
    """
    try:
        # Optional audience check using GOOGLE_CLIENT_ID env var
        audience = os.getenv("GOOGLE_CLIENT_ID", None)

        idinfo = google_id_token.verify_oauth2_token(
            id_token_str, grequests.Request(), audience
        )

    except ValueError as e:
        msg = f"Invalid Google token: {str(e)}"
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=msg)

    email = idinfo.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Google token missing email"
        )
    # Extract Google's subject (unique user id)
    google_sub = idinfo.get("sub")

    # Try find existing user by email
    user = db.query(models.User).filter(models.User.email == email).first()
    if user:
        # Ensure we persist google id/provider for future logins
        updated = False
        if google_sub and not getattr(user, "google_id", None):
            user.google_id = google_sub
            updated = True
        if not getattr(user, "oauth_provider", None):
            user.oauth_provider = "google"
            updated = True
        if pincode and (not getattr(user, "pincode", None)):
            user.pincode = pincode
            updated = True
        if updated:
            db.add(user)
            db.commit()
            db.refresh(user)
        return user, False

    # Create user if not exists
    random_pw = secrets.token_urlsafe(16)
    hashed_pw = get_password_hash(random_pw)
    user = models.User(
        email=email,
        full_name=idinfo.get("name"),
        phone=None,
        address=None,
        hashed_password=hashed_pw,
        is_active=True,
        google_id=google_sub,
        oauth_provider="google",
        pincode=pincode,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user, True


def exchange_auth_code_for_id_token(
    auth_code: str, code_verifier: str | None = None
) -> str:
    """
    Exchange Google auth code for id_token.
    For GIS popup flow we MUST use redirect_uri = "postmessage".
    Accepts optional PKCE code_verifier if provided, but does not require it.
    """
    token_url = "https://oauth2.googleapis.com/token"

    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")

    if not client_id:
        raise RuntimeError("GOOGLE_CLIENT_ID must be set in the environment")

    # Force GIS popup behavior
    redirect_uri = "postmessage"

    data = {
        "code": auth_code,
        "client_id": client_id,
        "grant_type": "authorization_code",
        "redirect_uri": redirect_uri,
    }

    if client_secret:
        data["client_secret"] = client_secret

    # include code_verifier only if provided (optional)
    if code_verifier:
        data["code_verifier"] = code_verifier

    resp = requests.post(token_url, data=data, timeout=10)
    if resp.status_code != 200:
        raise HTTPException(
            status_code=400,
            detail=f"Google token exchange failed: {resp.status_code} {resp.text}",
        )

    id_token = resp.json().get("id_token")
    if not id_token:
        raise HTTPException(status_code=400, detail="No id_token returned by Google")

    return id_token


def check_pincode_serviceability(pincode: str, db: Session) -> dict:
    """
    Check if a pincode is serviced by any partner.
    Returns dict with serviceability info.

    Args:
        pincode: 6-digit Indian pincode
        db: Database session

    Returns:
        {
            "serviceable": bool,
            "partner_count": int,
            "message": str (optional warning)
        }
    """
    from backend.services.partner.schema.models import PartnerServiceablePincode

    if not pincode or len(pincode.strip()) != 6:
        return {
            "serviceable": False,
            "partner_count": 0,
            "message": "Invalid pincode format",
        }

    pincode = pincode.strip()

    # Count active approved partners servicing this pincode
    from backend.services.partner.schema.models import Partner

    partner_count = (
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

    if partner_count > 0:
        return {"serviceable": True, "partner_count": partner_count, "message": None}
    else:
        return {
            "serviceable": False,
            "partner_count": 0,
            "message": "Cannot create orders in this pincode area. Please try a different pincode.",
        }
