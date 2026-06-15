"""
Quick script to check if admin exists and verify credentials
"""
import sys
from pathlib import Path

# Add parent directory to Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.shared.db.connections import SessionLocal
from backend.services.admin.schema.models import Admin
from backend.services.admin import utils as admin_utils

def check_admin():
    db = SessionLocal()
    try:
        # Find admin
        admin = db.query(Admin).filter(Admin.email == "admin@repriseai.com").first()
        
        if not admin:
            print("❌ Admin user NOT found in database!")
            print("Run: python populate_admin_data.py")
            return
        
        print("✓ Admin user found!")
        print(f"  Email: {admin.email}")
        print(f"  Full Name: {admin.full_name}")
        print(f"  Role: {admin.role}")
        print(f"  Is Active: {admin.is_active}")
        print(f"  Created At: {admin.created_at}")
        print()
        
        # Test password
        test_password = "admin123"
        is_valid = admin_utils.verify_password(test_password, admin.hashed_password)
        
        if is_valid:
            print(f"✓ Password verification SUCCESS for '{test_password}'")
            print()
            print("Login credentials:")
            print(f"  Email: admin@repriseai.com")
            print(f"  Password: admin123")
        else:
            print(f"❌ Password verification FAILED for '{test_password}'")
            print("The password in the database doesn't match 'admin123'")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_admin()
