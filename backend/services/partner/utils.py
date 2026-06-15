from sqlalchemy.orm import Session
from sqlalchemy import and_
from fastapi import HTTPException, status
from datetime import datetime, timezone
from backend.services.partner.schema.models import Agent, Partner, PartnerServiceablePincode, PartnerHold
from backend.services.auth.utils import get_password_hash, verify_password, create_access_token
from backend.services.sell_phone.schema.models import Order
from typing import List, Optional


# ================================
# PARTNER UTILITIES
# ================================

def create_partner_application(
    db: Session,
    full_name: str,
    email: str,
    phone: str,
    password: str,
    company_name: str,
    business_address: str,
    udyam_id: Optional[str],
    pan_number: str,
    serviceable_pincodes: List[str]
) -> Partner:
    """
    Create a new partner application (signup).
    Partner starts with 'pending' verification status.
    
    Args:
        db: Database session
        full_name: Partner's full name
        email: Partner email (must be unique)
        phone: Partner phone number
        password: Plain text password (will be hashed)
        company_name: Company/business name
        business_address: Business address
        udyam_id: Udyam Registration Number (optional)
        pan_number: PAN number
        serviceable_pincodes: List of pincodes partner can service
        
    Returns:
        Created Partner object
        
    Raises:
        ValueError: If email already exists
    """
    # Check if email already exists
    existing = db.query(Partner).filter(Partner.email == email).first()
    if existing:
        raise ValueError(f"Partner with email {email} already exists")
    
    # Hash password
    hashed_password = get_password_hash(password)
    
    # Create partner
    partner = Partner(
        email=email,
        full_name=full_name,
        phone=phone,
        hashed_password=hashed_password,
        company_name=company_name,
        business_address=business_address,
        udyam_id=udyam_id,
        pan_number=pan_number,
        verification_status='pending',
        credit_balance=0.0,
        is_active=True
    )
    
    db.add(partner)
    db.flush()
    
    # Add serviceable pincodes
    for pincode in serviceable_pincodes:
        serviceable = PartnerServiceablePincode(
            partner_id=partner.id,
            pincode=pincode,
            is_active=True
        )
        db.add(serviceable)
    
    db.flush()
    
    return partner


def authenticate_partner(db: Session, email: str, password: str) -> Partner:
    """
    Authenticate a partner by email and password.
    Allow login even if partner is rejected/deactivated so they can see their application status.
    API access will be blocked for non-approved partners by get_current_partner dependency.
    
    Args:
        db: Database session
        email: Partner email
        password: Plain text password
        
    Returns:
        Authenticated Partner object
        
    Raises:
        ValueError: If credentials are invalid
    """
    partner = db.query(Partner).filter(Partner.email == email).first()
    
    if not partner:
        raise ValueError("Invalid credentials")
    
    if not verify_password(password, partner.hashed_password):
        raise ValueError("Invalid credentials")
    
    # Allow login regardless of account status
    # Partner can login to see their application status
    # API access control is handled by get_current_partner dependency
    
    return partner


def create_partner_token(partner: Partner) -> str:
    """
    Create JWT token for partner authentication.
    
    Args:
        partner: Partner object
        
    Returns:
        JWT access token
    """
    token_data = {
        "partner_id": partner.id,
        "email": partner.email,
        "verification_status": partner.verification_status
    }
    return create_access_token(data=token_data)


# ================================
# AGENT UTILITIES
# ================================


