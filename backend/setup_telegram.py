import os
import sys

def setup():
    print("\n" + "="*50)
    print("   IPTV SCOUT — TELEGRAM API SETUP   ")
    print("="*50 + "\n")
    
    print("To use this platform, you need two secret keys from Telegram.")
    print("Follow these 3 simple steps to get them:\n")
    print("1. Open your browser and go to: https://my.telegram.org")
    print("2. Log in with your phone number.")
    print("3. Click 'API development tools'.\n")
    print("You will see 'App api_id' and 'App api_hash'. Copy them below:\n")
    
    api_id = input("Enter your App api_id (numbers only): ").strip()
    while not api_id.isdigit():
        print("Error: api_id must be numbers only.")
        api_id = input("Enter your App api_id: ").strip()
        
    api_hash = input("Enter your App api_hash (long string): ").strip()
    while len(api_hash) < 10:
        print("Error: api_hash looks too short.")
        api_hash = input("Enter your App api_hash: ").strip()
        
    env_content = f"""# Get these from https://my.telegram.org
TELEGRAM_API_ID={api_id}
TELEGRAM_API_HASH={api_hash}

# Session name (can be anything, e.g. your name)
SESSION_NAME=iptv_scout

# Safety Limits
MAX_MESSAGES_PER_DAY=30
MIN_DELAY_SECONDS=90
MAX_DELAY_SECONDS=180
"""
    
    with open(".env", "w") as f:
        f.write(env_content)
        
    print("\n✅ Successfully saved your keys to .env!")
    print("You can now close this window and restart the app.\n")

if __name__ == "__main__":
    setup()
