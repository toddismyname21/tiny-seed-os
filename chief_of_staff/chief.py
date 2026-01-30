"""
Chief of Staff - Unified Command Center
========================================
Full access to:
- Tiny Seed OS (230+ API endpoints)
- Google Calendar (read/write)
- Gmail (read/send)
- Google Sheets (full access)
- Google Drive (full access)

Usage:
    from chief import ChiefOfStaff

    chief = ChiefOfStaff()

    # Access Tiny Seed OS
    chief.api.send_sms('+14125551234', 'Check the greenhouse')
    chief.api.print_label(product='Tomatoes', weight='2 lbs')
    chief.api.get_employees()

    # Access Calendar
    chief.calendar.get_upcoming_events()
    chief.calendar.create_event(title='Team Meeting', start=..., end=...)

    # Access Email
    chief.email.get_unread_emails()
    chief.email.send_email(to='...', subject='...', body='...')

    # Ask AI anything
    chief.ask("What's on the schedule today?")
    chief.ask("Send a text to the team about tomorrow's harvest")

Created: 2026-01-30
Author: Chief_of_Staff_Claude
"""

from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta


class ChiefOfStaff:
    """
    Unified Chief of Staff interface.

    Provides access to:
    - Tiny Seed OS API (all 230+ endpoints)
    - Google Calendar (via OAuth)
    - Gmail (via OAuth)
    - AI chat interface

    This is the ONE interface you need for full farm management.
    """

    def __init__(self):
        """Initialize all integrations."""
        self._api = None
        self._calendar = None
        self._email = None

    @property
    def api(self):
        """Access to Tiny Seed OS API."""
        if self._api is None:
            from tinyseed_api import get_api
            self._api = get_api()
        return self._api

    @property
    def calendar(self):
        """Access to Google Calendar."""
        if self._calendar is None:
            from calendar_integration import get_calendar_integration
            self._calendar = get_calendar_integration()
        return self._calendar

    @property
    def email(self):
        """Access to Gmail."""
        if self._email is None:
            from email_integration import get_email_integration
            self._email = get_email_integration()
        return self._email

    # =========================================================================
    # QUICK ACCESS METHODS
    # =========================================================================

    def ask(self, question: str) -> Dict:
        """
        Ask the Chief of Staff AI anything.

        The AI has access to all farm data and can take actions.

        Examples:
            chief.ask("What's the weather forecast?")
            chief.ask("Send Todd a text about the greenhouse")
            chief.ask("What orders are pending?")
        """
        return self.api.chat(question)

    def send_sms(self, to: str, message: str) -> Dict:
        """Send an SMS message."""
        return self.api.send_sms(to, message)

    def text_employee(self, name: str, message: str) -> Dict:
        """Send SMS to an employee by name."""
        return self.api.send_employee_sms(name, message)

    def print_label(self, product: str, **kwargs) -> Dict:
        """Print a product label."""
        return self.api.print_label(product, **kwargs)

    def get_schedule(self, date: str = None) -> Dict:
        """Get today's schedule."""
        return self.api.get_schedule(date)

    def get_orders(self, status: str = None) -> Dict:
        """Get current orders."""
        return self.api.get_orders(status=status)

    def get_inventory(self, category: str = None) -> Dict:
        """Get current inventory."""
        return self.api.get_inventory(category)

    def get_employees(self) -> Dict:
        """Get employee list."""
        return self.api.get_employees()

    # =========================================================================
    # PLANTING & SCHEDULING
    # =========================================================================

    def add_planting(self, crop: str, transplant_dates: list,
                     variety: str = None, plants_needed: int = 100,
                     auto_greenhouse: bool = True, bed_id: str = None) -> Dict:
        """
        Add plantings to the schedule with greenhouse start dates.

        This ACTUALLY creates entries in the system with:
        - Greenhouse sow date (calculated automatically from crop profile)
        - Field transplant date
        - Linked greenhouse→transplant entries

        Args:
            crop: Crop name (e.g., 'Tomatoes', 'Peppers', 'Lettuce')
            transplant_dates: List of field transplant dates ['2026-04-15', '2026-04-22']
            variety: Variety name (optional, defaults to 'Standard')
            plants_needed: Number of plants needed (default 100)
            auto_greenhouse: Auto-create greenhouse sowing entries (default True)
            bed_id: Target bed ID (optional, defaults to 'Unassigned')

        Returns:
            Result with created plantings including:
            - fieldDate: The transplant date
            - sowDate: The greenhouse start date (calculated)
            - batchId: Unique batch identifier

        Example:
            chief.add_planting(
                crop='Cherokee Purple Tomatoes',
                transplant_dates=['2026-04-15', '2026-04-22', '2026-04-29'],
                plants_needed=200,
                auto_greenhouse=True
            )
            # Creates:
            # - Greenhouse sowing on ~March 18 (28 days before April 15)
            # - Field transplant on April 15
            # - And same pattern for April 22 and 29
        """
        params = {
            'crop': crop,
            'dates': transplant_dates,
            'plantsNeeded': plants_needed,
            'autoSowing': auto_greenhouse
        }
        if variety:
            params['variety'] = variety
        if bed_id:
            params['bedId'] = bed_id

        return self.api.call('addPlantingsFromAI', **params)

    def get_greenhouse_tasks(self, date: str = None) -> Dict:
        """Get greenhouse sowing tasks for a date."""
        params = {}
        if date:
            params['date'] = date
        return self.api.call('getGreenhouseSowingTasks', **params)

    def get_transplant_tasks(self, date: str = None) -> Dict:
        """Get transplant tasks for a date."""
        params = {}
        if date:
            params['date'] = date
        return self.api.call('getTransplantTasks', **params)

    def get_plantings(self, status: str = None) -> Dict:
        """Get all plantings, optionally filtered by status."""
        params = {}
        if status:
            params['status'] = status
        return self.api.call('getPlantings', **params)

    def get_succession_plan(self, crop: str = None) -> Dict:
        """Get succession planting plan."""
        params = {}
        if crop:
            params['crop'] = crop
        return self.api.call('getSuccessionPlan', **params)

    def morning_brief(self) -> Dict:
        """Get the daily morning briefing."""
        return self.api.get_morning_brief()

    # =========================================================================
    # STATUS
    # =========================================================================

    def status(self) -> Dict:
        """Get Chief of Staff system status."""
        status = {
            'tinyseed_api': False,
            'calendar': False,
            'email': False,
            'timestamp': datetime.now().isoformat()
        }

        # Test API
        try:
            result = self.api.call('getMorningBrief')
            status['tinyseed_api'] = 'error' not in result
        except:
            pass

        # Test Calendar
        try:
            status['calendar'] = self.calendar.is_connected()
        except:
            pass

        # Test Email
        try:
            status['email'] = self.email.is_connected()
        except:
            pass

        status['all_connected'] = all([
            status['tinyseed_api'],
            status['calendar'],
            status['email']
        ])

        return status

    def help(self) -> None:
        """Show available commands and capabilities."""
        print("""
╔══════════════════════════════════════════════════════════════════╗
║                    CHIEF OF STAFF - HELP                         ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  QUICK COMMANDS:                                                  ║
║    chief.ask("your question")      - Ask AI anything              ║
║    chief.send_sms(to, message)     - Send SMS                     ║
║    chief.text_employee(name, msg)  - Text employee by name        ║
║    chief.print_label(product, ...) - Print product label          ║
║    chief.morning_brief()           - Daily briefing               ║
║    chief.get_schedule()            - Today's schedule             ║
║    chief.get_orders()              - Current orders               ║
║    chief.get_inventory()           - Current inventory            ║
║    chief.get_employees()           - Employee list                ║
║    chief.status()                  - System status                ║
║                                                                   ║
║  PLANTING & SCHEDULING:                                           ║
║    chief.add_planting(crop, dates) - Add with auto greenhouse     ║
║    chief.get_greenhouse_tasks()    - Greenhouse sowing tasks      ║
║    chief.get_transplant_tasks()    - Field transplant tasks       ║
║    chief.get_plantings()           - All plantings                ║
║    chief.get_succession_plan()     - Succession plan              ║
║                                                                   ║
║  FULL API ACCESS:                                                 ║
║    chief.api.call('anyEndpoint', param=value)                     ║
║    chief.api.list_endpoints()      - Show all 230+ endpoints      ║
║                                                                   ║
║  GOOGLE CALENDAR:                                                 ║
║    chief.calendar.get_upcoming_events()                           ║
║    chief.calendar.create_event(title, start, end)                 ║
║    chief.calendar.block_focus_time(start, end)                    ║
║                                                                   ║
║  GMAIL:                                                           ║
║    chief.email.get_unread_emails()                                ║
║    chief.email.send_email(to, subject, body)                      ║
║    chief.email.get_urgent_emails()                                ║
║                                                                   ║
╚══════════════════════════════════════════════════════════════════╝
        """)


