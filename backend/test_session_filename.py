import asyncio
import os
import sys
sys.path.append(os.getcwd())
from telegram_client import client_manager
from database import SessionLocal

async def test():
    db = SessionLocal()
    # Force client to instantiate
    client = await client_manager.get_client(db, 2)
    print("Client 2 session filename:", client.session.filename)
    
    # Now simulate get_transient_client check
    session_name = "login_2348109760571"
    for key, existing_client in client_manager.clients.items():
        if getattr(existing_client.session, 'filename', None):
            print("Found filename in cache:", existing_client.session.filename)
            if session_name in existing_client.session.filename:
                print("MATCH FOUND!")
        else:
            print("No filename attr on session")
    db.close()

if __name__ == "__main__":
    asyncio.run(test())
