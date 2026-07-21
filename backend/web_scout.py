"""
Web Scout Engine — Detects buyers on public web sources (Reddit, custom URLs).
Scans for buying intent messages mentioning Telegram usernames, then imports
them as leads into the existing pipeline.
"""
import re
import json
import asyncio
import logging
import random
from datetime import datetime
from typing import Optional, List, Dict, Tuple
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

from database import SessionLocal, Lead, Account, ActionLog, get_setting
from ai_engine import score_lead, is_potential_lead

logger = logging.getLogger(__name__)

# ─── Reddit config ────────────────────────────────────────────────────────────
# Niche → suggested subreddits (pre-filled based on target niche setting)
NICHE_SUBREDDITS: Dict[str, List[str]] = {
    "IPTV":    ["IPTV", "cordcutters", "fireTV", "AndroidTV", "Addons4Kodi", "piracy"],
    "VPN":     ["VPN", "privacy", "netsec", "techsupport"],
    "Crypto":  ["CryptoCurrency", "Bitcoin", "ethereum", "defi", "altcoin"],
    "Forex":   ["Forex", "investing", "Daytrading", "algotrading"],
    "default": ["IPTV", "cordcutters", "piracy", "techsupport"],
}

DEFAULT_SUBREDDITS = ["IPTV", "cordcutters", "fireTV", "piracy"]

REDDIT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/124.0 Safari/537.36"
}

# ─── Telegram username extractor ──────────────────────────────────────────────
TG_USERNAME_RE = re.compile(
    r"(?:t\.me/|telegram\.me/|@)([a-zA-Z][a-zA-Z0-9_]{4,31})",
    re.IGNORECASE
)

def extract_telegram_usernames(text: str) -> List[str]:
    """Extract all Telegram @usernames or t.me links from text."""
    return list({m.group(1) for m in TG_USERNAME_RE.finditer(text)})


