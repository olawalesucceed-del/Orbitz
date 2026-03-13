from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from database import get_db, Lead, Message, Account, User
from auth_utils import get_current_user
from telegram_client import client_manager

router = APIRouter(prefix="/leads", tags=["leads"])

@router.post("/sync")
async def sync_leads(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify account ownership
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    result = await client_manager.sync_dialogs(account_id)
    return result

@router.post("/discover")
async def discover_groups(
    account_id: int,
    keyword: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify account ownership
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    # Run discovery in background to avoid timeout
    asyncio.create_task(client_manager.discover_and_join_groups(account_id, keyword=keyword))
    return {"status": "Group discovery and join process started in background"}

class LeadResponse(BaseModel):
    id: int
    account_id: int
    username: str
    first_name: Optional[str]
    last_name: Optional[str]
    group_source: Optional[str]
    score: float
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

@router.get("", response_model=List[LeadResponse])
async def get_leads(
    account_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    accounts = db.query(Account).filter(Account.user_id == current_user.id).all()
    account_ids = [acc.id for acc in accounts]
    
    if not account_ids:
        return []

    if account_id:
        # Verify account ownership
        if account_id not in account_ids:
            raise HTTPException(status_code=404, detail="Account not found")
        query = db.query(Lead).filter(Lead.account_id == account_id)
    else:
        # Get leads across all user accounts
        query = db.query(Lead).filter(Lead.account_id.in_(account_ids))

    if status:
        query = query.filter(Lead.status == status)
    
    return query.order_by(Lead.score.desc()).all()

@router.get("/count-by-status")
async def count_leads_by_status(
    account_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    accounts = db.query(Account).filter(Account.user_id == current_user.id).all()
    account_ids = [acc.id for acc in accounts]
    
    if not account_ids:
        return {}

    query = db.query(Lead.status, func.count(Lead.id))
    if account_id:
        if account_id not in account_ids:
            raise HTTPException(status_code=404, detail="Account not found")
        query = query.filter(Lead.account_id == account_id)
    else:
        query = query.filter(Lead.account_id.in_(account_ids))
    
    results = query.group_by(Lead.status).all()
    return {status: count for status, count in results}

@router.get("/messages/{username}")
async def get_lead_messages_by_username(
    username: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    accounts = db.query(Account).filter(Account.user_id == current_user.id).all()
    account_ids = [acc.id for acc in accounts]
    
    if not account_ids:
        return []

    # Get messages for this username across all user accounts
    return db.query(Message).filter(Message.username == username, Message.account_id.in_(account_ids)).order_by(Message.sent_at.asc()).all()

@router.post("/{lead_id}")
async def update_lead(lead_id: int, data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Verify ownership via account
    account = db.query(Account).filter(Account.id == lead.account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    if "status" in data:
        lead.status = data["status"]
    if "notes" in data:
        lead.notes = data["notes"]
        
    db.commit()
    return {"success": True}
