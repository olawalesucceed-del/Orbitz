"""
Telegram Web Scout API Routes
"""
import asyncio
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel

from database import get_db, Account, User
from auth_utils import get_current_user
from web_scout import web_scout_engine, normalize_group

router = APIRouter(prefix="/web-scout", tags=["web-scout"])


class GroupScanRequest(BaseModel):
    account_id: int
    groups: List[str]                        # t.me links or @usernames
    keywords: Optional[List[str]] = None


@router.post("/scan/groups")
async def scan_groups(
    req: GroupScanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Scan public Telegram group preview pages for buyers."""
    account = db.query(Account).filter(
        Account.id == req.account_id,
        Account.user_id == current_user.id
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    if not req.groups:
        raise HTTPException(status_code=400, detail="At least one group is required")

    from main import broadcast_to_all
    asyncio.create_task(
        web_scout_engine.scan_groups(
            account_id=req.account_id,
            group_usernames=req.groups,
            extra_keywords=req.keywords,
            broadcast_callback=broadcast_to_all,
        )
    )
    clean = [normalize_group(g) for g in req.groups if normalize_group(g)]
    return {
        "status": "started",
        "groups": clean,
        "message": f"Scanning {len(clean)} Telegram groups in background…"
    }


@router.get("/suggested-groups")
async def get_suggested_groups(
    account_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return suggested public Telegram groups based on account niche."""
    account = db.query(Account).filter(
        Account.id == account_id,
        Account.user_id == current_user.id
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    groups = web_scout_engine.get_suggested_groups(account_id)
    return {"groups": groups}
