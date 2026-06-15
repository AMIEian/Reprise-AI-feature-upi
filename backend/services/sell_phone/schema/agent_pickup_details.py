from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, JSON, LargeBinary, Text
from sqlalchemy.sql import func
from backend.shared.db.connections import Base


class AgentPickupDetails(Base):
    """
    Store detailed information captured by agent during phone pickup.
    Includes photos as binary BLOB, condition checklist, and notes.
    Directly linked to orders table for fast access.
    """
    __tablename__ = "agent_pickup_details"

    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign Key Links for Fast Access
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_id = Column(Integer, ForeignKey("agents.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Phone Condition Assessment (JSON for flexibility)
    phone_conditions = Column(JSON, nullable=True)
    
    # Photos Metadata (JSON) - stores info about each photo, actual binary data in photos_blob
    # Each entry: {index, filename, content_type, size_bytes, captured_at}
    photos_metadata = Column(JSON, nullable=True)
    
    # Photos Binary Data (BLOB) - stores actual binary image data
    # Can store multiple photos serialized as BLOB
    photos_blob = Column(LargeBinary, nullable=True)
    
    # Form Data Captured
    final_offered_price = Column(Integer, nullable=True)
    customer_accepted_offer = Column(Integer, nullable=True)  # 1 for true, 0 for false, NULL for unknown
    payment_method = Column(String, nullable=True)
    pickup_notes = Column(Text, nullable=True)
    actual_condition = Column(String, nullable=True)
    
    # Metadata
    captured_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
