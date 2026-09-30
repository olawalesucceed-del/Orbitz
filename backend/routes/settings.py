from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from auth_utils import get_current_user
from database import get_db, Account, get_setting, set_setting, User

router = APIRouter(prefix="/settings", tags=["settings"])

class SettingUpdate(BaseModel):
    account_id: int
    key: str
    value: str

@router.get("/{account_id}")
async def get_all_settings(account_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Verify ownership
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
        
    from database import Settings
    settings = db.query(Settings).filter(Settings.account_id == account_id).all()
    return {s.key: s.value for s in settings}

@router.put("/{account_id}")
async def bulk_update_settings(account_id: int, data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Verify ownership
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
        
    for key, value in data.items():
        set_setting(db, account_id, key, str(value))
    return {"success": True}
@router.post("/update")
async def update_setting(req: SettingUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Verify ownership
    account = db.query(Account).filter(Account.id == req.account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
        
    set_setting(db, req.account_id, req.key, req.value)
    return {"success": True}

@router.post("/pause/{account_id}")
async def pause_account(account_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Verify ownership
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
        
    set_setting(db, account_id, "messaging_paused", "true")
    return {"paused": True}

@router.post("/resume/{account_id}")
async def resume_account(account_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Verify ownership
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
        
    set_setting(db, account_id, "messaging_paused", "false")
    return {"paused": False}

@router.post("/toggle-pause")
async def toggle_pause(account_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Verify ownership
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
        
    current = get_setting(db, account_id, "messaging_paused", "false")
    new_status = "true" if current == "false" else "false"
    set_setting(db, account_id, "messaging_paused", new_status)
    return {"paused": new_status == "true"}


# ── Auto-Post Scheduler ──────────────────────────────────────────────────────
class AutoPostRequest(BaseModel):
    account_id: int
    message: str
    interval_minutes: int = 30
    enabled: bool = True

@router.post("/autopost/save")
async def save_autopost(req: AutoPostRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    account = db.query(Account).filter(Account.id == req.account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    set_setting(db, req.account_id, "autopost_message", req.message)
    set_setting(db, req.account_id, "autopost_interval", str(req.interval_minutes))
    set_setting(db, req.account_id, "autopost_enabled", "true" if req.enabled else "false")
    return {"success": True, "message": f"Auto-post {'enabled' if req.enabled else 'disabled'} every {req.interval_minutes} minutes."}

@router.post("/autopost/stop")
async def stop_autopost(account_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    set_setting(db, account_id, "autopost_enabled", "false")
    return {"success": True}

@router.get("/autopost/status/{account_id}")
async def get_autopost_status(account_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return {
        "enabled": get_setting(db, account_id, "autopost_enabled", "false") == "true",
        "message": get_setting(db, account_id, "autopost_message", ""),
        "interval_minutes": int(get_setting(db, account_id, "autopost_interval", "30")),
        "last_status": get_setting(db, account_id, "last_autopost_status", ""),
        "last_timestamp": int(get_setting(db, account_id, "last_autopost_timestamp", "0")),
    }


# ── Broadcast to all groups ───────────────────────────────────────────────────
class BroadcastRequest(BaseModel):
    account_id: int
    message: str

@router.post("/broadcast")
async def broadcast_to_groups(req: BroadcastRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    account = db.query(Account).filter(Account.id == req.account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    from telegram_client import client_manager
    result = await client_manager.post_to_groups(req.account_id, req.message)
    return result

