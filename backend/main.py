import os
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.services.auth.apis import router as auth_router
from backend.services.sell_phone.apis.routes import router as sell_phone_router
from backend.services.customer_side_prediction.apis import (
    router as customer_side_prediction_router,
)
from backend.services.admin.apis.routes import router as admin_router
from backend.services.partner.apis.routes import router as partner_router
from backend.services.partner.apis.agent_routes import router as agent_router
from backend.services.referral.apis.routes import router as referral_router
from backend.services.referral.apis.admin_routes import router as referral_admin_router
# from backend.services.sell_laptop.routes import router as laptop_router
from backend.services.sell_laptop.models import LaptopList, LaptopConfiguration
from backend.shared.db.connections import Base, engine, get_db
from backend.socket_manager import sio, socket_app
from starlette.middleware.sessions import SessionMiddleware
from backend.config import FRONTEND_URL
from starlette.requests import Request
from starlette.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

import asyncio
from dotenv import load_dotenv

load_dotenv()

# ensure selector event loop on Windows
if os.name == "nt":
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    except Exception:
        pass

app = FastAPI(title="RepriseAI Backend", version="1.0.0")
app.mount("/socket.io", socket_app)
app.add_middleware(
    SessionMiddleware, secret_key=os.getenv("SESSION_SECRET_KEY", "supersecretkey")
)
# Configure CORS
# Build a safe list of allowed origins from environment variable
# Read CORS_ORIGINS from .env (comma-separated URLs)
cors_origins_env = os.getenv("CORS_ORIGINS", "")
if cors_origins_env:
    origins = [origin.strip() for origin in cors_origins_env.split(",")]
else:
    # Fallback to default origins if not set
    origins = [
        "http://localhost:5174",
        "http://localhost:8081",
        "http://localhost:5173",
        "http://localhost:5175",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8081",
        "http://103.88.83.224:10001",
        "https://cashnow.co.in",
    ]


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
os.makedirs("Images/phones", exist_ok=True)
app.mount("/images", StaticFiles(directory="Images"), name="images")

# Mount documents (Udyam Aadhaar uploads, payment screenshots, etc.)
os.makedirs("documents/udyam-aadhar", exist_ok=True)
os.makedirs("documents/payment", exist_ok=True)
app.mount("/documents", StaticFiles(directory="documents"), name="documents")

# ============================================================================
# Startup Event: Ensure Trigram Index and Set Similarity Threshold
# ============================================================================


def setup_pg_trgm(db_session: Session):
    """
    Initialize trigram search infrastructure:
    - Enable pg_trgm extension (if not already enabled)
    - Set pg_trgm.similarity_threshold to 0.1
    - Create GIN index on PhoneList.search_text if it doesn't exist
    """
    try:
        # 1️⃣ Create pg_trgm extension (idempotent)
        db_session.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm;"))
        print("✓ pg_trgm extension enabled")
    except Exception as e:
        print(f"⚠ Could not enable pg_trgm extension: {e}")

    try:
        # 2️⃣ Set similarity threshold (session-level)
        db_session.execute(text("SET pg_trgm.similarity_threshold = 0.1;"))
        print("✓ pg_trgm.similarity_threshold set to 0.1")
    except Exception as e:
        print(f"⚠ Could not set similarity threshold: {e}")

    try:
        # 3️⃣ Create GIN index on search_text if it doesn't exist
        db_session.execute(text("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE c.relname = 'idx_phone_search'
            ) THEN
                CREATE INDEX idx_phone_search
                ON phones_list USING GIN (search_text gin_trgm_ops);
            END IF;
        END
        $$;
        """))
        print("✓ Trigram GIN index 'idx_phone_search' verified/created")
    except Exception as e:
        print(f"⚠ Could not create trigram index: {e}")

    try:
        db_session.commit()
    except Exception as e:
        print(f"⚠ Could not commit transaction: {e}")
        db_session.rollback()


@app.on_event("startup")
def startup_event():
    """
    FastAPI startup event to initialize database and trigram search.
    """
    # Create all tables
    Base.metadata.create_all(bind=engine)

    # Setup trigram search infrastructure
    db: Session = next(get_db())
    try:
        setup_pg_trgm(db)
    finally:
        db.close()


from backend.services.auth.utils import PartnerNotApprovedException


@app.exception_handler(PartnerNotApprovedException)
async def partner_not_approved_exception_handler(
    request: Request, exc: PartnerNotApprovedException
):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "verification_status": exc.verification_status},
    )


# Register service routers
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(sell_phone_router)
# app.include_router(laptop_router)
app.include_router(customer_side_prediction_router)
app.include_router(admin_router)
app.include_router(partner_router)
app.include_router(agent_router)
app.include_router(referral_router)
app.include_router(referral_admin_router, prefix="/admin")
# app.include_router(detection_router)

# Register service routes here (e.g., from services.valuation.apis import router; app.include_router(router))


@app.get("/")
def read_root():
    return {"message": "RepriseAI Backend API"}


if __name__ == "__main__":
    import uvicorn

    # prefer running `uvicorn main:app --reload` in dev; this runs without reload
    uvicorn.run(app, host="0.0.0.0", port=8000)
