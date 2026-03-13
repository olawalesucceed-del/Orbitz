import asyncio
import os
import sys
sys.path.append(os.getcwd())
from telegram_client import client_manager

async def test():
    print("Testing get_transient_client...")
    api_id = int(os.getenv("TELEGRAM_API_ID", 0))
    api_hash = os.getenv("TELEGRAM_API_HASH")
    print(f"API ID loaded: {api_id}")
    print(f"API Hash loaded: {'YES' if api_hash else 'NO'}")
    
    client = await client_manager.get_transient_client("2348109760571")
    if client:
        print("Success! Client returned:", client)
        await client.disconnect()
    else:
        print("Failed: get_transient_client returned None.")

if __name__ == "__main__":
    asyncio.run(test())
