from datetime import datetime, timedelta
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from backend.shared.db.connections import get_db
from backend.services.admin.schema.models import Admin

# Secret for admin JWT (should be different from customer JWT in production)
ADMIN_SECRET_KEY = "admin-replace-this-with-secure-secret"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

admin_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/admin/auth/login")


def get_password_hash(password: str) -> str:
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except ValueError:
        return False


def create_admin_access_token(*, data: dict, expires_delta: timedelta = None):
    """Create JWT token for admin"""
    to_encode = data.copy()
    now = datetime.utcnow()
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": now, "user_type": "admin"})
    encoded_jwt = jwt.encode(to_encode, ADMIN_SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_admin_access_token(token: str):
    """Decode and validate admin JWT token"""
    try:
        payload = jwt.decode(token, ADMIN_SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def get_current_admin(token: str = Depends(admin_oauth2_scheme), db: Session = Depends(get_db)) -> Admin:
    """
    Dependency to get current authenticated admin.
    Validates JWT token and returns Admin object.
    """
    payload = decode_admin_access_token(token)
    if not payload or "admin_id" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid authentication credentials"
        )
    
    # Verify user_type is admin
    if payload.get("user_type") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    admin = db.query(Admin).filter(Admin.id == int(payload["admin_id"])).first()
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Admin not found"
        )
    
    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin account is inactive"
        )
    
    return admin


def require_super_admin(current_admin: Admin = Depends(get_current_admin)) -> Admin:
    """
    Dependency to ensure current admin has super_admin role.
    Use for sensitive operations like creating/deleting admins.
    """
    if current_admin.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )
    return current_admin
