"""
Telegram Web Scout Engine — Scans public Telegram group previews (t.me/s/)
for buying intent messages. Extracts @usernames and imports them as leads.
No Reddit. No external APIs. Pure Telegram-focused buyer detection.
"""
import re
import json
import asyncio
import logging
import random
from datetime import datetime
from typing import Optional, List

import httpx
from bs4 import BeautifulSoup

from database import SessionLocal, Lead, Account, ActionLog, get_setting
from ai_engine import score_lead, is_potential_lead

logger = logging.getLogger(__name__)

# ─── Browser-like headers so t.me doesn't block us ───────────────────────────
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

# ─── Niche → suggested public Telegram group usernames ───────────────────────
NICHE_GROUPS = {
    "IPTV":    ["iptv", "iptvresellers", "iptvshop", "iptvmarket", "buyiptv"],
    "VPN":     ["vpndeals", "vpnshop", "proxysale"],
    "Crypto":  ["cryptobuyers", "p2pcrypto", "cryptomarket"],
    "Forex":   ["forexsignals", "forextraders", "fxmarket"],
    "default": ["iptv", "iptvresellers", "iptvshop"],
}

# ─── Regex: extract @username or t.me/username ───────────────────────────────
TG_USERNAME_RE = re.compile(
    r"(?:t\.me/|telegram\.me/|@)([a-zA-Z][a-zA-Z0-9_]{4,31})",
    re.IGNORECASE,
)

# Words that are NOT personal usernames (group/channel names to skip)
SKIP_USERNAMES = {
    "joinchat", "share", "addstickers", "iv", "username", "iptv",
    "telegram", "support", "help", "bot", "channel",
}


def extract_telegram_usernames(text: str) -> List[str]:
    """Pull @usernames and t.me links from text, skip obvious non-person handles."""
    found = {m.group(1).lower() for m in TG_USERNAME_RE.finditer(text)}
    return [u for u in found if u not in SKIP_USERNAMES]


def normalize_group(raw: str) -> str:
    """Turn a t.me URL or @handle into just the username."""
    raw = raw.strip().lstrip("@")
    for prefix in ["https://t.me/s/", "https://t.me/", "http://t.me/s/", "http://t.me/", "t.me/s/", "t.me/"]:
        if raw.lower().startswith(prefix):
            raw = raw[len(prefix):]
    return raw.split("/")[0].split("?")[0].strip()


