from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from pydantic import BaseModel
from src.core.config import settings
from src.config.users import get_user_by_username  # import dari config baru

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

# This is a simple user store for demonstration
# In a real application, you would use a database
USERS = {
    "admin": {
        "username": "admin",
        "password": "wkwkwk",  # In production, use hashed passwords
        "disabled": False,
    }
}


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None
    company: Optional[str] = None  # tambahkan company
    role: Optional[str] = None  # tambahkan role


class LoginRequest(BaseModel):
    username: str
    password: str


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt


async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    return token_data


@router.post("/auth/login")
async def login(login_data: LoginRequest):
    user = get_user_by_username(login_data.username)
    if not user or user.password != login_data.password:
        raise HTTPException(status_code=400, detail="Incorrect username or password")

    # Set token expiration to 5 years
    access_token_expires = timedelta(days=365 * 5)
    access_token = create_access_token(
        data={
            "sub": user.username,
            "company": user.company,  # tambahkan company ke token
            "role": user.role,  # tambahkan role ke token
        },
        expires_delta=access_token_expires,
    )

    return {"access_token": access_token, "token_type": "bearer"}
