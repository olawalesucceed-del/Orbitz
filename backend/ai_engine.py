"""
AI Engine: Lead scoring, message generation, command parsing, follow-up suggestions
"""
import re
import random
from typing import Optional, List
from database import get_setting

# Generic fallback keywords if user hasn't set any
KEYWORDS_HIGH = [
    "buy", "purchase", "looking for", "need", "recommendation", "trial", 
    "reseller", "panel", "subscription", "connect", "service", "supplier", "vendor"
]
KEYWORDS_MED = [
    "price", "cost", "how much", "m3u", "firestick", "mag", "box", "smarters", 
    "tivimate", "perfect player", "app", "setup", "install", "activate"
]
KEYWORDS_LOW = [
    "help", "question", "anyone", "know", "stream", "working", "channel", 
    "sport", "football", "soccer", "movie", "series", "premium"
]

# Command patterns to map plain language → action
COMMAND_PATTERNS = [
    (r"scan|search|find|detect.*group", "scan_groups"),
    (r"find|discover|search|join.*new.*group", "discover_groups"),
    (r"message|send|outreach|contact.*(\d+)|(\d+).*lead", "send_messages"),
    (r"broadcast|post|send.*group|announc", "broadcast_groups"),
    (r"follow.?up|followup", "follow_up"),
    (r"show.*interest|list.*interest|interested", "show_interested"),
    (r"pause|stop|halt.*message", "pause_messaging"),
    (r"resume|start|continue.*message", "resume_messaging"),
    (r"show.*lead|list.*lead|all lead", "show_leads"),
    (r"stats|statistic|dashboard|summary", "show_stats"),
    (r"scan.*reply|check.*reply|new.*reply", "check_replies"),
    (r"sync|import.*chat|import.*contact", "sync_chats"),
    (r"enable|start|turn on.*background scan", "enable_auto_scan"),
    (r"disable|stop|pause|turn off.*background scan", "disable_auto_scan"),
]


def score_lead(message_text: str, bio: str = "", display_name: str = "", custom_keywords: Optional[List[str]] = None) -> tuple[float, list]:
    """
    Score a lead 0-100 based on keyword matches in their messages/bio.
    Returns (score, matched_keywords).
    """
    combined = f"{message_text} {bio} {display_name}".lower()
    score = 0.0
    matched = []

    if custom_keywords and len(custom_keywords) > 0:
        # If user defined custom keywords, weigh them heavily
        weight_per_keyword = min(40.0, 100.0 / len(custom_keywords)) if len(custom_keywords) > 0 else 20.0
        for kw in custom_keywords:
            clean_kw = kw.strip().lower()
            if clean_kw and clean_kw in combined and clean_kw not in matched:
                score += weight_per_keyword
                matched.append(clean_kw)
    else:
        # Fallback to generic buying intent keywords
        for kw in KEYWORDS_HIGH:
            if kw in combined:
                score += 30
                matched.append(kw)

        for kw in KEYWORDS_MED:
            if kw in combined and kw not in matched:
                score += 15
                matched.append(kw)

        for kw in KEYWORDS_LOW:
            if kw in combined and kw not in matched:
                score += 5
                matched.append(kw)

    # Bonus for multiple matches
    if len(matched) >= 3:
        score += 10

    return min(score, 100.0), matched


def is_potential_lead(message_text: str, custom_keywords: Optional[List[str]] = None) -> bool:
    """Quick check if a message might contain a lead."""
    combined = message_text.lower()
    
    # Always check high-intent keywords even if user has custom ones
    intent_keywords = KEYWORDS_HIGH
    if any(kw in combined for kw in intent_keywords):
        return True
        
    if custom_keywords:
        return any(kw.strip().lower() in combined for kw in custom_keywords if kw.strip())
    else:
        all_keywords = KEYWORDS_MED + KEYWORDS_LOW
        return any(kw in combined for kw in all_keywords)


def generate_outreach_message(lead_name: str, templates: list, niche: str = "your services") -> str:
    """
    Generate a personalized outreach message for a lead.
    Uses templates rotating to avoid identical messages.
    """
    if not templates:
        templates = [
            f"Hi {{name}}! I noticed you're interested in {niche}. I offer professional solutions and custom setups. Would you like to know more? 🚀",
            f"Hey {{name}}! Are you looking for a reliable {niche} provider? I help clients grow their business. Interested? 📺",
            f"Hello {{name}}! I provide premium {niche} solutions. If you're in the market, let's connect! 🎯",
        ]

    template = random.choice(templates)
    name = lead_name.split()[0] if lead_name and lead_name.strip() else "there"
    return template.replace("{name}", name)


def suggest_followup(reply_text: str) -> str:
    """Suggest a follow-up message based on a lead's reply."""
    reply_lower = reply_text.lower()

    if any(w in reply_lower for w in ["interested", "yes", "tell me more", "how much", "price", "cost"]):
        return (
            "Great to hear! I offer flexible IPTV reseller packages starting from affordable monthly rates. "
            "I can also provide you with a custom-branded app for Firestick and Android TV with your own logo. "
            "Would you like me to send you the pricing details? 💰"
        )
    elif any(w in reply_lower for w in ["not interested", "no thanks", "stop", "busy"]):
        return (
            "No problem at all! If you ever need IPTV reseller solutions in the future, feel free to reach out. "
            "Good luck with your business! 👍"
        )
    elif any(w in reply_lower for w in ["what", "explain", "details", "info", "more"]):
        return (
            "Of course! Here's a quick overview:\n"
            "✅ IPTV Reseller Panels – sell subscriptions under your brand\n"
            "✅ Custom-branded Firestick & Android TV apps\n"
            "✅ 24/7 support and regular updates\n"
            "✅ Flexible pricing for all business sizes\n\n"
            "Want me to send you full details? 📋"
        )
    elif any(w in reply_lower for w in ["later", "maybe", "sometime", "think"]):
        return (
            "Of course, take your time! I'll check back in a few days. "
            "Feel free to message me whenever you're ready. 🙂"
        )
    else:
        return (
            "Thanks for the reply! I'd love to tell you more about our IPTV reseller services and custom apps. "
            "When would be a good time to chat? 😊"
        )


def parse_command(text: str) -> dict:
    """
    Parse a plain-language command into an action dict.
    Returns {'action': str, 'params': dict}
    """
    text_lower = text.lower().strip()

    # Extract number if present
    num_match = re.search(r'\b(\d+)\b', text_lower)
    count = int(num_match.group(1)) if num_match else 5

    for pattern, action in COMMAND_PATTERNS:
        if re.search(pattern, text_lower):
            return {
                "action": action,
                "params": {"count": count, "original": text},
                "recognized": True
            }

    return {
        "action": "unknown",
        "params": {"original": text},
        "recognized": False
    }
