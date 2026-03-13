
import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.getcwd())

from telegram_client import client_manager
from database import SessionLocal, Account

async def test_sync():
    db = SessionLocal()
    account = db.query(Account).filter(Account.session_name == "login_2348109760571").first()
    if not account:
        print("Target account not found")
        return
    
    print(f"Syncing account: {account.session_name} (ID: {account.id})")
    result = await client_manager.sync_dialogs(account.id)
    print(f"Result: {result}")
    db.close()

if __name__ == "__main__":
    asyncio.run(test_sync())