# =============================================================================
# GLOBAL INSTANCE
# =============================================================================

_chief: Optional[ChiefOfStaff] = None


def get_chief() -> ChiefOfStaff:
    """Get or create global Chief of Staff instance."""
    global _chief
    if _chief is None:
        _chief = ChiefOfStaff()
    return _chief


# =============================================================================
# CLI INTERFACE
# =============================================================================

if __name__ == "__main__":
    import sys
    import json

    chief = get_chief()

    print("=" * 60)
    print("CHIEF OF STAFF - UNIFIED COMMAND CENTER")
    print("=" * 60)

    if len(sys.argv) < 2:
        chief.help()
        print("\nCLI Commands:")
        print("  python chief.py status          - System status")
        print("  python chief.py brief           - Morning briefing")
        print("  python chief.py ask '<question>'- Ask AI")
        print("  python chief.py sms <to> <msg>  - Send SMS")
        print("  python chief.py employees       - List employees")
        print("  python chief.py orders          - List orders")
        print("  python chief.py inventory       - Show inventory")
        print("  python chief.py emails          - Unread emails")
        print("  python chief.py calendar        - Today's events")
        sys.exit(0)

    command = sys.argv[1]

    if command == "status":
        status = chief.status()
        print("\nSystem Status:")
        print(f"  Tiny Seed API: {'✅' if status['tinyseed_api'] else '❌'}")
        print(f"  Calendar:      {'✅' if status['calendar'] else '❌'}")
        print(f"  Email:         {'✅' if status['email'] else '❌'}")
        print(f"  All Connected: {'✅' if status['all_connected'] else '❌'}")

    elif command == "brief":
        print("\nMorning Briefing:")
        print("-" * 40)
        result = chief.morning_brief()
        if result.get('success'):
            print(f"Date: {result.get('date')}")
            print(f"Weather: {result.get('weather_summary')}")
            if result.get('sections'):
                for section in result['sections']:
                    if isinstance(section, dict):
                        print(f"\n{section.get('title', 'Section')}:")
                        for item in section.get('items', []):
                            print(f"  • {item}")
                    else:
                        print(f"\n• {section}")
        else:
            print(json.dumps(result, indent=2))

    elif command == "ask":
        if len(sys.argv) < 3:
            print("Usage: python chief.py ask '<your question>'")
            sys.exit(1)
        question = ' '.join(sys.argv[2:])
        print(f"\nAsking: {question}")
        print("-" * 40)
        result = chief.ask(question)
        print(json.dumps(result, indent=2, default=str))

    elif command == "sms":
        if len(sys.argv) < 4:
            print("Usage: python chief.py sms <phone> <message>")
            sys.exit(1)
        to = sys.argv[2]
        message = ' '.join(sys.argv[3:])
        print(f"\nSending SMS to {to}: {message}")
        result = chief.send_sms(to, message)
        print(json.dumps(result, indent=2))

    elif command == "employees":
        print("\nEmployees:")
        print("-" * 40)
        result = chief.get_employees()
        if result.get('success') and result.get('employees'):
            for emp in result['employees']:
                print(f"  {emp.get('name')} - {emp.get('role')} - {emp.get('phone')}")
        else:
            print(json.dumps(result, indent=2))

    elif command == "orders":
        print("\nOrders:")
        print("-" * 40)
        result = chief.get_orders()
        print(json.dumps(result, indent=2, default=str))

    elif command == "inventory":
        print("\nInventory:")
        print("-" * 40)
        result = chief.get_inventory()
        print(json.dumps(result, indent=2, default=str))

    elif command == "emails":
        print("\nUnread Emails:")
        print("-" * 40)
        try:
            count = chief.email.get_unread_count()
            print(f"Total unread: {count}")
            emails = chief.email.get_unread_emails(5)
            for e in emails:
                print(f"  • {e.subject}")
                print(f"    From: {e.sender}")
        except Exception as e:
            print(f"Error: {e}")

    elif command == "calendar":
        print("\nUpcoming Events:")
        print("-" * 40)
        try:
            events = chief.calendar.get_upcoming_events(hours=24)
            if events:
                for e in events:
                    print(f"  • {e.title}")
                    print(f"    {e.start.strftime('%I:%M %p')}")
            else:
                print("  No events in the next 24 hours")
        except Exception as e:
            print(f"Error: {e}")

    else:
        print(f"Unknown command: {command}")
        print("Run without arguments for help.")
