from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

import asyncio
from database import get_db, Account, User
from telegram_client import client_manager
from ai_engine import parse_command
from auth_utils import get_current_user

router = APIRouter(prefix="/commands", tags=["commands"])

class CommandRequest(BaseModel):
    account_id: int
    text: str

@router.post("/execute")
async def execute_command(req: CommandRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Verify account ownership
    account = db.query(Account).filter(Account.id == req.account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    # Simple natural language parsing via ai_engine
    parsed = parse_command(req.text)
    action = parsed.get("action")
    params = parsed.get("params", {})
    
    if action == "scan_groups":
        asyncio.create_task(client_manager.scan_groups(req.account_id, is_manual=True))
        return {"status": "scanning started"}
    elif action == "discover_groups":
        asyncio.create_task(client_manager.discover_and_join_groups(req.account_id))
        return {"status": "group discovery started"}
    elif action == "sync_chats":
        asyncio.create_task(client_manager.sync_dialogs(req.account_id))
        return {"status": "chat sync started"}
    elif action == "enable_auto_scan":
        from database import set_setting
        set_setting(db, req.account_id, "auto_scan_enabled", "true")
        return {"status": "background scanning enabled"}
    elif action == "disable_auto_scan":
        from database import set_setting
        set_setting(db, req.account_id, "auto_scan_enabled", "false")
        return {"status": "background scanning disabled"}
    elif action == "send_messages":
        count = params.get("count", 5)
        asyncio.create_task(client_manager.send_outreach(req.account_id, count, is_manual=True))
        return {"status": "outreach started"}
    elif action == "broadcast_groups":
        # Extract broadcast text by removing the prefix if present
        prefix = "broadcast to groups: "
        if req.text.lower().startswith(prefix):
            broadcast_text = req.text[len(prefix):].strip()
        else:
            broadcast_text = req.text
            
        # DIAGNOSTIC: Log the intent to broadcast
        client_manager.log_action(db, req.account_id, "broadcast", f"Initiating broadcast task via API...")
        asyncio.create_task(client_manager.post_to_groups(req.account_id, broadcast_text))
        return {"status": "group broadcast started"}
    else:
        return {"status": "unknown command", "parsed": parsed}

