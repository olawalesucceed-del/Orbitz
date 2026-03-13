from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from database import get_db, Lead, Message, DailyCounter, Account, User
from auth_utils import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/summary")
async def get_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    accounts = db.query(Account).filter(Account.user_id == current_user.id).all()
    account_ids = [acc.id for acc in accounts]
    
    if not account_ids:
        return {
            "total_leads": 0,
            "contacted": 0,
            "replied": 0,
            "messages_sent_today": 0,
            "accounts_count": 0
        }

    total_leads = db.query(Lead).filter(Lead.account_id.in_(account_ids)).count()
    contacted_leads = db.query(Lead).filter(Lead.account_id.in_(account_ids), Lead.status != "New").count()
    replied_leads = db.query(Lead).filter(Lead.account_id.in_(account_ids), Lead.status == "Replied").count()
    
    today = datetime.utcnow().strftime("%Y-%m-%d")
    today_count = db.query(func.sum(DailyCounter.messages_sent)).filter(
        DailyCounter.account_id.in_(account_ids), 
        DailyCounter.date == today
    ).scalar() or 0
    
    return {
        "total_leads": total_leads,
        "contacted": contacted_leads,
        "replied": replied_leads,
        "messages_sent_today": int(today_count),
        "accounts_count": len(accounts)
    }

@router.get("/stats")
async def get_global_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Get recent activity across all user accounts
    accounts = db.query(Account).filter(Account.user_id == current_user.id).all()
    account_ids = [acc.id for acc in accounts]
    
    if not account_ids:
        return {"recent_activity": []}

    from database import ActionLog
    recent_activity = db.query(ActionLog).filter(ActionLog.account_id.in_(account_ids)).order_by(ActionLog.timestamp.desc()).limit(10).all()
    
    return {
        "recent_activity": [
            {
                "action": a.action_type,
                "detail": a.detail,
                "timestamp": a.timestamp,
                "success": a.success
            } for a in recent_activity
        ]
    }

@router.get("/weekly-stats")
async def get_weekly_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    accounts = db.query(Account).filter(Account.user_id == current_user.id).all()
    account_ids = [acc.id for acc in accounts]
    
    if not account_ids:
        return []

    # Last 7 days
    stats = []
    for i in range(6, -1, -1):
        date = (datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d")
        label = (datetime.utcnow() - timedelta(days=i)).strftime("%a")
        
        msgs = db.query(func.sum(DailyCounter.messages_sent)).filter(
            DailyCounter.account_id.in_(account_ids),
            DailyCounter.date == date
        ).scalar() or 0
        
        # Approximate leads found per day (using created_at)
        start_day = datetime.utcnow() - timedelta(days=i)
        start_day = start_day.replace(hour=0, minute=0, second=0, microsecond=0)
        end_day = start_day + timedelta(days=1)
        
        leads = db.query(Lead).filter(
            Lead.account_id.in_(account_ids),
            Lead.created_at >= start_day,
            Lead.created_at < end_day
        ).count()
        
        stats.append({
            "label": label,
            "messages": int(msgs),
            "leads": leads
        })
    return stats

@router.get("/stats/{account_id}")
async def get_stats(account_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Verify account ownership
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    total_leads = db.query(Lead).filter(Lead.account_id == account_id).count()
    contacted_leads = db.query(Lead).filter(Lead.account_id == account_id, Lead.status != "New").count()
    replied_leads = db.query(Lead).filter(Lead.account_id == account_id, Lead.status == "Replied").count()
    
    today = datetime.utcnow().strftime("%Y-%m-%d")
    today_count = db.query(DailyCounter).filter(DailyCounter.account_id == account_id, DailyCounter.date == today).first()
    
    return {
        "total_leads": total_leads,
        "contacted": contacted_leads,
        "replied": replied_leads,
        "messages_sent_today": today_count.messages_sent if today_count else 0
    }