def create_agent(
    db: Session,
    partner_id: int,
    email: str,
    phone: str,
    password: str,
    full_name: str,
    employee_id: str = None
) -> Agent:
    """
    Create a new agent for a partner.
    
    Args:
        db: Database session
        partner_id: ID of the partner who owns this agent
        email: Agent email (must be unique)
        phone: Agent phone number
        password: Plain text password (will be hashed)
        full_name: Agent's full name
        employee_id: Optional employee ID
        
    Returns:
        Created Agent object
        
    Raises:
        ValueError: If email already exists
    """
    # Check if email already exists
    existing = db.query(Agent).filter(Agent.email == email).first()
    if existing:
        raise ValueError(f"Agent with email {email} already exists")
    
    # Hash password
    hashed_password = get_password_hash(password)
    
    # Create agent
    agent = Agent(
        partner_id=partner_id,
        email=email,
        phone=phone,
        hashed_password=hashed_password,
        full_name=full_name,
        employee_id=employee_id,
        is_active=True
    )
    
    db.add(agent)
    db.flush()
    
    return agent


def create_agent_with_existing_password(
    db: Session,
    partner_id: int,
    email: str,
    phone: str,
    full_name: str,
    partner_hashed_password: str,
    employee_id: str = None
) -> Agent:
    """
    Create a new agent for a partner using the partner's existing hashed password.
    This allows the agent to use the same credentials as the partner.
    
    Args:
        db: Database session
        partner_id: ID of the partner who owns this agent
        email: Agent email (must be unique)
        phone: Agent phone number
        full_name: Agent's full name
        partner_hashed_password: Partner's hashed password (from partner account)
        employee_id: Optional employee ID
        
    Returns:
        Created Agent object
        
    Raises:
        ValueError: If email already exists
    """
    # Check if email already exists
    existing = db.query(Agent).filter(Agent.email == email).first()
    if existing:
        raise ValueError(f"Agent with email {email} already exists")
    
    # Create agent with partner's hashed password
    agent = Agent(
        partner_id=partner_id,
        email=email,
        phone=phone,
        hashed_password=partner_hashed_password,
        full_name=full_name,
        employee_id=employee_id,
        is_active=True
    )
    
    db.add(agent)
    db.flush()
    
    return agent


def authenticate_agent(db: Session, email: str, password: str) -> Agent:
    """
    Authenticate an agent by email and password.
    
    Args:
        db: Database session
        email: Agent email
        password: Plain text password
        
    Returns:
        Authenticated Agent object
        
    Raises:
        ValueError: If credentials are invalid
    """
    agent = db.query(Agent).filter(Agent.email == email).first()
    
    if not agent:
        raise ValueError("Invalid credentials")
    
    if not verify_password(password, agent.hashed_password):
        raise ValueError("Invalid credentials")
    
    if not agent.is_active:
        raise ValueError("Agent account is deactivated")
    
    return agent


def create_agent_token(agent: Agent) -> str:
    """
    Create JWT token for agent authentication.
    
    Args:
        agent: Agent object
        
    Returns:
        JWT access token
    """
    token_data = {
        "agent_id": agent.id,
        "partner_id": agent.partner_id,
        "email": agent.email
    }
    return create_access_token(data=token_data)


def get_agent_orders(
    db: Session,
    agent_id: int,
    status_filter: str = None
) -> list:
    """
    Get orders assigned to an agent.
    
    Args:
        db: Database session
        agent_id: ID of the agent
        status_filter: Optional status filter (e.g., 'assigned_to_agent', 'accepted_by_agent')
        
    Returns:
        List of Order objects
    """
    query = db.query(Order).filter(Order.agent_id == agent_id)
    
    if status_filter:
        query = query.filter(Order.status == status_filter)
    
    return query.order_by(Order.assigned_at.desc()).all()


def validate_agent_order_access(
    db: Session,
    agent_id: int,
    order_id: int
) -> Order:
    """
    Validate that an agent has access to an order.
    
    Args:
        db: Database session
        agent_id: ID of the agent
        order_id: ID of the order
        
    Returns:
        Order object if valid
        
    Raises:
        HTTPException: If order not found or not assigned to agent
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    if order.agent_id != agent_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This order is not assigned to you"
        )
    
    return order


def validate_partner_order_access(
    db: Session,
    partner_id: int,
    order_id: int
) -> Order:
    """
    Validate that a partner has access to an order.
    
    Args:
        db: Database session
        partner_id: ID of the partner
        order_id: ID of the order
        
    Returns:
        Order object if valid
        
    Raises:
        HTTPException: If order not found or not owned by partner
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    if order.partner_id != partner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This order does not belong to your partnership"
        )
    
    return order


