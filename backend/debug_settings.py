from database import SessionLocal, Settings, Account, Lead
import json

def debug():
    db = SessionLocal()
    try:
        accounts = db.query(Account).all()
        for a in accounts:
            paused = db.query(Settings).filter(Settings.account_id == a.id, Settings.key == "messaging_paused").first()
            start = db.query(Settings).filter(Settings.account_id == a.id, Settings.key == "active_hours_start").first()
            keywords = db.query(Settings).filter(Settings.account_id == a.id, Settings.key == "target_keywords").first()
            niche = db.query(Settings).filter(Settings.account_id == a.id, Settings.key == "target_niche").first()
            leads = db.query(Lead).filter(Lead.account_id == a.id, Lead.status == "New").count()
            
            print(f"Acc {a.id} ({a.session_name}):")
            print(f"  - paused: {paused.value if paused else '?'}")
            print(f"  - active_start: {start.value if start else '?'}")
            print(f"  - keywords: {keywords.value if keywords else '?'}")
            print(f"  - niche: {niche.value if niche else '?'}")
            print(f"  - new_leads: {leads}")
    finally:
        db.close()

if __name__ == "__main__":
    debug()
