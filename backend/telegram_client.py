import asyncio
import logging
import random
import json
import os
from datetime import datetime, date
from typing import Optional, List, Dict
from dotenv import load_dotenv

from telethon import TelegramClient, events
from telethon.tl.types import User, Channel, Chat
from telethon.tl.functions.channels import JoinChannelRequest
from telethon.tl.functions.contacts import SearchRequest
from telethon.errors import FloodWaitError, UserPrivacyRestrictedError, PeerFloodError, SessionPasswordNeededError

from database import SessionLocal, Account, Lead, Message, ActionLog, DailyCounter, get_setting, set_setting
from ai_engine import score_lead, is_potential_lead, suggest_followup, generate_outreach_message

load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TelegramClientManager:
    def __init__(self):
        self.clients: Dict[int, TelegramClient] = {}  # account_id -> TelegramClient
        self.broadcast_callback = None
        self.monitoring_tasks: Dict[int, asyncio.Task] = {}

    def log_action(self, db, account_id: int, action_type: str, detail: str, success: bool = True):
        # Resilience: Add retry for database locks in logging
        max_retries = 3
        for attempt in range(max_retries):
            try:
                log = ActionLog(account_id=account_id, action_type=action_type, detail=detail, success=success)
                db.add(log)
                db.commit()
                return
            except Exception as e:
                if "locked" in str(e).lower() and attempt < max_retries - 1:
                    db.rollback()
                    import time
                    time.sleep(0.5)
                else:
                    logger.error(f"Failed to log action {action_type}: {e}")
                    db.rollback()
                    break

    async def broadcast(self, message: dict):
        if self.broadcast_callback:
            await self.broadcast_callback(message)

    async def get_client(self, db, account_id: int) -> Optional[TelegramClient]:
        if account_id in self.clients and self.clients[account_id].is_connected():
            return self.clients[account_id]

        account = db.query(Account).filter(Account.id == account_id).first()
        if not account:
            return None

        api_id = account.api_id or int(os.getenv("TELEGRAM_API_ID", 0))
        api_hash = account.api_hash or os.getenv("TELEGRAM_API_HASH")

        if not api_id or not api_hash:
            logger.error(f"Missing API ID or Hash for account {account_id}")
            return None

        dirname = os.path.dirname(__file__)
        session_path = os.path.join(dirname, f"{account.session_name}.session")
        client = TelegramClient(session_path, api_id, api_hash)
        
        try:
            # Add retry logic for "database is locked" errors
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    await client.connect()
                    break
                except Exception as e:
                    if "database is locked" in str(e).lower() and attempt < max_retries - 1:
                        logger.warning(f"Database locked for account {account_id}, retrying ({attempt+1}/{max_retries})...")
                        await asyncio.sleep(2)
                    else:
                        raise e

            if await client.is_user_authorized():
                self.clients[account_id] = client
                # Start reply monitoring for this account
                if account_id not in self.monitoring_tasks or self.monitoring_tasks[account_id].done():
                    self.monitoring_tasks[account_id] = asyncio.create_task(self.start_reply_listener(account_id))
                return client
        except Exception as e:
            logger.error(f"Failed to connect client for account {account_id}: {e}")
            # Try to disconnect safely if it partially connected
            try: await client.disconnect() 
            except: pass
            
        return None

    async def disconnect_client(self, account_id: int):
        if account_id in self.clients:
            client = self.clients.pop(account_id)
            await client.disconnect()
        if account_id in self.monitoring_tasks:
            task = self.monitoring_tasks.pop(account_id)
            task.cancel()

    async def is_authorized(self, db, account_id: int) -> bool:
        client = await self.get_client(db, account_id)
        if not client:
            return False
        return await client.is_user_authorized()

    async def send_code(self, db, account_id: int, phone: str) -> dict:
        try:
            client = await self.get_client(db, account_id)
            if not client:
                return {"success": False, "error": "Could not initialize client"}
            result = await client.send_code_request(phone)
            self.log_action(db, account_id, "auth", f"OTP sent to {phone}")
            return {"success": True, "phone_code_hash": result.phone_code_hash}
        except Exception as e:
            self.log_action(db, account_id, "auth", f"Failed to send OTP: {str(e)}", success=False)
            return {"success": False, "error": str(e)}

    async def verify_code(self, db, account_id: int, phone: str, code: str, phone_code_hash: str, password: str = None) -> dict:
        try:
            client = await self.get_client(db, account_id)
            if not client:
                return {"success": False, "error": "Could not initialize client"}
            
            try:
                await client.sign_in(phone=phone, code=code, phone_code_hash=phone_code_hash)
            except SessionPasswordNeededError:
                if password:
                    await client.sign_in(password=password)
                else:
                    raise

            me = await client.get_me()
            account = db.query(Account).filter(Account.id == account_id).first()
            account.phone = me.phone or phone
            db.commit()
            self.log_action(db, account_id, "auth", f"Logged in as @{me.username or me.first_name}")
            return {"success": True, "username": me.username, "first_name": me.first_name}
        except Exception as e:
            self.log_action(db, account_id, "auth", f"Login failed: {str(e)}", success=False)
            return {"success": False, "error": str(e)}

    # --- Direct Login Methods (No DB Account ID needed yet) ---
    async def get_transient_client(self, phone: str) -> Optional[TelegramClient]:
        clean_phone = "".join(filter(str.isdigit, phone))
        phone_key = f"phone_{clean_phone}"
        session_name = f"login_{clean_phone}"
        
        # Check temporary cache first
        if phone_key in self.clients and self.clients[phone_key].is_connected():
            return self.clients[phone_key]

        # Check if already connected under an active account ID
        for key, existing_client in self.clients.items():
            if isinstance(key, int) and existing_client.session.filename and session_name in existing_client.session.filename:
                if existing_client.is_connected():
                    return existing_client

        api_id = int(os.getenv("TELEGRAM_API_ID", 0))
        api_hash = os.getenv("TELEGRAM_API_HASH")
        
        if not api_id or not api_hash:
            logger.error("Missing global API ID or Hash for direct login")
            return None

        dirname = os.path.dirname(__file__)
        session_path = os.path.join(dirname, f"{session_name}.session")
        client = TelegramClient(session_path, api_id, api_hash)
        
        try:
            await client.connect()
            if not client.is_connected():
                logger.error(f"Transient client for {phone} failed to connect (likely locked)")
                return None
            return client
        except Exception as e:
            logger.error(f"Failed to connect transient client for {phone}: {e}")
            return None

    async def adopt_client(self, account_id: int, clean_phone: str):
        """Move a temporarily-cached phone-keyed client to its real account_id slot."""
        phone_key = f"phone_{clean_phone}"
        client = self.clients.pop(phone_key, None)
        if client and client.is_connected():
            self.clients[account_id] = client
            logger.info(f"Adopted Telegram client for account {account_id}")
        else:
            # Client not in cache or disconnected — reconnect from saved session file
            from database import SessionLocal
            db = SessionLocal()
            try:
                client = await self.get_client(db, account_id)
                if client:
                    logger.info(f"Reconnected Telegram client for account {account_id} from session file")
                else:
                    logger.warning(f"Could not reconnect client for account {account_id}")
            finally:
                db.close()

    async def send_login_code(self, phone: str) -> dict:
        try:
            formatted_phone = "+" + "".join(filter(str.isdigit, phone))
            client = await self.get_transient_client(phone)
            if not client:
                return {"success": False, "error": "Could not initialize Telegram client"}
            result = await client.send_code_request(formatted_phone)
            await client.disconnect()
            return {"success": True, "phone_code_hash": result.phone_code_hash}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def verify_login_code(self, phone: str, code: str, phone_code_hash: str, password: str = None) -> dict:
        try:
            formatted_phone = "+" + "".join(filter(str.isdigit, phone))
            client = await self.get_transient_client(phone)
            if not client:
                return {"success": False, "error": "Could not initialize Telegram client"}
            
            try:
                await client.sign_in(phone=formatted_phone, code=code, phone_code_hash=phone_code_hash)
            except SessionPasswordNeededError:
                if password:
                    await client.sign_in(password=password)
                else:
                    raise
                
            me = await client.get_me()
            clean_phone = "".join(filter(str.isdigit, phone))
            session_name = f"login_{clean_phone}"

            # Keep the client ALIVE — cache it temporarily under the phone key.
            # auth.py will call adopt_client() to move it under the real account_id.
            self.clients[f"phone_{clean_phone}"] = client
            
            return {
                "success": True, 
                "username": me.username, 
                "first_name": me.first_name,
                "phone": me.phone or formatted_phone,
                "session_name": session_name,
                "_clean_phone": clean_phone
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def is_human_active_hour(self, db, account_id: int) -> bool:
        """Check if the current time is within the user's defined active working hours."""
        now = datetime.now()
        start = int(get_setting(db, account_id, "active_hours_start", "8"))
        stop = int(get_setting(db, account_id, "active_hours_stop", "22"))
        
        if start < stop:
            return start <= now.hour < stop
        else: # Overnight window (e.g. 22:00 to 06:00)
            return now.hour >= start or now.hour < stop

    async def scan_groups(self, account_id: int, max_per_group: int = 200, is_manual: bool = False) -> dict:
        db = SessionLocal()
        try:
            client = await self.get_client(db, account_id)
            if not client or not await client.is_user_authorized():
                return {"success": False, "error": "Not logged into Telegram"}

            kw_setting = get_setting(db, account_id, "target_keywords", "")
            custom_keywords = [k.strip() for k in kw_setting.split(",") if k.strip()] if kw_setting.strip() else None
            niche = get_setting(db, account_id, "target_niche", "IPTV")

            if not await self.is_human_active_hour(db, account_id):
                self.log_action(db, account_id, "safety", "Scan skipped: Outside of active working hours")
                return {"success": False, "error": "Outside of active working hours."}

            trigger_type = "manual" if is_manual else "organic"
            self.log_action(db, account_id, "scan", f"Started {trigger_type} group scan for {niche} leads")
            await self.broadcast({"type": "scan_started", "account_id": account_id, "message": f"Executing {trigger_type} scan..."})

            new_leads = 0
            dialogs = await client.get_dialogs()
            groups = [d for d in dialogs if d.is_group or d.is_channel]

            group_count = 0
            for dialog in groups:
                group_name = dialog.name or "Unknown Group"
                try:
                    # Humanity: Periodical "breaks" — ONLY FOR AUTOMATED SCANS
                    group_count += 1
                    if not is_manual and group_count % 5 == 0:
                        break_min = random.randint(2, 5)
                        logger.info(f"Taking a short {break_min}m coffee break during auto-scan...")
                        await asyncio.sleep(break_min * 60)

                    logger.info(f"Scanning messages in group: {group_name}")
                    messages = await client.get_messages(dialog.entity, limit=max_per_group)
                    
                    matches_in_group = 0
                    for msg in messages:
                        if not msg.sender_id or not msg.text or not is_potential_lead(msg.text, custom_keywords):
                            continue

                        try:
                            # Use sender object from message if available to avoid get_entity floor calls
                            sender = getattr(msg, 'sender', None)
                            if not sender:
                                try:
                                    sender = await client.get_entity(msg.sender_id)
                                except Exception:
                                    continue
                                    
                            if not isinstance(sender, User) or sender.bot:
                                continue
                                
                            username = sender.username or str(sender.id)
                            existing = db.query(Lead).filter(Lead.account_id == account_id, Lead.username == username).first()
                            if existing:
                                continue

                            score, keywords = score_lead(
                                message_text=msg.text,
                                bio="",
                                display_name=f"{sender.first_name or ''} {sender.last_name or ''}",
                                custom_keywords=custom_keywords
                            )

                            if score > 5:
                                lead = Lead(
                                    account_id=account_id,
                                    username=username,
                                    first_name=sender.first_name or "",
                                    last_name=sender.last_name or "",
                                    group_source=group_name,
                                    group_id=dialog.id,
                                    score=score,
                                    status="New",
                                    keywords_matched=json.dumps(keywords)
                                )
                                db.add(lead)
                                for _ in range(5):
                                    try:
                                        db.commit()
                                        break
                                    except Exception as e:
                                        if "locked" in str(e).lower():
                                            await asyncio.sleep(0.5)
                                            continue
                                        raise e
                                new_leads += 1
                                matches_in_group += 1
                                await self.broadcast({"type": "new_lead", "account_id": account_id, "username": username, "score": score, "group": group_name})
                        except Exception:
                            continue
                    
                    if matches_in_group == 0:
                        logger.info(f"No leads found in {group_name} with current keywords.")
                    
                    # Humanity: Slower scrolling delay between groups
                    delay = random.uniform(1.2, 3.5) if is_manual else random.uniform(5.5, 12.8)
                    await asyncio.sleep(delay)
                except Exception as e:
                    self.log_action(db, account_id, "scan", f"Error scanning group {group_name}: {str(e)}", success=False)

            self.log_action(db, account_id, "scan", f"Scan complete. Found {new_leads} new leads.")
            await self.broadcast({"type": "scan_complete", "account_id": account_id, "new_leads": new_leads})
            return {"success": True, "new_leads": new_leads}
        finally:
            db.close()

    async def send_outreach(self, account_id: int, count: int = 5, is_manual: bool = False) -> dict:
        db = SessionLocal()
        try:
            client = await self.get_client(db, account_id)
            if not client or not await client.is_user_authorized():
                return {"success": False, "error": "Not logged in"}

            paused = get_setting(db, account_id, "messaging_paused", "false") == "true"
            if paused:
                self.log_action(db, account_id, "safety", "Outreach skipped: Messaging is paused")
                return {"success": False, "error": "Messaging is paused."}

            # Humanity: Only check active hours for AUTOMATED (background) outreach
            if not is_manual and not await self.is_human_active_hour(db, account_id):
                self.log_action(db, account_id, "safety", "Auto-outreach skipped: Outside of active working hours")
                return {"success": False, "error": "Outside of active working hours."}

            trigger_type = "manual" if is_manual else "organic"
            self.log_action(db, account_id, "message", f"Started {trigger_type} outreach (Target: {count})")

            max_per_day = int(get_setting(db, account_id, "max_messages_per_day", "30"))
            today = date.today().isoformat()
            counter = db.query(DailyCounter).filter(DailyCounter.account_id == account_id, DailyCounter.date == today).first()
            today_count = counter.messages_sent if counter else 0
            
            remaining = max_per_day - today_count
            if remaining <= 0:
                return {"success": False, "error": "Daily limit reached."}

            leads = db.query(Lead).filter(Lead.account_id == account_id, Lead.status == "New").all()
            if not leads:
                self.log_action(db, account_id, "message", "Outreach skipped: No 'New' leads found. Please scan groups first.")
                return {"success": False, "error": "No new leads."}

            # Humanity: Randomize leads to break automated pattern
            random.shuffle(leads)
            leads = leads[:min(count, remaining)]

            templates = [get_setting(db, account_id, f"outreach_template_{i}") for i in range(1, 4)]
            templates = [t for t in templates if t]
            niche = get_setting(db, account_id, "target_niche", "IPTV")

            sent = 0
            for lead in leads:
                try:
                    display_name = f"{lead.first_name or ''} {lead.last_name or ''}".strip() or lead.username
                    msg_text = generate_outreach_message(display_name, templates, niche=niche)
                    target = lead.username if lead.username and not lead.username.isdigit() else int(lead.username)
                    
                    await client.send_message(target, msg_text)
                    
                    lead.status = "Contacted"
                    lead.contacted_at = datetime.utcnow()
                    
                    if not counter:
                        counter = DailyCounter(account_id=account_id, date=today, messages_sent=1)
                        db.add(counter)
                    else:
                        counter.messages_sent += 1
                        
                    db.add(Message(account_id=account_id, lead_id=lead.id, username=lead.username, content=msg_text, direction="sent"))
                    db.commit()
                    sent += 1
                    self.log_action(db, account_id, "message", f"Sent organic outreach to @{lead.username}")
                    await self.broadcast({"type": "message_sent", "account_id": account_id, "username": lead.username})
                    
                    if sent < len(leads):
                        # Organic delay with jitter
                        if is_manual:
                            # User is watching — use fast 5-10s delay for first few messages
                            delay = random.randint(5, 12) if sent < 3 else random.randint(15, 30)
                        else:
                            base_min = int(get_setting(db, account_id, "min_delay_seconds", "90"))
                            base_max = int(get_setting(db, account_id, "max_delay_seconds", "180"))
                            delay = random.randint(base_min, base_max) + random.randint(5, 30)
                        
                        logger.info(f"Outreach delay: {delay}s")
                        await asyncio.sleep(delay)
                except FloodWaitError as e:
                    set_setting(db, account_id, "messaging_paused", "true")
                    break
                except Exception as e:
                    self.log_action(db, account_id, "message", f"Failed for @{lead.username}: {str(e)}", success=False)

            return {"success": True, "sent": sent}
        finally:
            db.close()

    async def sync_dialogs(self, account_id: int) -> dict:
        db = SessionLocal()
        try:
            client = await self.get_client(db, account_id)
            if not client or not await client.is_user_authorized():
                return {"success": False, "error": "Not logged into Telegram"}

            self.log_action(db, account_id, "sync", "Started manual dialog synchronization")
            await self.broadcast({"type": "sync_started", "account_id": account_id, "message": "Analyzing Telegram chats..."})
        finally:
            db.close()

        synced_count = 0
        dialogs = await client.get_dialogs()
        
        # Filter for private users (not bots, not self)
        private_chats = [d for d in dialogs if d.is_user and not d.entity.bot and not d.entity.is_self]

        for dialog in private_chats:
            user = dialog.entity
            username = user.username or str(user.id)
            
            db = SessionLocal()
            try:
                # Check if lead already exists
                existing = db.query(Lead).filter(Lead.account_id == account_id, Lead.username == username).first()
                if existing:
                    continue

                # Create new lead from existing chat
                lead = Lead(
                    account_id=account_id,
                    username=username,
                    first_name=user.first_name or "",
                    last_name=user.last_name or "",
                    group_source="Direct/Sync",
                    score=50.0, # Existing chats are high value by default
                    status="Contacted",
                    created_at=datetime.utcnow()
                )
                db.add(lead)
                db.commit() # Commit to get lead ID for messages
                lead_id = lead.id
                synced_count += 1
            except Exception as e:
                logger.error(f"Error checking/creating lead {username}: {e}")
                continue
            finally:
                db.close()

            # Sync recent messages (last 20)
            try:
                msgs = await client.get_messages(user, limit=20)
                if msgs:
                    db = SessionLocal()
                    try:
                        for m in msgs:
                            if not m.text: continue
                            db.add(Message(
                                account_id=account_id,
                                lead_id=lead_id,
                                username=username,
                                content=m.text,
                                direction="sent" if m.out else "received",
                                sent_at=m.date
                            ))
                        db.commit()
                    except Exception as e:
                        logger.warning(f"Failed to save messages for {username} to DB: {e}")
                    finally:
                        db.close()
            except Exception as e:
                logger.warning(f"Failed to fetch messages for {username} from TG: {e}")

        db = SessionLocal()
        try:
            status_msg = f"Sync complete. Imported {synced_count} new leads." if synced_count > 0 else "Sync complete. Leads are up to date."
            self.log_action(db, account_id, "sync", status_msg)
            await self.broadcast({"type": "sync_complete", "account_id": account_id, "synced_count": synced_count, "message": status_msg})
        finally:
            db.close()
            
        return {"success": True, "synced_count": synced_count}

    async def post_to_groups(self, account_id: int, message_text: str) -> dict:
        """Post a text content to all joined groups."""
        db = SessionLocal()
        try:
            try:
                client = await self.get_client(db, account_id)
                if not client or not await client.is_user_authorized():
                    self.log_action(db, account_id, "broadcast", "Failed: Account not authorized for broadcast", success=False)
                    return {"success": False, "error": "Not logged in"}

                self.log_action(db, account_id, "broadcast", f"Started group broadcast: {message_text[:30]}...")
                
                dialogs = await client.get_dialogs()
                groups = [d for d in dialogs if d.is_group or d.is_channel]
                
                logger.info(f"Broadcast: Found {len(groups)} total groups/channels.")
                
                posted = 0
                skipped_broadcast = 0
                
                for dialog in groups:
                    try:
                        # Skip broadcast channels where we might not have permission
                        is_broadcast = getattr(dialog.entity, 'broadcast', False)
                        if is_broadcast:
                            skipped_broadcast += 1
                            continue
                            
                        await client.send_message(dialog.entity, message_text)
                        posted += 1
                        self.log_action(db, account_id, "broadcast", f"Posted to group: {dialog.name}")
                        
                        # Short jitter between group posts
                        await asyncio.sleep(random.uniform(2.0, 5.5))
                    except Exception as e:
                        self.log_action(db, account_id, "broadcast", f"Failed to post to {dialog.name}: {str(e)}", success=False)
                        logger.warning(f"Failed to post to group {dialog.name}: {e}")
                        continue
                
                summary = f"Broadcast complete. Posted to {posted} groups."
                if skipped_broadcast > 0:
                    summary += f" (Skipped {skipped_broadcast} read-only channels)"
                
                self.log_action(db, account_id, "broadcast", summary)
                return {"success": True, "posted": posted}
            except Exception as outer_e:
                self.log_action(db, account_id, "error", f"Critical failure in broadcast task: {str(outer_e)}", success=False)
                logger.error(f"Broadcast task error: {outer_e}")
                return {"success": False, "error": str(outer_e)}
        finally:
            db.close()

    async def discover_and_join_groups(
        self, 
        account_id: int, 
        limit: int = 5, 
        keyword: str = None, 
        min_members: int = 0,
        include_channels: bool = False,
        auto_scan: bool = True
    ) -> dict:
        db = SessionLocal()
        try:
            client = await self.get_client(db, account_id)
            if not client or not await client.is_user_authorized():
                return {"success": False, "error": "Not logged into Telegram"}

            niche = keyword if keyword and keyword.strip() else get_setting(db, account_id, "target_niche", "IPTV")
            self.log_action(db, account_id, "discovery", f"Starting premium search for '{niche}' (Limit: {limit}, Min Members: {min_members})")
            await self.broadcast({"type": "discovery_started", "account_id": account_id, "niche": niche})

            if not await self.is_human_active_hour(db, account_id):
                self.log_action(db, account_id, "safety", "Discovery skipped: Outside of active working hours")
                return {"success": False, "error": "Outside of active working hours."}

            # Search for public groups/channels
            # We search for more than the limit to allow for filtering
            search_limit = max(40, limit * 2)
            result = await client(SearchRequest(q=niche, limit=search_limit))
            
            joined_count = 0
            joined_list = []
            
            # Get existing dialog IDs to avoid re-joining
            dialogs = await client.get_dialogs()
            existing_ids = {d.id for d in dialogs}

            for chat in result.chats:
                if chat.id in existing_ids:
                    continue
                
                if joined_count >= limit:
                    break

                # Filtering Logic
                is_megagroup = getattr(chat, 'megagroup', False)
                is_channel = isinstance(chat, Channel) and not is_megagroup
                
                # Member Count Filter
                members = getattr(chat, 'participants_count', 0)
                if members < min_members:
                    continue

                # Channel Filter
                if is_channel and not include_channels:
                    continue

                try:
                    # Join the group
                    await client(JoinChannelRequest(chat))
                    joined_count += 1
                    
                    group_info = {
                        "id": chat.id,
                        "title": chat.title,
                        "members": members,
                        "type": "Channel" if is_channel else "Megagroup" if is_megagroup else "Chat"
                    }
                    joined_list.append(group_info)
                    
                    self.log_action(db, account_id, "discovery", f"Joined: {chat.title} ({members} members)")
                    await self.broadcast({
                        "type": "group_joined", 
                        "account_id": account_id, 
                        "title": chat.title, 
                        "members": members,
                        "group_id": chat.id
                    })
                    
                    # Auto-Scan Logic
                    if auto_scan:
                        # Schedule a scan for this specific group in a few minutes
                        # We don't do it instantly to look more "human"
                        asyncio.create_task(self.delayed_scan(account_id, chat.id))
                    
                    # Humanity: Organic pause between joins
                    if joined_count < limit:
                        wait_time = random.randint(30, 90) # Faster than before for "manual" mode but still safe
                        logger.info(f"Discovery: Joined {chat.title}. Waiting {wait_time}s...")
                        await asyncio.sleep(wait_time)
                except Exception as e:
                    logger.warning(f"Failed to join group {getattr(chat, 'title', chat.id)}: {e}")

            summary = f"Discovery complete. Joined {joined_count} new groups."
            self.log_action(db, account_id, "discovery", summary)
            await self.broadcast({"type": "discovery_complete", "account_id": account_id, "joined_count": joined_count, "groups": joined_list})
            return {"success": True, "joined_count": joined_count, "groups": joined_list}
        finally:
            db.close()

    async def delayed_scan(self, account_id: int, group_id: int):
        """Helper to scan a group after a short delay for 'humanity'."""
        delay = random.randint(60, 180) # 1-3 minutes
        await asyncio.sleep(delay)
        
        db = SessionLocal()
        try:
            logger.info(f"Auto-scanning newly joined group {group_id} for account {account_id}")
            # We use scan_groups but we need it to support single-group scan?
            # For now, we just trigger a general scan which will include the new group
            await self.scan_groups(account_id, is_manual=False)
        finally:
            db.close()

    async def start_reply_listener(self, account_id: int):
        db = SessionLocal()
        client = await self.get_client(db, account_id)
        db.close()
        if not client: return

        @client.on(events.NewMessage(incoming=True))
        async def handler(event):
            if not event.is_private: return
            db_inner = SessionLocal()
            try:
                sender = await event.get_sender()
                username = sender.username or str(sender.id) if sender else "unknown"
                lead = db_inner.query(Lead).filter(Lead.account_id == account_id, Lead.username == username).first()
                
                db_inner.add(Message(account_id=account_id, lead_id=lead.id if lead else None, username=username, content=event.text, direction="received"))
                if lead:
                    if lead.status == "Contacted": lead.status = "Replied"
                    lead.replied_at = datetime.utcnow()
                    await self.broadcast({"type": "new_reply", "account_id": account_id, "username": username, "message": event.text})
                db_inner.commit()
            finally:
                db_inner.close()

    async def get_chats(self, account_id: int):
        db = SessionLocal()
        try:
            client = await self.get_client(db, account_id)
            if not client: return {"success": False, "error": "Not logged in"}
            
            dialogs = await client.get_dialogs(limit=100)
            chats = []
            for d in dialogs:
                ctype = 'private'
                if d.is_group: ctype = 'group'
                elif d.is_channel: ctype = 'channel'
                
                chats.append({
                    "id": d.id,
                    "name": d.name,
                    "type": ctype,
                    "unread_count": d.unread_count,
                    "last_message": d.message.text if d.message else "",
                    "date": d.date.isoformat() if d.date else None,
                    "username": getattr(d.entity, 'username', None)
                })
            return {"success": True, "chats": chats}
        finally:
            db.close()

    async def get_chat_avatar(self, account_id: int, chat_id: int):
        db = SessionLocal()
        try:
            client = await self.get_client(db, account_id)
            if not client: return None
            
            # Define path
            avatar_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "cache", "avatars")
            if not os.path.exists(avatar_dir): os.makedirs(avatar_dir)
            
            file_path = os.path.join(avatar_dir, f"avatar_{chat_id}.jpg")
            # If exists and not too old (e.g., 1 day), return it
            if os.path.exists(file_path):
                return f"cache/avatars/avatar_{chat_id}.jpg"
                
            # Try to get entity and download
            entity = await client.get_input_entity(chat_id)
            path = await client.download_profile_photo(entity, file=file_path)
            if path:
                return f"cache/avatars/avatar_{chat_id}.jpg"
            return None
        except Exception as e:
            logger.warning(f"Failed to download avatar for {chat_id}: {e}")
            return None
        finally:
            db.close()

    async def get_chat_messages(self, account_id: int, chat_id: int, limit: int = 50):
        db = SessionLocal()
        try:
            client = await self.get_client(db, account_id)
            if not client: return {"success": False, "error": "Not logged in"}
            
            # Using get_messages on the chat_id
            entity = await client.get_input_entity(chat_id)
            msgs = await client.get_messages(entity, limit=limit)
            
            formatted = []
            for m in msgs:
                if not m.text: continue
                
                sender_name = "Unknown"
                if m.sender:
                    if hasattr(m.sender, 'title'):
                        sender_name = m.sender.title
                    elif hasattr(m.sender, 'first_name'):
                        sender_name = f"{m.sender.first_name or ''} {m.sender.last_name or ''}".strip()
                elif m.out:
                    sender_name = "Me"
                    
                formatted.append({
                    "id": m.id,
                    "content": m.text,
                    "direction": "sent" if m.out else "received",
                    "sent_at": m.date.isoformat() if m.date else None,
                    "sender_id": m.sender_id,
                    "sender_name": sender_name
                })
            
            return {"success": True, "messages": formatted[::-1]} # Return in chronological order
        except Exception as e:
            logger.error(f"Failed to fetch messages for {chat_id}: {e}")
            return {"success": False, "error": str(e)}
        finally:
            db.close()

    async def get_me(self, account_id: int):
        db = SessionLocal()
        try:
            client = await self.get_client(db, account_id)
            if not client: return {"success": False, "error": "Not logged in"}
            
            me = await client.get_me()
            
            # Download avatar for 'me'
            avatar_path = None
            try:
                dirname = os.path.dirname(__file__)
                parent_dir = os.path.dirname(dirname) 
                cache_dir = os.path.join(parent_dir, "frontend", "cache", "avatars")
                os.makedirs(cache_dir, exist_ok=True)
                
                file_path = os.path.join(cache_dir, f"me_{account_id}.jpg")
                await client.download_profile_photo(me, file=file_path)
                if os.path.exists(file_path):
                    avatar_path = f"cache/avatars/me_{account_id}.jpg"
            except Exception as ae:
                logger.warning(f"Failed to download own avatar: {ae}")

            return {
                "success": True,
                "me": {
                    "id": me.id,
                    "first_name": me.first_name,
                    "last_name": me.last_name,
                    "username": me.username,
                    "phone": me.phone,
                    "avatar_path": avatar_path
                }
            }
        except Exception as e:
            logger.error(f"Failed to fetch 'me' for {account_id}: {e}")
            return {"success": False, "error": str(e)}
        finally:
            db.close()

    async def get_user_profile(self, account_id: int, user_id: int):
        from telethon.tl.functions.users import GetFullUserRequest
        from telethon.tl.functions.channels import GetFullChannelRequest
        from telethon.tl.types import User, Channel, Chat
        db = SessionLocal()
        try:
            client = await self.get_client(db, account_id)
            if not client: return {"success": False, "error": "Not logged in"}
            
            # Fetch the entity first to know its type
            entity = await client.get_entity(user_id)
            
            avatar_path = None
            profile_info = {}
            
            try:
                dirname = os.path.dirname(__file__)
                parent_dir = os.path.dirname(dirname) 
                cache_dir = os.path.join(parent_dir, "frontend", "cache", "avatars")
                os.makedirs(cache_dir, exist_ok=True)
                
                file_path = os.path.join(cache_dir, f"profile_{user_id}.jpg")
                path = await client.download_profile_photo(entity, file=file_path)
                if path and os.path.exists(file_path):
                    avatar_path = f"cache/avatars/profile_{user_id}.jpg"
            except Exception as ae:
                logger.warning(f"Failed to download profile photo for {user_id}: {ae}")

            if isinstance(entity, User):
                full_user = await client(GetFullUserRequest(entity))
                profile_info = {
                    "id": str(entity.id),
                    "first_name": entity.first_name,
                    "last_name": entity.last_name,
                    "username": entity.username,
                    "phone": getattr(entity, 'phone', None),
                    "about": full_user.full_user.about if hasattr(full_user, 'full_user') else None,
                    "avatar_path": avatar_path
                }
            elif isinstance(entity, (Channel, Chat)):
                # Note: Channel senders usually don't have first/last name, just title
                about = None
                if isinstance(entity, Channel):
                    try:
                        full_channel = await client(GetFullChannelRequest(entity))
                        about = full_channel.full_chat.about
                    except: pass
                    
                profile_info = {
                    "id": str(entity.id),
                    "first_name": getattr(entity, 'title', 'Unknown Group/Channel'),
                    "last_name": "",
                    "username": getattr(entity, 'username', None),
                    "phone": None,
                    "about": about,
                    "avatar_path": avatar_path
                }
            else:
                return {"success": False, "error": "Unsupported entity type"}

            return {"success": True, "profile": profile_info}
            
        except ValueError as e:
            return {"success": False, "error": "Entity not found. Please try viewing their profile in the official Telegram app first."}
        except Exception as e:
            logger.error(f"Failed to get user profile for {user_id}: {e}")
            return {"success": False, "error": str(e)}
        finally:
            db.close()

    async def get_group_participants(self, account_id: int, chat_id: int, limit: int = 100):
        db = SessionLocal()
        try:
            client = await self.get_client(db, account_id)
            if not client: return {"success": False, "error": "Not logged in"}
            
            entity = await client.get_input_entity(chat_id)
            
            # Use get_participants for groups/channels
            participants = await client.get_participants(entity, limit=limit)
            
            formatted = []
            for p in participants:
                formatted.append({
                    "id": p.id,
                    "first_name": p.first_name,
                    "last_name": p.last_name,
                    "username": p.username,
                    "is_self": getattr(p, 'is_self', False),
                    "bot": getattr(p, 'bot', False),
                    "phone": getattr(p, 'phone', None)
                })
            
            return {"success": True, "participants": formatted}
        except Exception as e:
            logger.error(f"Failed to fetch participants for {chat_id}: {e}")
            return {"success": False, "error": str(e)}
        finally:
            db.close()

# Singleton
client_manager = TelegramClientManager()
