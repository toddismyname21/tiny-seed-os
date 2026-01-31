#!/usr/bin/env python3
"""
TinyPM Nudge Delivery System
═══════════════════════════════════════════════════════════════════════════════

Handles the delivery of nudges through multiple channels:
- In-app notifications (writes to .notifications.json)
- Email digests (uses email_integration.py)
- Push notifications (Web Push API)

Features:
- Quiet hours enforcement
- Batching logic (max N nudges per day)
- Nudge fatigue prevention
- Channel preferences per user
- Delivery confirmation and tracking

Created: 2026-01-30
Author: Team 5 Builder (Claude)
"""

import json
import hashlib
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional
from dataclasses import dataclass
from enum import Enum

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

APP_DIR = Path(__file__).parent
NOTIFICATIONS_FILE = APP_DIR / ".notifications.json"
DELIVERY_LOG_FILE = APP_DIR / ".delivery_log.json"
USER_SETTINGS_FILE = APP_DIR / ".user_settings.json"
PUSH_SUBSCRIPTIONS_FILE = APP_DIR / ".push_subscriptions.json"

# Default settings
DEFAULT_MAX_NUDGES_PER_DAY = 5
DEFAULT_QUIET_START = 22  # 10pm
DEFAULT_QUIET_END = 7     # 7am
DEFAULT_BATCH_INTERVAL_HOURS = 4  # Min hours between batched deliveries
MIN_TIME_BETWEEN_NUDGES_MINUTES = 30  # Fatigue prevention

# ═══════════════════════════════════════════════════════════════════════════════
# DATA CLASSES
# ═══════════════════════════════════════════════════════════════════════════════

class DeliveryChannel(str, Enum):
    """Available delivery channels."""
    IN_APP = "in_app"
    EMAIL = "email"
    PUSH = "push"
    SMS = "sms"


class DeliveryStatus(str, Enum):
    """Status of a delivery attempt."""
    PENDING = "pending"
    DELIVERED = "delivered"
    FAILED = "failed"
    SKIPPED_QUIET_HOURS = "skipped_quiet_hours"
    SKIPPED_FATIGUE = "skipped_fatigue"
    SKIPPED_LIMIT = "skipped_limit"
    BATCHED = "batched"


@dataclass
class DeliveryAttempt:
    """Record of a delivery attempt."""
    nudge_id: str
    channel: DeliveryChannel
    status: DeliveryStatus
    timestamp: datetime
    error_message: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "nudge_id": self.nudge_id,
            "channel": self.channel.value,
            "status": self.status.value,
            "timestamp": self.timestamp.isoformat(),
            "error_message": self.error_message
        }


# ═══════════════════════════════════════════════════════════════════════════════
# DELIVERY LOG
# ═══════════════════════════════════════════════════════════════════════════════

def load_delivery_log() -> List[Dict[str, Any]]:
    """Load the delivery log."""
    if DELIVERY_LOG_FILE.exists():
        try:
            data = json.loads(DELIVERY_LOG_FILE.read_text())
            return data.get("attempts", [])
        except:
            pass
    return []


def save_delivery_log(attempts: List[Dict[str, Any]]) -> None:
    """Save the delivery log."""
    try:
        # Keep last 1000 attempts
        attempts = attempts[-1000:]
        data = {
            "updated_at": datetime.now().isoformat(),
            "attempts": attempts
        }
        DELIVERY_LOG_FILE.write_text(json.dumps(data, indent=2))
    except Exception as e:
        print(f"[NudgeDelivery] Error saving log: {e}")


def log_delivery(attempt: DeliveryAttempt) -> None:
    """Log a delivery attempt."""
    attempts = load_delivery_log()
    attempts.append(attempt.to_dict())
    save_delivery_log(attempts)


# ═══════════════════════════════════════════════════════════════════════════════
# USER SETTINGS
# ═══════════════════════════════════════════════════════════════════════════════

def load_user_settings() -> Dict[str, Any]:
    """Load user settings."""
    if USER_SETTINGS_FILE.exists():
        try:
            return json.loads(USER_SETTINGS_FILE.read_text())
        except:
            pass
    return {
        "nudge_channels": [DeliveryChannel.IN_APP.value],
        "max_nudges_per_day": DEFAULT_MAX_NUDGES_PER_DAY,
        "quiet_start_hour": DEFAULT_QUIET_START,
        "quiet_end_hour": DEFAULT_QUIET_END,
        "email_digest_enabled": False,
        "push_enabled": False,
        "batch_low_priority": True,
        "min_time_between_nudges_minutes": MIN_TIME_BETWEEN_NUDGES_MINUTES
    }