# ─── Engine ───────────────────────────────────────────────────────────────────
class TelegramWebScoutEngine:

    async def _fetch_group_preview(self, client: httpx.AsyncClient, username: str) -> Optional[str]:
        """Fetch the public preview page of a Telegram group (t.me/s/username)."""
        url = f"https://t.me/s/{username}"
        try:
            resp = await client.get(url, headers=HEADERS, timeout=15.0, follow_redirects=True)
            if resp.status_code == 200:
                return resp.text
            logger.warning(f"t.me/{username} returned {resp.status_code}")
            return None
        except Exception as e:
            logger.warning(f"Failed to fetch t.me/s/{username}: {e}")
            return None

    def _parse_messages(self, html: str, group_username: str) -> List[dict]:
        """Parse a t.me/s/ page and extract individual message texts + metadata."""
        soup = BeautifulSoup(html, "html.parser")
        messages = []

        # t.me/s/ page has .tgme_widget_message_wrap divs
        for wrap in soup.select(".tgme_widget_message_wrap"):
            text_el = wrap.select_one(".tgme_widget_message_text")
            link_el = wrap.select_one("a.tgme_widget_message_date")

            text = text_el.get_text(separator=" ", strip=True) if text_el else ""
            msg_url = link_el.get("href", f"https://t.me/{group_username}") if link_el else f"https://t.me/{group_username}"

            if text:
                messages.append({"text": text, "url": msg_url, "group": group_username})

        # Fallback: grab all paragraph text if no structured messages found
        if not messages:
            for p in soup.select("p, .js-message_text, .message"):
                t = p.get_text(separator=" ", strip=True)
                if len(t) > 10:
                    messages.append({"text": t, "url": f"https://t.me/{group_username}", "group": group_username})

        return messages

    async def scan_groups(
        self,
        account_id: int,
        group_usernames: List[str],
        extra_keywords: Optional[List[str]] = None,
        broadcast_callback=None,
    ) -> dict:
        """
        Scan a list of public Telegram groups via their t.me/s/ preview pages.
        Detects buying intent and imports @username leads.
        """
        db = SessionLocal()
        try:
            account = db.query(Account).filter(Account.id == account_id).first()
            if not account:
                return {"success": False, "error": "Account not found"}

            kw_setting = get_setting(db, account_id, "target_keywords", "")
            custom_kw = [k.strip() for k in kw_setting.split(",") if k.strip()] if kw_setting.strip() else None
            keywords = extra_keywords or custom_kw or None
            niche = get_setting(db, account_id, "target_niche", "IPTV")

            db.add(ActionLog(
                account_id=account_id,
                action_type="web_scout",
                detail=f"TG Web Scout: scanning {len(group_usernames)} groups"
            ))
            db.commit()

            if broadcast_callback:
                await broadcast_callback({
                    "type": "web_scout_started",
                    "account_id": account_id,
                    "groups": group_usernames,
                })

            total_signals = 0
            total_leads = 0
            all_results = []

            async with httpx.AsyncClient() as client:
                for username in group_usernames:
                    clean = normalize_group(username)
                    if not clean:
                        continue

                    logger.info(f"Scanning t.me/s/{clean}")
                    html = await self._fetch_group_preview(client, clean)
                    if not html:
                        logger.warning(f"Could not fetch t.me/s/{clean} — group may be private or not exist")
                        continue

                    messages = self._parse_messages(html, clean)
                    logger.info(f"t.me/s/{clean}: {len(messages)} messages parsed")

                    for msg in messages:
                        text = msg["text"]
                        if not is_potential_lead(text, keywords):
                            continue

                        total_signals += 1
                        score, matched_kw = score_lead(text, bio="", display_name="", custom_keywords=keywords)
                        usernames_found = extract_telegram_usernames(text)

                        if usernames_found:
                            for uname in usernames_found:
                                imported = self._save_lead(
                                    db, account_id, uname,
                                    source=f"Telegram/t.me/{clean}",
                                    source_url=msg["url"],
                                    score=score,
                                    matched_kw=matched_kw,
                                )
                                if imported:
                                    total_leads += 1
                                    if broadcast_callback:
                                        await broadcast_callback({
                                            "type": "web_scout_lead",
                                            "account_id": account_id,
                                            "username": uname,
                                            "group": clean,
                                            "score": score,
                                        })
                                all_results.append({
                                    "username": uname,
                                    "group": clean,
                                    "url": msg["url"],
                                    "snippet": text[:120],
                                    "score": score,
                                    "keywords": matched_kw,
                                    "imported": imported,
                                })
                        else:
                            # Signal without a personal username — still log it
                            all_results.append({
                                "username": None,
                                "group": clean,
                                "url": msg["url"],
                                "snippet": text[:120],
                                "score": score,
                                "keywords": matched_kw,
                                "imported": False,
                            })

                    # Polite delay between groups
                    await asyncio.sleep(random.uniform(1.5, 3.0))

            summary = f"TG Web Scout done. Scanned {len(group_usernames)} groups, {total_signals} signals, {total_leads} buyers imported."
            db.add(ActionLog(account_id=account_id, action_type="web_scout", detail=summary))
            db.commit()

            if broadcast_callback:
                await broadcast_callback({
                    "type": "web_scout_complete",
                    "account_id": account_id,
                    "new_leads": total_leads,
                    "signals": total_signals,
                })

            return {
                "success": True,
                "new_leads": total_leads,
                "signals_found": total_signals,
                "groups_scanned": len(group_usernames),
                "results": all_results,
            }
        except Exception as e:
            logger.error(f"TG Web Scout error: {e}")
            return {"success": False, "error": str(e)}
        finally:
            db.close()

    def _save_lead(self, db, account_id, username, source, source_url, score, matched_kw) -> bool:
        """Save lead to DB. Returns True if new, False if duplicate."""
        existing = db.query(Lead).filter(
            Lead.account_id == account_id,
            Lead.username == username
        ).first()
        if existing:
            return False
        lead = Lead(
            account_id=account_id,
            username=username,
            first_name="",
            last_name="",
            group_source=source,
            score=min(score, 100.0),
            status="New",
            keywords_matched=json.dumps(matched_kw),
            source_type="web",
            source_url=source_url,
            created_at=datetime.utcnow(),
        )
        db.add(lead)
        try:
            db.commit()
            logger.info(f"Imported @{username} from {source}")
            return True
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to save lead @{username}: {e}")
            return False

    def get_suggested_groups(self, account_id: int) -> List[str]:
        """Return suggested group usernames for the account's niche."""
        db = SessionLocal()
        try:
            niche = get_setting(db, account_id, "target_niche", "IPTV")
            return NICHE_GROUPS.get(niche, NICHE_GROUPS["default"])
        finally:
            db.close()


# Singleton
web_scout_engine = TelegramWebScoutEngine()
