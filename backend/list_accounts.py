import sys
import os
sys.path.append(os.getcwd())
try:
    from database import SessionLocal, Account
    db = SessionLocal()
    accounts = db.query(Account).all()
    print("ACCOUNTS:")
    for a in accounts:
        print(f"ID: {a.id}, session: {a.session_name}, phone: {a.phone}, active: {a.is_active}")
    db.close()
except Exception as e:
    print(e)
