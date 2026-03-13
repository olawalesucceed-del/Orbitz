"""
Scheduler: Handles message queue, daily counter reset, and safety checks
"""
import asyncio
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()
message_queue = asyncio.Queue()
scheduler_running = False


async def reset_daily_counter():
    """Reset daily message counter at midnight."""
    from database import SessionLocal, DailyCounter
    from datetime import date
    db = SessionLocal()
    try:
        today = date.today().isoformat()
        # Keep counters for history, nothing to reset since we track by date
        logger.info(f"Daily counter reset check complete for {today}")
    finally:
        db.close()


async def auto_sync_all_accounts():
    """Sync dialogs for all active accounts."""
    from database import SessionLocal, Account
    from telegram_client import client_manager
    db = SessionLocal()
    try:
        accounts = db.query(Account).all()
        for acc in accounts:
            # Humanity: Don't sync during "sleeping" hours
            if not await client_manager.is_human_active_hour(db, acc.id):
                continue

            logger.info(f"Auto-syncing account {acc.session_name}...")
            await client_manager.sync_dialogs(acc.id)
            # Add small jitter between accounts
            await asyncio.sleep(60 * 2)
    except Exception as e:
        logger.error(f"Auto-sync error: {e}")
    finally:
        db.close()


async def auto_scan_all_accounts():
    """Scan groups for all active accounts."""
    from database import SessionLocal, Account
    from telegram_client import client_manager
    db = SessionLocal()
    try:
        accounts = db.query(Account).all()
        for acc in accounts:
            # Humanity: Don't scan groups during "sleeping" hours
            if not await client_manager.is_human_active_hour(db, acc.id):
                continue

            logger.info(f"Auto-scanning group leads for {acc.session_name}...")
            await client_manager.scan_groups(acc.id)
            # Add small jitter between accounts
            await asyncio.sleep(60 * 5)
    except Exception as e:
        logger.error(f"Auto-scan error: {e}")
    finally:
        db.close()


async def auto_discovery_job():
    """Discover and join new groups for all accounts."""
    from database import SessionLocal, Account
    from telegram_client import client_manager
    db = SessionLocal()
    try:
        accounts = db.query(Account).all()
        for acc in accounts:
            # Humanity: Don't join groups during "sleeping" hours
            if not await client_manager.is_human_active_hour(db, acc.id):
                continue
                
            logger.info(f"Running auto-discovery for {acc.session_name}...")
            await client_manager.discover_and_join_groups(acc.id)
    finally:
        db.close()


async def auto_outreach_all_accounts():
    """Automatically message new leads for all accounts with the feature enabled."""
    from database import SessionLocal, Account, get_setting
    from telegram_client import client_manager
    db = SessionLocal()
    try:
        accounts = db.query(Account).all()
        for acc in accounts:
            # Check if auto-outreach is enabled for this account
            is_enabled = get_setting(db, acc.id, "auto_outreach_enabled", "false") == "true"
            if not is_enabled:
                continue

            # Humanity: Never outreach during sleeping hours
            if not await client_manager.is_human_active_hour(db, acc.id):
                continue

            # Check daily limits to avoid bans
            # (send_outreach handles this, but we can do a quick check here too)
            
            logger.info(f"Running auto-outreach for {acc.session_name}...")
            # Automatically message up to 5 best new leads per run
            asyncio.create_task(client_manager.send_outreach(acc.id, count=5, is_manual=False))
            
            # Add large jitter between accounts
            await asyncio.sleep(60 * 10)
    except Exception as e:
        logger.error(f"Auto-outreach error: {e}")
    finally:
        db.close()


async def process_message_queue():
    """Process messages from the queue with delays."""
    logger.info("Message queue processor started")
    while True:
        try:
            job = await asyncio.wait_for(message_queue.get(), timeout=5.0)
            func = job.get("func")
            args = job.get("args", [])
            kwargs = job.get("kwargs", {})
            if func:
                await func(*args, **kwargs)
            message_queue.task_done()
        except asyncio.TimeoutError:
            await asyncio.sleep(1)
        except Exception as e:
            logger.error(f"Queue processor error: {e}")


def start_scheduler():
    """Initialize and start the APScheduler."""
    global scheduler_running
    if scheduler_running:
        return

    # Reset counter check at midnight
    scheduler.add_job(
        reset_daily_counter,
        CronTrigger(hour=0, minute=0),
        id="daily_reset",
        replace_existing=True
    )

    # Auto-Sync: ~Every 1 hour (+- 10m jitter)
    scheduler.add_job(
        auto_sync_all_accounts,
        "interval",
        minutes=60,
        jitter=600,
        id="auto_sync",
        replace_existing=True
    )

    # Auto-Scan: ~Every 4 hours (+- 30m jitter)
    scheduler.add_job(
        auto_scan_all_accounts,
        "interval",
        hours=4,
        jitter=1800,
        id="auto_scan",
        replace_existing=True
    )

    # Auto-Discovery: ~Every 12 hours (+- 1h jitter)
    scheduler.add_job(
        auto_discovery_job,
        "interval",
        hours=12,
        jitter=3600,
        id="auto_discovery",
        replace_existing=True
    )

    # Auto-Outreach: ~Every 6 hours (+- 1h jitter)
    scheduler.add_job(
        auto_outreach_all_accounts,
        "interval",
        hours=6,
        jitter=3600,
        id="auto_outreach",
        replace_existing=True
    )

    # Process Message Queue (if needed for staggered sending)
    asyncio.create_task(process_message_queue())

    scheduler.start()
    scheduler_running = True
    logger.info("Scheduler started with background automation")


def stop_scheduler():
    """Stop the scheduler."""
    global scheduler_running
    if scheduler.running:
        scheduler.shutdown(wait=False)
    scheduler_running = False