# ─── Web Scout Engine ─────────────────────────────────────────────────────────
class WebScoutEngine:

    async def _get(self, client: httpx.AsyncClient, url: str) -> Optional[dict | str]:
        """Safe GET with error handling."""
        try:
            resp = await client.get(url, headers=REDDIT_HEADERS, timeout=15.0, follow_redirects=True)
            resp.raise_for_status()
            ct = resp.headers.get("content-type", "")
            if "json" in ct:
                return resp.json()
            return resp.text
        except Exception as e:
            logger.warning(f"WebScout GET failed [{url}]: {e}")
            return None

    async def scan_reddit(
        self,
        account_id: int,
        subreddits: Optional[List[str]] = None,
        extra_keywords: Optional[List[str]] = None,
        broadcast_callback=None,
    ) -> dict:
        """
        Scan a list of subreddits for buying intent posts.
        Posts/comments that mention a Telegram username are imported as leads.
        Returns { success, new_leads, signals_found }.
        """
        db = SessionLocal()
        try:
            account = db.query(Account).filter(Account.id == account_id).first()
            if not account:
                return {"success": False, "error": "Account not found"}

            niche = get_setting(db, account_id, "target_niche", "IPTV")
            kw_setting = get_setting(db, account_id, "target_keywords", "")
            custom_kw = [k.strip() for k in kw_setting.split(",") if k.strip()] if kw_setting.strip() else None

            if not subreddits:
                subreddits = NICHE_SUBREDDITS.get(niche, DEFAULT_SUBREDDITS)

            keywords = extra_keywords or custom_kw or None

            log_detail = f"Web Scout: Scanning {len(subreddits)} subreddits for '{niche}' buyers"
            db.add(ActionLog(account_id=account_id, action_type="web_scout", detail=log_detail))
            db.commit()

            if broadcast_callback:
                await broadcast_callback({
                    "type": "web_scout_started",
                    "account_id": account_id,
                    "subreddits": subreddits
                })

            new_leads = 0
            signals = 0
            results = []

            async with httpx.AsyncClient() as client:
                for sub in subreddits:
                    sub_results = await self._scan_subreddit(
                        client, db, account_id, sub, keywords, niche
                    )
                    new_leads += sub_results["new_leads"]
                    signals += sub_results["signals"]
                    results.extend(sub_results["items"])
                    # Polite delay between subreddits
                    await asyncio.sleep(random.uniform(1.5, 3.5))

            summary = f"Web Scout complete. Scanned {len(subreddits)} subreddits. Found {signals} buyer signals, imported {new_leads} new leads."
            db.add(ActionLog(account_id=account_id, action_type="web_scout", detail=summary))
            db.commit()

            if broadcast_callback:
                await broadcast_callback({
                    "type": "web_scout_complete",
                    "account_id": account_id,
                    "new_leads": new_leads,
                    "signals": signals
                })

            return {"success": True, "new_leads": new_leads, "signals_found": signals, "results": results}
        except Exception as e:
            logger.error(f"WebScout Reddit scan error: {e}")
            return {"success": False, "error": str(e)}
        finally:
            db.close()

    async def _scan_subreddit(
        self,
        client: httpx.AsyncClient,
        db,
        account_id: int,
        subreddit: str,
        keywords: Optional[List[str]],
        niche: str,
    ) -> dict:
        """Scan a single subreddit's /new and /hot feeds."""
        new_leads = 0
        signals = 0
        items = []

        for sort in ["new", "hot"]:
            url = f"https://www.reddit.com/r/{subreddit}/{sort}.json?limit=50"
            data = await self._get(client, url)
            if not data or not isinstance(data, dict):
                continue

            posts = data.get("data", {}).get("children", [])
            for post in posts:
                pd = post.get("data", {})
                title = pd.get("title", "")
                selftext = pd.get("selftext", "")
                post_url = f"https://www.reddit.com{pd.get('permalink', '')}"
                full_text = f"{title} {selftext}"

                if not is_potential_lead(full_text, keywords):
                    continue

                signals += 1
                score, matched_kw = score_lead(
                    message_text=full_text,
                    bio="",
                    display_name="",
                    custom_keywords=keywords
                )

                # Check for Telegram usernames in post text
                usernames = extract_telegram_usernames(full_text)

                if usernames:
                    for uname in usernames:
                        lead_result = self._import_web_lead(
                            db=db,
                            account_id=account_id,
                            username=uname,
                            source=f"Reddit/r/{subreddit}",
                            source_url=post_url,
                            post_text=full_text,
                            score=score,
                            matched_kw=matched_kw,
                        )
                        if lead_result:
                            new_leads += 1
                            items.append({
                                "username": uname,
                                "source": f"r/{subreddit}",
                                "url": post_url,
                                "title": title[:100],
                                "score": score,
                                "keywords": matched_kw,
                                "has_telegram": True,
                            })
                else:
                    # Signal only (no TG username found — log but don't import as lead)
                    items.append({
                        "username": None,
                        "source": f"r/{subreddit}",
                        "url": post_url,
                        "title": title[:100],
                        "score": score,
                        "keywords": matched_kw,
                        "has_telegram": False,
                    })

            await asyncio.sleep(random.uniform(0.8, 1.8))  # Polite delay between pages

        return {"new_leads": new_leads, "signals": signals, "items": items}

    async def scan_custom_url(
        self,
        account_id: int,
        url: str,
        extra_keywords: Optional[List[str]] = None,
        broadcast_callback=None,
    ) -> dict:
        """
        Fetch a custom public URL and scan its text content for buyer signals
        and Telegram username mentions.
        """
        db = SessionLocal()
        try:
            account = db.query(Account).filter(Account.id == account_id).first()
            if not account:
                return {"success": False, "error": "Account not found"}

            kw_setting = get_setting(db, account_id, "target_keywords", "")
            custom_kw = [k.strip() for k in kw_setting.split(",") if k.strip()] if kw_setting.strip() else None
            keywords = extra_keywords or custom_kw or None

            db.add(ActionLog(account_id=account_id, action_type="web_scout", detail=f"Custom URL scan: {url}"))
            db.commit()

            async with httpx.AsyncClient() as client:
                raw = await self._get(client, url)

            if not raw:
                return {"success": False, "error": "Could not fetch the URL. Make sure it is publicly accessible."}

            # Parse HTML → plain text
            if isinstance(raw, str):
                soup = BeautifulSoup(raw, "html.parser")
                # Remove script/style tags
                for tag in soup(["script", "style", "nav", "footer", "header"]):
                    tag.decompose()
                page_text = soup.get_text(separator=" ", strip=True)
            else:
                page_text = json.dumps(raw)

            # Split into chunks (simulate "posts")
            chunks = self._chunk_text(page_text, chunk_size=500, overlap=100)

            new_leads = 0
            signals = 0
            items = []

            for chunk in chunks:
                if not is_potential_lead(chunk, keywords):
                    continue

                signals += 1
                score, matched_kw = score_lead(chunk, bio="", display_name="", custom_keywords=keywords)
                usernames = extract_telegram_usernames(chunk)

                if usernames:
                    for uname in usernames:
                        niche = get_setting(db, account_id, "target_niche", "IPTV")
                        lead_result = self._import_web_lead(
                            db=db,
                            account_id=account_id,
                            username=uname,
                            source=f"Web/{urlparse(url).netloc}",
                            source_url=url,
                            post_text=chunk,
                            score=score,
                            matched_kw=matched_kw,
                        )
                        if lead_result:
                            new_leads += 1
                            items.append({
                                "username": uname,
                                "source": urlparse(url).netloc,
                                "url": url,
                                "snippet": chunk[:150],
                                "score": score,
                                "keywords": matched_kw,
                                "has_telegram": True,
                            })
                else:
                    items.append({
                        "username": None,
                        "source": urlparse(url).netloc,
                        "url": url,
                        "snippet": chunk[:150],
                        "score": score,
                        "keywords": matched_kw,
                        "has_telegram": False,
                    })

            summary = f"Custom URL scan complete. Found {signals} signals, imported {new_leads} leads."
            db.add(ActionLog(account_id=account_id, action_type="web_scout", detail=summary))
            db.commit()

            return {"success": True, "new_leads": new_leads, "signals_found": signals, "results": items}
        except Exception as e:
            logger.error(f"WebScout custom URL scan error: {e}")
            return {"success": False, "error": str(e)}
        finally:
            db.close()

    def _import_web_lead(
        self,
        db,
        account_id: int,
        username: str,
        source: str,
        source_url: str,
        post_text: str,
        score: float,
        matched_kw: list,
    ) -> bool:
        """
        Save a web-detected lead to the database.
        Returns True if new, False if already exists.
        """
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
            logger.info(f"Web Scout: Imported lead @{username} from {source}")
            return True
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to save web lead @{username}: {e}")
            return False

    def _chunk_text(self, text: str, chunk_size: int = 500, overlap: int = 100) -> List[str]:
        """Split a long text into overlapping chunks for scanning."""
        words = text.split()
        chunks = []
        i = 0
        step = chunk_size - overlap
        while i < len(words):
            chunk = " ".join(words[i:i + chunk_size])
            if chunk.strip():
                chunks.append(chunk)
            i += step
        return chunks

    def get_suggested_subreddits(self, account_id: int) -> List[str]:
        """Return suggested subreddits based on the account's niche setting."""
        db = SessionLocal()
        try:
            niche = get_setting(db, account_id, "target_niche", "IPTV")
            return NICHE_SUBREDDITS.get(niche, DEFAULT_SUBREDDITS)
        finally:
            db.close()


# Singleton
web_scout_engine = WebScoutEngine()
