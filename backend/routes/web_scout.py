"""
Web Scout API Routes
Exposes endpoints to trigger web-based buyer detection scans.
"""
import asyncio
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel

from database import get_db, Account, User
from auth_utils import get_current_user
from web_scout import web_scout_engine

router = APIRouter(prefix="/web-scout", tags=["web-scout"])


# ─── Request models ───────────────────────────────────────────────────────────

class RedditScanRequest(BaseModel):
    account_id: int
    subreddits: Optional[List[str]] = None
    keywords: Optional[List[str]] = None

class UrlScanRequest(BaseModel):
    account_id: int
    url: str
    keywords: Optional[List[str]] = None


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/scan/reddit")
async def scan_reddit(
    req: RedditScanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Scan a list of subreddits for buying intent posts mentioning Telegram usernames."""
    account = db.query(Account).filter(
        Account.id == req.account_id,
        Account.user_id == current_user.id
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    # Run in background so the API doesn't timeout on large scans
    from main import broadcast_to_all
    asyncio.create_task(
        web_scout_engine.scan_reddit(
            account_id=req.account_id,
            subreddits=req.subreddits,
            extra_keywords=req.keywords,
            broadcast_callback=broadcast_to_all,
        )
    )
    subs = req.subreddits or web_scout_engine.get_suggested_subreddits(req.account_id)
    return {"status": "started", "subreddits": subs, "message": f"Scanning {len(subs)} subreddits in background..."}


@router.post("/scan/url")
async def scan_url(
    req: UrlScanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch a custom public URL and scan it for buyer signals and Telegram usernames."""
    account = db.query(Account).filter(
        Account.id == req.account_id,
        Account.user_id == current_user.id
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    if not req.url.startswith("http"):
        raise HTTPException(status_code=400, detail="URL must start with http:// or https://")

    # Run synchronously since it's a single URL (fast)
    result = await web_scout_engine.scan_custom_url(
        account_id=req.account_id,
        url=req.url,
        extra_keywords=req.keywords,
    )
    return result


@router.get("/sources")
async def get_sources(
    account_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return suggested subreddits based on account's niche setting."""
    account = db.query(Account).filter(
        Account.id == account_id,
        Account.user_id == current_user.id
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    subreddits = web_scout_engine.get_suggested_subreddits(account_id)
    return {
        "subreddits": subreddits,
        "extra_sources": [
            {"name": "Telegram Web Groups", "placeholder": "https://t.me/s/iptv"},
            {"name": "Forum / Board", "placeholder": "https://forum.example.com/category"},
        ]
    }
