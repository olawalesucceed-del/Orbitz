import sqlite3
import os

db_path = "scout.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("--- USERS ---")
    cursor.execute("SELECT id, username FROM users")
    for row in cursor.fetchall():
        print(row)
        
    print("\n--- ACCOUNTS ---")
    cursor.execute("SELECT id, user_id, session_name, phone, api_id, is_active FROM accounts")
    for row in cursor.fetchall():
        print(row)
        
    conn.close()
else:
    print("Database not found")
