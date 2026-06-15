"""
Script to populate initial admin user and system configuration.
Run this after creating the database tables.
"""
import sys
from pathlib import Path

# Add parent directory to Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from backend.shared.db.connections import SessionLocal, engine, Base
from backend.services.admin.schema.models import Admin, AdminCreditConfiguration
from backend.services.admin import utils as admin_utils

def create_initial_admin():
    """Create initial super admin if not exists"""
    db = SessionLocal()
    try:
        # Check if any admin exists
        existing_admin = db.query(Admin).first()
        if existing_admin:
            print("Admin user already exists. Skipping admin creation.")
            return
        
        # Create super admin
        admin = Admin(
            email="admin@repriseai.com",
            full_name="Super Admin",
            hashed_password=admin_utils.get_password_hash("admin123"),  # Change this password!
            role="super_admin",
            is_active=True
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        
        print(f"✓ Created super admin: {admin.email}")
        print(f"  Password: admin123 (CHANGE THIS IMMEDIATELY!)")
        print(f"  ID: {admin.id}")
        
    except Exception as e:
        print(f"Error creating admin: {e}")
        db.rollback()
    finally:
        db.close()


def create_initial_configuration():
    """Create initial system configuration"""
    db = SessionLocal()
    try:
        # Configuration items
        configs = [
            {
                "config_key": "lead_cost_percentage",
                "config_value": "15",
                "description": "Percentage of AI quoted price charged as lead cost (e.g., 15 means 15%)"
            },
            {
                "config_key": "default_lock_duration_minutes",
                "config_value": "10",
                "description": "Default duration in minutes for lead lock before expiry"
            },
            {
                "config_key": "min_credit_balance",
                "config_value": "1000",
                "description": "Minimum credit balance required for partners"
            },
        ]
        
        for config_data in configs:
            existing = db.query(AdminCreditConfiguration).filter(
                AdminCreditConfiguration.config_key == config_data["config_key"]
            ).first()
            
            if existing:
                print(f"Configuration '{config_data['config_key']}' already exists. Skipping.")
                continue
            
            config = AdminCreditConfiguration(
                config_key=config_data["config_key"],
                config_value=config_data["config_value"],
                description=config_data["description"]
            )
            db.add(config)
            db.commit()
            print(f"✓ Created configuration: {config_data['config_key']} = {config_data['config_value']}")
        
    except Exception as e:
        print(f"Error creating configuration: {e}")
        db.rollback()
    finally:
        db.close()


def create_sample_credit_plans():
    """Create sample credit plans"""
    from backend.services.admin.schema.models import CreditPlan
    
    db = SessionLocal()
    try:
        # Check if any plans exist
        existing_plans = db.query(CreditPlan).first()
        if existing_plans:
            print("Credit plans already exist. Skipping.")
            return
        
        plans = [
            {
                "plan_name": "Basic 10K",
                "credit_amount": 10000,
                "price": 10000,
                "bonus_percentage": 0,
                "description": "Basic credit plan with no bonus"
            },
            {
                "plan_name": "Standard 25K",
                "credit_amount": 25000,
                "price": 25000,
                "bonus_percentage": 5,
                "description": "Standard plan with 5% bonus (₹1,250 extra)"
            },
            {
                "plan_name": "Premium 50K",
                "credit_amount": 50000,
                "price": 50000,
                "bonus_percentage": 10,
                "description": "Premium plan with 10% bonus (₹5,000 extra)"
            },
            {
                "plan_name": "Enterprise 100K",
                "credit_amount": 100000,
                "price": 100000,
                "bonus_percentage": 15,
                "description": "Enterprise plan with 15% bonus (₹15,000 extra)"
            },
        ]
        
        for plan_data in plans:
            plan = CreditPlan(
                plan_name=plan_data["plan_name"],
                credit_amount=plan_data["credit_amount"],
                price=plan_data["price"],
                bonus_percentage=plan_data["bonus_percentage"],
                description=plan_data["description"],
                is_active=True
            )
            db.add(plan)
        
        db.commit()
        print(f"✓ Created {len(plans)} credit plans")
        
    except Exception as e:
        print(f"Error creating credit plans: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    print("Populating admin data...")
    print("=" * 50)
    
    # Create tables first
    Base.metadata.create_all(bind=engine)
    print("✓ Database tables created/verified\n")
    
    # Create initial data
    create_initial_admin()
    print()
    create_initial_configuration()
    print()
    create_sample_credit_plans()
    
    print("=" * 50)
    print("Admin data population complete!")
