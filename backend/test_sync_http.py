import os
import sys
import json
import urllib.request
sys.path.append(os.getcwd())
from auth_utils import create_access_token
from datetime import timedelta

def start_sync():
    token = create_access_token(data={"sub": "2348109760571"}, expires_delta=timedelta(minutes=60))
    url = "http://localhost:8000/leads/sync?account_id=2"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    print(f"Sending POST to {url}...")
    req = urllib.request.Request(url, data=b"", headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as response:
            print("STATUS:", response.status)
            print("RESPONSE:", json.loads(response.read().decode('utf-8')))
    except urllib.error.HTTPError as e:
        print("HTTP ERROR:", e.code)
        print("ERROR BODY:", e.read().decode('utf-8'))
    except Exception as e:
        print("ERROR:", e)

if __name__ == "__main__":
    start_sync()
