import asyncio
from database import SessionLocal, Account
from telegram_client import client_manager
import logging

# Disable verbose logging to keep output clean
logging.getLogger('telethon').setLevel(logging.ERROR)

async def check_health():
    db = SessionLocal()
    try:
        accounts = db.query(Account).all()
        print(f"Found {len(accounts)} accounts in DB.")
        for a in accounts:
            print(f"\n--- Checking Account {a.id} ({a.session_name}) ---")
            try:
                client = await client_manager.get_client(db, a.id)
                if not client:
                    print("  - Status: FAILED (Could not get client instance)")
                    continue
                
                authorized = await client.is_user_authorized()
                print(f"  - Authorized: {authorized}")
                
                if authorized:
                    me = await client.get_me()
                    print(f"  - Telegram User: {me.first_name} (@{me.username})")
                    
                    dialogs = await client.get_dialogs()
                    groups = [d for d in dialogs if d.is_group or d.is_channel]
                    print(f"  - Joined Groups/Channels: {len(groups)}")
                    
                    # Log first 3 groups
                    for d in groups[:3]:
                        print(f"    * Group: {d.name} (ID: {d.id})")
                
            except Exception as e:
                print(f"  - Error: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(check_health())
