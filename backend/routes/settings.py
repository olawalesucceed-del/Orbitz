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
