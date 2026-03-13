import urllib.request
import json

req = urllib.request.Request(
    'http://localhost:8000/auth/request-login', 
    data=json.dumps({"phone": "2348109760571"}).encode('utf-8'), 
    headers={'Content-Type': 'application/json'}
)
try:
    with urllib.request.urlopen(req) as response:
        print("Success:", response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code, e.read().decode('utf-8'))
except Exception as e:
    print("Error:", str(e))
