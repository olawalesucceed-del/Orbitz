import asyncio
import sys
import os
sys.path.append(os.getcwd())
try:
    from database import SessionLocal, Account
    from telegram_client import client_manager
    async def run():
        res = await client_manager.sync_dialogs(2) # Account ID 2 corresponds to login_2348109760571
        print("API RESULT:", res)
    asyncio.run(run())
except Exception as e:
    import traceback
    traceback.print_exc()
