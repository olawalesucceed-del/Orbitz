from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from database import get_db, Account, User
from auth_utils import get_current_user
from telegram_client import client_manager

router = APIRouter(prefix="/chats", tags=["chats"])

class ChatInfo(BaseModel):
    id: int
    name: str
    type: str
    unread_count: int
    last_message: str
    date: Optional[str]
    username: Optional[str]

@router.get("/list", response_model=dict)
async def list_chats(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify account ownership
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    result = await client_manager.get_chats(account_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result

@router.get("/avatar/{chat_id}")
async def get_avatar(
    chat_id: int,
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify account ownership
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    path = await client_manager.get_chat_avatar(account_id, chat_id)
    return {"path": path}
@router.get("/messages/{chat_id}")
async def get_messages(
    chat_id: int,
    account_id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify account ownership
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    result = await client_manager.get_chat_messages(account_id, chat_id, limit)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result

@router.get("/me")
async def get_my_profile(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify account ownership
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    result = await client_manager.get_me(account_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result

@router.get("/members/{chat_id}")
async def get_members(
    chat_id: int,
    account_id: int,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify account ownership
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    result = await client_manager.get_group_participants(account_id, chat_id, limit)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result

@router.get("/user/{user_id}")
async def get_user_profile(
    user_id: int,
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify account ownership
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    result = await client_manager.get_user_profile(account_id, user_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result
