from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from database import get_db, Account, ActionLog, init_default_settings, User
from telegram_client import client_manager
from auth_utils import get_password_hash, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

class UserCreate(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class AccountInfo(BaseModel):
    id: int
    session_name: str
    phone: Optional[str]
    is_active: bool

class AuthRequest(BaseModel):
    account_id: int
    phone: str

class VerifyRequest(BaseModel):
    account_id: int
    phone: str
    code: str
    phone_code_hash: str
    password: Optional[str] = None

class DirectAuthRequest(BaseModel):
    phone: str

class DirectVerifyRequest(BaseModel):
    phone: str
    code: str
    phone_code_hash: str
    password: Optional[str] = None

@router.post("/register", response_model=Token)
async def register(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == user_in.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    new_user = User(
        username=user_in.username,
        hashed_password=get_password_hash(user_in.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token = create_access_token(data={"sub": new_user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
async def login(user_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == user_in.username).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "username": current_user.username}

@router.get("/accounts", response_model=List[AccountInfo])
async def get_accounts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    accounts = db.query(Account).filter(Account.user_id == current_user.id).all()
    return accounts

@router.post("/add")
async def add_account(session_name: str, api_id: Optional[int] = None, api_hash: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Account).filter(Account.session_name == session_name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Session name already exists")
    
    new_acc = Account(session_name=session_name, api_id=api_id, api_hash=api_hash, user_id=current_user.id)
    db.add(new_acc)
    db.commit()
    db.refresh(new_acc)
    
    # Initialize settings for this account
    init_default_settings(db, new_acc.id)
    
    return {"account_id": new_acc.id}

@router.post("/send-code")
async def send_code(req: AuthRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Verify account ownership
    account = db.query(Account).filter(Account.id == req.account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    result = await client_manager.send_code(db, req.account_id, req.phone)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.post("/verify-code")
async def verify_code(req: VerifyRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Verify account ownership
    account = db.query(Account).filter(Account.id == req.account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    result = await client_manager.verify_code(
        db, req.account_id, req.phone, req.code, req.phone_code_hash, req.password
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

# --- Direct Telegram Login Flow ---

@router.post("/request-login")
async def request_login(req: DirectAuthRequest, db: Session = Depends(get_db)):
    result = await client_manager.send_login_code(req.phone)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to send code"))
    return result

@router.post("/verify-login", response_model=Token)
async def verify_login(req: DirectVerifyRequest, db: Session = Depends(get_db)):
    result = await client_manager.verify_login_code(
        req.phone, req.code, req.phone_code_hash, req.password
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Verification failed"))
        
    # Verification successful. Auto-provision User and Account.
    from auth_utils import get_password_hash, create_access_token
    import secrets
    
    # Clean phone to use as base identifier
    clean_phone = "".join(filter(str.isdigit, req.phone))
    
    # 1. Check or create User
    # We use the phone number as the username for these auto-provisioned accounts
    username = clean_phone
    user = db.query(User).filter(User.username == username).first()
    
    if not user:
        # Create a new user with a random un-guessable password since they only log in via OTP
        random_pass = secrets.token_urlsafe(32)
        user = User(
            username=username,
            hashed_password=get_password_hash(random_pass)
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
    # 2. Check or create Telegram Account linked to this User
    session_name = result.get("session_name")
    account = db.query(Account).filter(Account.session_name == session_name).first()
    
    if not account:
        account = Account(
            session_name=session_name,
            phone=result.get("phone", req.phone),
            user_id=user.id
        )
        db.add(account)
        db.commit()
        db.refresh(account)
        init_default_settings(db, account.id)
    
    # 3. Adopt the live Telegram client into client_manager under the real account_id.
    #    This moves it from the temporary phone-keyed cache so all background jobs can use it.
    import asyncio
    await client_manager.adopt_client(account.id, clean_phone)

    # 4. Start reply listener for live tracking of incoming messages
    if account.id not in client_manager.monitoring_tasks or client_manager.monitoring_tasks[account.id].done():
        client_manager.monitoring_tasks[account.id] = asyncio.create_task(
            client_manager.start_reply_listener(account.id)
        )

    # 5. Kick off immediate background sync + scan so dashboard shows data right away
    async def _initial_startup(account_id: int):
        import logging
        log = logging.getLogger(__name__)
        try:
            await client_manager.sync_dialogs(account_id)
        except Exception as e:
            log.warning(f"Initial sync failed for account {account_id}: {e}")
    # 5. Generate JWT Token for the User
    access_token = create_access_token(data={"sub": user.username})
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "account_id": account.id,
        "phone": account.phone
    }

@router.get("/status/{account_id}")
async def get_status(account_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    authorized = await client_manager.is_authorized(db, account_id)
    return {
        "connected": authorized,
        "phone": account.phone,
        "session_name": account.session_name
    }

@router.post("/logout/{account_id}")
async def logout(account_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    await client_manager.disconnect_client(account_id)
    return {"success": True}
