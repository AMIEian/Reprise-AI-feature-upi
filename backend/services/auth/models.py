from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float
from sqlalchemy.sql import func
from backend.shared.db.connections import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    phone = Column(String, unique=True, index=True, nullable=True)
    address = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # OAuth fields
    google_id = Column(String, unique=True, nullable=True, index=True)
    oauth_provider = Column(String, nullable=True)  # 'google', etc.

    # New: store optional geolocation for user (agent)
    # removed latitude/longitude
    # New: optional pincode for customer user
    pincode = Column(String, nullable=True)
    
    # Referral points earned by the user
    referral_points = Column(Integer, default=0, nullable=False)
