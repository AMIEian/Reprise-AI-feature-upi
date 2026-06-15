from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt
from jose.exceptions import ExpiredSignatureError, JWTError
from sqlalchemy.orm import Session
from backend.shared.db.connections import get_db
from backend.services.auth import models as auth_models, utils as auth_utils

security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(credentials.credentials, auth_utils.SECRET_KEY, algorithms=[auth_utils.ALGORITHM])
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    if not payload or "user_id" not in payload:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = db.query(auth_models.User).filter(auth_models.User.id == int(payload["user_id"])).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="User inactive")

    return payload
