"""
Database models and setup for the Telegram Scout Platform
"""
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

DATABASE_URL = "sqlite:///./scout.db"

engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False, "timeout": 10}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    accounts = relationship("Account", back_populates="owner")


class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    session_name = Column(String, unique=True, index=True)
    phone = Column(String, unique=True, index=True, nullable=True)
    api_id = Column(Integer, nullable=True)
    api_hash = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="accounts")
    leads = relationship("Lead", back_populates="account")
    messages = relationship("Message", back_populates="account")
    action_logs = relationship("ActionLog", back_populates="account")
    settings = relationship("Settings", back_populates="account")
    daily_counters = relationship("DailyCounter", back_populates="account")


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), index=True)
    username = Column(String, index=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    group_source = Column(String)
    group_id = Column(Integer, nullable=True)
    score = Column(Float, default=0.0)
    status = Column(String, default="New")  # New, Contacted, Replied, Interested, Client
    notes = Column(Text, nullable=True)
    keywords_matched = Column(Text, nullable=True)  # JSON list of matched keywords
    created_at = Column(DateTime, default=datetime.utcnow)
    contacted_at = Column(DateTime, nullable=True)
    replied_at = Column(DateTime, nullable=True)

    account = relationship("Account", back_populates="leads")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), index=True)
    lead_id = Column(Integer, index=True)
    username = Column(String)
    content = Column(Text)
    direction = Column(String)  # "sent" or "received"
    sent_at = Column(DateTime, default=datetime.utcnow)
    telegram_msg_id = Column(Integer, nullable=True)

    account = relationship("Account", back_populates="messages")


class ActionLog(Base):
    __tablename__ = "action_logs"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), index=True)
    action_type = Column(String)  # scan, message, reply_received, error, pause, resume
    detail = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)
    success = Column(Boolean, default=True)

    account = relationship("Account", back_populates="action_logs")


class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), index=True)
    key = Column(String, index=True)
    value = Column(Text)

    account = relationship("Account", back_populates="settings")


class DailyCounter(Base):
    __tablename__ = "daily_counters"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), index=True)
    date = Column(String, index=True)  # YYYY-MM-DD
    messages_sent = Column(Integer, default=0)

    account = relationship("Account", back_populates="daily_counters")


def create_tables():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_setting(db, account_id: int, key: str, default=None):
    row = db.query(Settings).filter(Settings.account_id == account_id, Settings.key == key).first()
    return row.value if row else default


def set_setting(db, account_id: int, key: str, value: str):
    row = db.query(Settings).filter(Settings.account_id == account_id, Settings.key == key).first()
    if row:
        row.value = value
    else:
        row = Settings(account_id=account_id, key=key, value=value)
        db.add(row)
    db.commit()


def init_default_settings(db, account_id: int):
    defaults = {
        "max_messages_per_day": "30",
        "min_delay_seconds": "90",
        "max_delay_seconds": "180",
        "messaging_paused": "false",
        "outreach_template_1": "Hi {name}! I noticed you might be interested in what I offer. I provide professional solutions that can help grow your business. Would you like to know more? 🚀",
        "outreach_template_2": "Hey {name}! Are you looking for a reliable service in this space? I specialize in helping people find exactly what they need. Let me know if you're interested! 💡",
        "outreach_template_3": "Hello {name}! I think we could work together — I offer premium solutions tailored to your needs. Interested in a quick chat? 🎯",
        "active_hours_start": "8",
        "active_hours_stop": "22",
        "auto_outreach_enabled": "false",
    }
    for key, value in defaults.items():
        existing = db.query(Settings).filter(Settings.account_id == account_id, Settings.key == key).first()
        if not existing:
            db.add(Settings(account_id=account_id, key=key, value=value))
    db.commit()