def save_user_settings(settings: Dict[str, Any]) -> None:
    """Save user settings."""
    try:
        USER_SETTINGS_FILE.write_text(json.dumps(settings, indent=2))
    except Exception as e:
        print(f"[NudgeDelivery] Error saving settings: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
# PUSH NOTIFICATIONS
# ═══════════════════════════════════════════════════════════════════════════════

def load_push_subscriptions() -> List[Dict[str, Any]]:
    """Load push notification subscriptions."""
    if PUSH_SUBSCRIPTIONS_FILE.exists():
        try:
            data = json.loads(PUSH_SUBSCRIPTIONS_FILE.read_text())
            return data.get("subscriptions", [])
        except:
            pass
    return []


def save_push_subscription(subscription: Dict[str, Any]) -> None:
    """Save a new push subscription."""
    subscriptions = load_push_subscriptions()

    # Check for duplicate
    endpoint = subscription.get("endpoint", "")
    existing = [s for s in subscriptions if s.get("endpoint") == endpoint]

    if not existing:
        subscriptions.append({
            **subscription,
            "created_at": datetime.now().isoformat()
        })
        data = {
            "updated_at": datetime.now().isoformat(),
            "subscriptions": subscriptions
        }
        PUSH_SUBSCRIPTIONS_FILE.write_text(json.dumps(data, indent=2))


def remove_push_subscription(endpoint: str) -> bool:
    """Remove a push subscription."""
    subscriptions = load_push_subscriptions()
    original_count = len(subscriptions)
    subscriptions = [s for s in subscriptions if s.get("endpoint") != endpoint]

    if len(subscriptions) < original_count:
        data = {
            "updated_at": datetime.now().isoformat(),
            "subscriptions": subscriptions
        }
        PUSH_SUBSCRIPTIONS_FILE.write_text(json.dumps(data, indent=2))
        return True
    return False


# ═══════════════════════════════════════════════════════════════════════════════
# NUDGE DELIVERY SYSTEM
# ═══════════════════════════════════════════════════════════════════════════════

class NudgeDeliverySystem:
    """
    Manages the delivery of nudges through multiple channels.

    Handles:
    - Quiet hours enforcement
    - Nudge batching
    - Fatigue prevention
    - Multi-channel delivery
    """

    def __init__(self, user_id: str = "default"):
        self.user_id = user_id
        self.settings = load_user_settings()
        self._delivery_callbacks: Dict[DeliveryChannel, Callable] = {}
        self._batched_nudges: List[Dict[str, Any]] = []

        # Register default delivery handlers
        self._register_default_handlers()

    def _register_default_handlers(self) -> None:
        """Register default delivery handlers."""
        self._delivery_callbacks[DeliveryChannel.IN_APP] = self._deliver_in_app
        self._delivery_callbacks[DeliveryChannel.EMAIL] = self._deliver_email
        self._delivery_callbacks[DeliveryChannel.PUSH] = self._deliver_push

    # ═══════════════════════════════════════════════════════════════════════════
    # CHECKS
    # ═══════════════════════════════════════════════════════════════════════════

    def is_quiet_hours(self) -> bool:
        """Check if we're currently in quiet hours."""
        now = datetime.now()
        quiet_start = self.settings.get("quiet_start_hour", DEFAULT_QUIET_START)
        quiet_end = self.settings.get("quiet_end_hour", DEFAULT_QUIET_END)

        current_hour = now.hour

        # Handle overnight quiet hours (e.g., 22:00 to 07:00)
        if quiet_start > quiet_end:
            return current_hour >= quiet_start or current_hour < quiet_end
        else:
            return quiet_start <= current_hour < quiet_end

    def can_deliver_nudge(self) -> Dict[str, Any]:
        """
        Check if we can deliver a nudge right now.

        Returns dict with:
        - can_deliver: bool
        - reason: str (if can't deliver)
        - should_batch: bool (if should be batched for later)
        """
        # Check quiet hours
        if self.is_quiet_hours():
            return {
                "can_deliver": False,
                "reason": "quiet_hours",
                "should_batch": True
            }

        # Check daily limit
        today = datetime.now().date()
        attempts = load_delivery_log()
        today_deliveries = [
            a for a in attempts
            if a.get("status") == DeliveryStatus.DELIVERED.value
            and datetime.fromisoformat(a["timestamp"]).date() == today
        ]

        max_per_day = self.settings.get("max_nudges_per_day", DEFAULT_MAX_NUDGES_PER_DAY)
        if len(today_deliveries) >= max_per_day:
            return {
                "can_deliver": False,
                "reason": "daily_limit",
                "should_batch": False
            }

        # Check fatigue (time since last nudge)
        if today_deliveries:
            last_delivery = datetime.fromisoformat(today_deliveries[-1]["timestamp"])
            min_gap = self.settings.get("min_time_between_nudges_minutes", MIN_TIME_BETWEEN_NUDGES_MINUTES)
            if (datetime.now() - last_delivery).total_seconds() < min_gap * 60:
                return {
                    "can_deliver": False,
                    "reason": "fatigue",
                    "should_batch": True
                }

        return {"can_deliver": True, "reason": None, "should_batch": False}

    # ═══════════════════════════════════════════════════════════════════════════
    # DELIVERY
    # ═══════════════════════════════════════════════════════════════════════════

    def deliver(self, nudge: Dict[str, Any], force: bool = False) -> Dict[str, Any]:
        """
        Deliver a nudge through configured channels.

        Args:
            nudge: The nudge data to deliver
            force: If True, ignore quiet hours and fatigue checks

        Returns:
            Dict with delivery results per channel
        """
        results = {}
        nudge_id = nudge.get("id", "unknown")
        priority = nudge.get("priority", "medium")

        # Check if we can deliver
        if not force:
            check = self.can_deliver_nudge()
            if not check["can_deliver"]:
                if check["should_batch"]:
                    self._add_to_batch(nudge)
                    return {
                        "status": "batched",
                        "reason": check["reason"]
                    }
                else:
                    return {
                        "status": "skipped",
                        "reason": check["reason"]
                    }

        # Get enabled channels
        channels = [
            DeliveryChannel(c)
            for c in self.settings.get("nudge_channels", [DeliveryChannel.IN_APP.value])
        ]

        # Deliver to each channel
        for channel in channels:
            try:
                if channel in self._delivery_callbacks:
                    success = self._delivery_callbacks[channel](nudge)
                    status = DeliveryStatus.DELIVERED if success else DeliveryStatus.FAILED
                else:
                    status = DeliveryStatus.FAILED

                results[channel.value] = status.value

                # Log the attempt
                log_delivery(DeliveryAttempt(
                    nudge_id=nudge_id,
                    channel=channel,
                    status=status,
                    timestamp=datetime.now()
                ))

            except Exception as e:
                results[channel.value] = "error"
                log_delivery(DeliveryAttempt(
                    nudge_id=nudge_id,
                    channel=channel,
                    status=DeliveryStatus.FAILED,
                    timestamp=datetime.now(),
                    error_message=str(e)
                ))

        return {"status": "delivered", "channels": results}

    def deliver_batch(self) -> Dict[str, Any]:
        """
        Deliver all batched nudges.

        Called when:
        - Quiet hours end
        - User opens the app
        - Manually triggered
        """
        if not self._batched_nudges:
            return {"delivered": 0, "skipped": 0}

        delivered = 0
        skipped = 0

        # Sort by priority
        priority_order = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
        self._batched_nudges.sort(
            key=lambda n: priority_order.get(n.get("priority", "medium"), 2)
        )

        for nudge in self._batched_nudges[:]:
            result = self.deliver(nudge, force=True)
            if result.get("status") == "delivered":
                delivered += 1
                self._batched_nudges.remove(nudge)
            else:
                skipped += 1

        return {"delivered": delivered, "skipped": skipped}

    def _add_to_batch(self, nudge: Dict[str, Any]) -> None:
        """Add a nudge to the batch queue."""
        # Avoid duplicates
        existing = [n for n in self._batched_nudges if n.get("id") == nudge.get("id")]
        if not existing:
            self._batched_nudges.append(nudge)

    # ═══════════════════════════════════════════════════════════════════════════
    # CHANNEL HANDLERS
    # ═══════════════════════════════════════════════════════════════════════════

    def _deliver_in_app(self, nudge: Dict[str, Any]) -> bool:
        """
        Deliver a nudge as an in-app notification.

        This writes to .notifications.json which is read by the web dashboard.
        """
        try:
            # Load existing notifications
            notifications = []
            if NOTIFICATIONS_FILE.exists():
                try:
                    data = json.loads(NOTIFICATIONS_FILE.read_text())
                    notifications = data.get("nudges", [])
                except:
                    pass

            # Check if nudge already exists
            existing = [n for n in notifications if n.get("id") == nudge.get("id")]
            if existing:
                return True  # Already delivered

            # Add the nudge
            notifications.append({
                **nudge,
                "delivered_at": datetime.now().isoformat(),
                "channel": "in_app"
            })

            # Save
            data = {
                "updated_at": datetime.now().isoformat(),
                "nudges": notifications
            }
            NOTIFICATIONS_FILE.write_text(json.dumps(data, indent=2))

            print(f"[NudgeDelivery] In-app: {nudge.get('title', 'Nudge')}")
            return True

        except Exception as e:
            print(f"[NudgeDelivery] In-app delivery failed: {e}")
            return False

    def _deliver_email(self, nudge: Dict[str, Any]) -> bool:
        """
        Deliver a nudge via email.

        Uses email_integration.py to send.
        """
        try:
            # Only send email for high/urgent priority
            priority = nudge.get("priority", "medium")
            if priority not in ["urgent", "high"]:
                print(f"[NudgeDelivery] Email: Skipping low priority nudge")
                return True  # Not a failure, just skipped

            # Try to use email integration
            try:
                from email_integration import get_email_integration
                email = get_email_integration(self.user_id)

                if not email.is_connected():
                    print(f"[NudgeDelivery] Email not connected")
                    return False

                # For now, email delivery is a placeholder
                # In production, this would create a draft or send directly
                print(f"[NudgeDelivery] Email: Would send '{nudge.get('title')}'")
                return True

            except ImportError:
                print(f"[NudgeDelivery] Email integration not available")
                return False

        except Exception as e:
            print(f"[NudgeDelivery] Email delivery failed: {e}")
            return False

    def _deliver_push(self, nudge: Dict[str, Any]) -> bool:
        """
        Deliver a nudge via push notification.

        Uses Web Push API.
        """
        try:
            subscriptions = load_push_subscriptions()

            if not subscriptions:
                print(f"[NudgeDelivery] No push subscriptions")
                return False

            # Try to send to all subscriptions
            # This requires pywebpush library
            try:
                from pywebpush import webpush, WebPushException
            except ImportError:
                print(f"[NudgeDelivery] pywebpush not installed")
                return False

            # Load VAPID keys (would need to be configured)
            vapid_file = APP_DIR / ".vapid_keys.json"
            if not vapid_file.exists():
                print(f"[NudgeDelivery] VAPID keys not configured")
                return False

            vapid = json.loads(vapid_file.read_text())
            private_key = vapid.get("private_key")
            vapid_claims = vapid.get("claims", {})

            if not private_key:
                print(f"[NudgeDelivery] VAPID private key missing")
                return False

            # Build notification payload
            payload = json.dumps({
                "title": nudge.get("title", "TinyPM"),
                "body": nudge.get("message", ""),
                "icon": "/icon-192.png",
                "badge": "/badge-72.png",
                "data": {
                    "nudge_id": nudge.get("id"),
                    "action_url": nudge.get("action_url")
                }
            })

            # Send to all subscriptions
            success_count = 0
            for sub in subscriptions:
                try:
                    webpush(
                        subscription_info=sub,
                        data=payload,
                        vapid_private_key=private_key,
                        vapid_claims=vapid_claims
                    )
                    success_count += 1
                except WebPushException as e:
                    if e.response and e.response.status_code == 410:
                        # Subscription expired, remove it
                        remove_push_subscription(sub.get("endpoint", ""))
                    print(f"[NudgeDelivery] Push failed for subscription: {e}")

            print(f"[NudgeDelivery] Push: Sent to {success_count}/{len(subscriptions)} devices")
            return success_count > 0

        except Exception as e:
            print(f"[NudgeDelivery] Push delivery failed: {e}")
            return False

    # ═══════════════════════════════════════════════════════════════════════════
    # EMAIL DIGEST
    # ═══════════════════════════════════════════════════════════════════════════

    def send_daily_digest(self) -> bool:
        """
        Send a daily digest email with all pending nudges.

        Called once per day, typically in the morning.
        """
        if not self.settings.get("email_digest_enabled", False):
            return False

        try:
            # Load all pending nudges
            from nudge_engine import get_nudge_engine
            engine = get_nudge_engine(self.user_id)
            pending = engine.get_pending_nudges()

            if not pending:
                return True  # Nothing to send

            # Group by type
            by_type = {}
            for nudge in pending:
                nudge_type = nudge.type.value if hasattr(nudge.type, 'value') else nudge.type
                if nudge_type not in by_type:
                    by_type[nudge_type] = []
                by_type[nudge_type].append(nudge)

            # Build digest content
            digest_parts = [
                f"# Your Daily TinyPM Digest",
                f"Generated: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}",
                f"",
                f"You have {len(pending)} items needing attention:",
                ""
            ]

            for nudge_type, nudges in by_type.items():
                digest_parts.append(f"## {nudge_type.replace('_', ' ').title()} ({len(nudges)})")
                for nudge in nudges[:5]:  # Max 5 per category
                    title = nudge.title if hasattr(nudge, 'title') else nudge.get('title', '')
                    message = nudge.message if hasattr(nudge, 'message') else nudge.get('message', '')
                    digest_parts.append(f"- **{title}**: {message}")
                digest_parts.append("")

            digest_content = "\n".join(digest_parts)

            # Send via email
            # (Implementation would use email_integration to draft/send)
            print(f"[NudgeDelivery] Would send digest with {len(pending)} items")
            print(f"[NudgeDelivery] Digest preview:\n{digest_content[:500]}...")

            return True

        except Exception as e:
            print(f"[NudgeDelivery] Digest failed: {e}")
            return False

    # ═══════════════════════════════════════════════════════════════════════════
    # SETTINGS
    # ═══════════════════════════════════════════════════════════════════════════

    def update_settings(self, new_settings: Dict[str, Any]) -> None:
        """Update delivery settings."""
        self.settings.update(new_settings)
        save_user_settings(self.settings)

    def enable_channel(self, channel: DeliveryChannel) -> None:
        """Enable a delivery channel."""
        channels = self.settings.get("nudge_channels", [])
        if channel.value not in channels:
            channels.append(channel.value)
            self.settings["nudge_channels"] = channels
            save_user_settings(self.settings)

    def disable_channel(self, channel: DeliveryChannel) -> None:
        """Disable a delivery channel."""
        channels = self.settings.get("nudge_channels", [])
        if channel.value in channels:
            channels.remove(channel.value)
            self.settings["nudge_channels"] = channels
            save_user_settings(self.settings)

    def get_status(self) -> Dict[str, Any]:
        """Get delivery system status."""
        return {
            "quiet_hours": self.is_quiet_hours(),
            "can_deliver": self.can_deliver_nudge(),
            "batched_count": len(self._batched_nudges),
            "enabled_channels": self.settings.get("nudge_channels", []),
            "settings": self.settings
        }


# ═══════════════════════════════════════════════════════════════════════════════
# GLOBAL INSTANCE
# ═══════════════════════════════════════════════════════════════════════════════

_delivery_system: Optional[NudgeDeliverySystem] = None


def get_delivery_system(user_id: str = "default") -> NudgeDeliverySystem:
    """Get or create the delivery system instance."""
    global _delivery_system
    if _delivery_system is None or _delivery_system.user_id != user_id:
        _delivery_system = NudgeDeliverySystem(user_id)
    return _delivery_system


# ═══════════════════════════════════════════════════════════════════════════════
# CLI INTERFACE
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    """CLI interface for Nudge Delivery."""
    import argparse

    parser = argparse.ArgumentParser(description="TinyPM Nudge Delivery")
    parser.add_argument("command", nargs="?", default="status",
                       choices=["status", "test", "batch", "digest"],
                       help="Command to run")
    parser.add_argument("--channel", type=str, help="Channel for test")

    args = parser.parse_args()

    system = get_delivery_system()

    if args.command == "status":
        print("\n" + "=" * 40)
        print("Nudge Delivery Status")
        print("=" * 40)
        status = system.get_status()
        print(f"Quiet hours: {status['quiet_hours']}")
        print(f"Can deliver: {status['can_deliver']}")
        print(f"Batched nudges: {status['batched_count']}")
        print(f"Enabled channels: {', '.join(status['enabled_channels'])}")

    elif args.command == "test":
        print("\n" + "=" * 40)
        print("Testing Nudge Delivery")
        print("=" * 40)

        test_nudge = {
            "id": "test-001",
            "type": "custom",
            "title": "Test Nudge",
            "message": "This is a test notification from TinyPM",
            "priority": "medium"
        }

        result = system.deliver(test_nudge, force=True)
        print(f"Result: {json.dumps(result, indent=2)}")

    elif args.command == "batch":
        print("\n" + "=" * 40)
        print("Delivering Batched Nudges")
        print("=" * 40)
        result = system.deliver_batch()
        print(f"Delivered: {result['delivered']}")
        print(f"Skipped: {result['skipped']}")

    elif args.command == "digest":
        print("\n" + "=" * 40)
        print("Sending Daily Digest")
        print("=" * 40)
        success = system.send_daily_digest()
        print(f"Success: {success}")


if __name__ == "__main__":
    main()