# ================================
# PARTNER HOLD UTILITIES
# ================================

def check_partner_on_hold(db: Session, partner_id: int) -> bool:
    """
    Check if a partner is currently on hold.
    
    Args:
        db: Database session
        partner_id: ID of the partner
        
    Returns:
        True if partner is on hold, False otherwise
    """
    current_hold = db.query(PartnerHold).filter(
        PartnerHold.partner_id == partner_id,
        PartnerHold.is_active == True
    ).first()
    
    if not current_hold:
        return False
    
    # Check if hold has expired
    if current_hold.lift_date and current_hold.lift_date <= datetime.now(timezone.utc):
        # Auto-lift the hold
        current_hold.is_active = False
        current_hold.lifted_at = datetime.now(timezone.utc)
        db.commit()
        return False
    
    return True


def get_partner_hold_details(db: Session, partner_id: int) -> Optional[PartnerHold]:
    """
    Get current active hold details for a partner.
    
    Args:
        db: Database session
        partner_id: ID of the partner
        
    Returns:
        PartnerHold object if active hold exists, None otherwise
    """
    current_hold = db.query(PartnerHold).filter(
        PartnerHold.partner_id == partner_id,
        PartnerHold.is_active == True
    ).first()
    
    if not current_hold:
        return None
    
    # Check if hold has expired
    if current_hold.lift_date and current_hold.lift_date <= datetime.now(timezone.utc):
        # Auto-lift the hold
        current_hold.is_active = False
        current_hold.lifted_at = datetime.now(timezone.utc)
        db.commit()
        return None
    
    return current_hold


def place_partner_hold(
    db: Session,
    partner_id: int,
    reason: str,
    lift_date: Optional[datetime] = None,
    admin_id: Optional[int] = None
) -> PartnerHold:
    """
    Place a partner on hold for rule violations.
    
    Args:
        db: Database session
        partner_id: ID of the partner to place on hold
        reason: Reason for the hold
        lift_date: Optional date when hold should auto-lift
        admin_id: ID of the admin placing the hold
        
    Returns:
        Created PartnerHold object
        
    Raises:
        ValueError: If partner not found or already on hold
    """
    partner = db.query(Partner).filter(Partner.id == partner_id).first()
    if not partner:
        raise ValueError(f"Partner with ID {partner_id} not found")
    
    # Check if already on hold
    if check_partner_on_hold(db, partner_id):
        raise ValueError("Partner is already on hold")
    
    hold = PartnerHold(
        partner_id=partner_id,
        reason=reason,
        hold_date=datetime.now(timezone.utc),
        lift_date=lift_date,
        placed_by_admin_id=admin_id,
        is_active=True
    )
    
    db.add(hold)
    db.commit()
    db.refresh(hold)
    
    return hold


def lift_partner_hold(
    db: Session,
    partner_id: int,
    lift_reason: str,
    admin_id: Optional[int] = None
) -> PartnerHold:
    """
    Lift a hold from a partner.
    
    Args:
        db: Database session
        partner_id: ID of the partner
        lift_reason: Reason for lifting the hold
        admin_id: ID of the admin lifting the hold
        
    Returns:
        Updated PartnerHold object
        
    Raises:
        ValueError: If no active hold exists
    """
    hold = get_partner_hold_details(db, partner_id)
    
    if not hold:
        raise ValueError("Partner is not on hold")
    
    hold.is_active = False
    hold.lifted_at = datetime.now(timezone.utc)
    hold.lift_reason = lift_reason
    hold.lifted_by_admin_id = admin_id
    
    db.commit()
    db.refresh(hold)
    
    return hold
