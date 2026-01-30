"""
Tiny Seed OS API Connector
==========================
Gives Chief of Staff FULL ACCESS to the entire Tiny Seed Operating System.

This module provides a clean Python interface to call ANY of the 230+
API endpoints in the Tiny Seed OS backend.

Usage:
    from tinyseed_api import TinySeedAPI

    api = TinySeedAPI()

    # Print a label
    api.call('printLabel', product='Tomatoes', weight='2 lbs')

    # Send SMS to employee
    api.call('sendSMS', to='+14125551234', message='Please check the greenhouse')

    # Get inventory
    inventory = api.call('getInventory')

    # Any of 230+ endpoints...

Created: 2026-01-30
Author: Chief_of_Staff_Claude
"""

import json
import urllib.request
import urllib.error
import urllib.parse
from typing import Optional, Dict, Any, List
from datetime import datetime


# =============================================================================
# API CONFIGURATION
# =============================================================================

# The ONE TRUE API URL (from CLAUDE.md)
TINYSEED_API_URL = "https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec"


# =============================================================================
# API ENDPOINT CATALOG
# =============================================================================

# Organized by category for easy reference
API_ENDPOINTS = {
    # =========================================================================
    # LABELS & PRINTING
    # =========================================================================
    'labels': [
        'printLabel',           # Print a single product label
        'printBulkLabels',      # Print multiple labels
        'getLabelTemplates',    # Get available label templates
        'generateLabelPDF',     # Generate PDF for printing
    ],

    # =========================================================================
    # SMS & COMMUNICATIONS
    # =========================================================================
    'sms': [
        'sendSMS',              # Send single SMS
        'sendBulkSMS',          # Send to multiple recipients
        'getSMSHistory',        # Get SMS history
        'getSMSTemplates',      # Get message templates
    ],

    # =========================================================================
    # EMPLOYEES & LABOR
    # =========================================================================
    'employees': [
        'getEmployees',         # List all employees
        'getEmployeeDetails',   # Single employee details
        'clockIn',              # Clock in employee
        'clockOut',             # Clock out employee
        'getTimeEntries',       # Get time records
        'assignTask',           # Assign task to employee
        'getEmployeeTasks',     # Get employee's tasks
        'updateTaskStatus',     # Update task completion
        'getLabor',             # Labor analytics
        'predictStaffing',      # AI staffing predictions
    ],

    # =========================================================================
    # INVENTORY & PRODUCTS
    # =========================================================================
    'inventory': [
        'getInventory',         # Get current inventory
        'updateInventory',      # Update quantities
        'getProducts',          # Get product catalog
        'addProduct',           # Add new product
        'updateProduct',        # Update product details
        'getSeeds',             # Seed inventory
        'updateSeedInventory',  # Update seed stock
        'getLotInfo',           # Lot/batch tracking
    ],

    # =========================================================================
    # ORDERS & SALES
    # =========================================================================
    'orders': [
        'getOrders',            # Get orders
        'createOrder',          # Create new order
        'updateOrderStatus',    # Update order status
        'getOrderDetails',      # Order details
        'getWholesaleOrders',   # Wholesale orders
        'getRetailOrders',      # Retail orders
        'getCSAOrders',         # CSA orders
    ],

    # =========================================================================
    # CUSTOMERS
    # =========================================================================
    'customers': [
        'getCustomers',         # Get customer list
        'getCustomerDetails',   # Customer details
        'addCustomer',          # Add new customer
        'updateCustomer',       # Update customer
        'getCSAMembers',        # CSA members
        'getWholesaleCustomers',# Wholesale customers
        'getCustomerOrders',    # Customer order history
    ],

    # =========================================================================
    # CALENDAR & SCHEDULING
    # =========================================================================
    'calendar': [
        'getSchedule',          # Get farm schedule
        'createEvent',          # Create calendar event
        'updateEvent',          # Update event
        'deleteEvent',          # Delete event
        'getDeliverySchedule',  # Delivery schedule
        'getHarvestSchedule',   # Harvest schedule
    ],

    # =========================================================================
    # EMAIL & COMMUNICATIONS
    # =========================================================================
    'email': [
        'triageInbox',          # AI inbox triage
        'getEmailCategories',   # Email categories
        'archiveEmail',         # Archive email
        'generateAIDraftReply', # AI draft with instructions
        'reclassifyEmail',      # Change classification
        'recallContact',        # Contact memory
    ],

    # =========================================================================
    # PLANTING & GREENHOUSE
    # =========================================================================
    'planting': [
        'addPlantingsFromAI',      # Add plantings with auto greenhouse dates
        'savePlanting',            # Save single planting
        'updatePlanting',          # Update planting
        'deletePlanting',          # Delete planting
        'getPlantings',            # Get all plantings
        'getGreenhouseSowingTasks',# Greenhouse sowing tasks
        'getTransplantTasks',      # Field transplant tasks
        'generatePlantingDates',   # Generate succession dates
        'analyzeUnassignedPlantings', # Find unassigned plantings
        'assignPlantingsToField',  # Assign to beds
    ],

    # =========================================================================
    # FARM OPERATIONS
    # =========================================================================
    'operations': [
        'getFieldPlan',         # Field planning
        'getBedAssignments',    # Bed assignments
        'getSuccessionPlan',    # Succession planting
        'saveSuccessionPlan',   # Save succession plan
        'getGreenhouseStatus',  # Greenhouse monitoring
        'logHarvest',           # Log harvest
        'getHarvestLog',        # Harvest history
        'getWeatherForecast',   # Weather data
        'canPlantInBed',        # Check bed availability
    ],

    # =========================================================================
    # FINANCIAL
    # =========================================================================
    'financial': [
        'getFinancialSummary',  # Financial overview
        'getTransactions',      # Transaction list
        'createInvoice',        # Create invoice
        'getInvoices',          # Get invoices
        'recordPayment',        # Record payment
        'getQuickBooksData',    # QuickBooks integration
    ],

    # =========================================================================
    # CHIEF OF STAFF AI
    # =========================================================================
    'chief_of_staff': [
        'chatWithChiefOfStaff', # AI chat interface
        'getMorningBrief',      # Daily briefing
        'getApprovals',         # Pending approvals
        'approveAction',        # Approve action
        'rejectAction',         # Reject action
    ],

    # =========================================================================
    # DELIVERIES & ROUTES
    # =========================================================================
    'deliveries': [
        'getDeliveryRoutes',    # Get routes
        'optimizeRoute',        # Optimize delivery route
        'updateDeliveryStatus', # Update delivery status
        'getDriverLocation',    # Driver GPS
        'confirmDelivery',      # Confirm delivery
    ],

    # =========================================================================
    # COMPLIANCE & FOOD SAFETY
    # =========================================================================
    'compliance': [
        'logTemperature',       # Temperature log
        'getComplianceLogs',    # Compliance records
        'logFoodSafetyCheck',   # Food safety check
        'getHACCPLogs',         # HACCP records
    ],
}


# =============================================================================
# TINY SEED API CLASS
# =============================================================================

class TinySeedAPI:
    """
    Universal API connector for the Tiny Seed Operating System.

    Gives Chief of Staff FULL ACCESS to all 230+ endpoints.

    Usage:
        api = TinySeedAPI()

        # Call any endpoint with named parameters
        result = api.call('sendSMS', to='+14125551234', message='Check greenhouse')

        # Or with a dictionary
        result = api.call('printLabel', **{'product': 'Tomatoes', 'weight': '2 lbs'})

        # Get help on available endpoints
        api.list_endpoints()
        api.list_endpoints('sms')  # Just SMS endpoints
    """

    def __init__(self, api_url: str = None):
        """Initialize with API URL (defaults to production)."""
        self.api_url = api_url or TINYSEED_API_URL
        self._cache = {}
        self._cache_expiry = {}

    def call(self, action: str, use_post: bool = False, **params) -> Dict[str, Any]:
        """
        Call any Tiny Seed OS API endpoint.

        Args:
            action: The API action/endpoint name (e.g., 'sendSMS', 'getInventory')
            use_post: Use POST instead of GET (for data-modifying operations)
            **params: Any parameters to pass to the endpoint

        Returns:
            API response as dictionary

        Examples:
            # Send SMS
            api.call('sendSMS', to='+14125551234', message='Hello!')

            # Get inventory
            api.call('getInventory')

            # Print label
            api.call('printLabel', product='Tomatoes', weight='2 lbs', use_post=True)
        """
        # Build request
        params['action'] = action

        try:
            if use_post:
                return self._post_request(params)
            else:
                return self._get_request(params)
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'action': action
            }

    def _get_request(self, params: Dict) -> Dict:
        """Make GET request to API."""
        query_string = urllib.parse.urlencode(params)
        url = f"{self.api_url}?{query_string}"

        req = urllib.request.Request(url)
        req.add_header('Accept', 'application/json')

        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                data = response.read().decode('utf-8')
                return json.loads(data)
        except urllib.error.HTTPError as e:
            return {'success': False, 'error': f'HTTP {e.code}: {e.reason}'}
        except json.JSONDecodeError:
            return {'success': False, 'error': 'Invalid JSON response'}

    def _post_request(self, params: Dict) -> Dict:
        """Make POST request to API."""
        data = json.dumps(params).encode('utf-8')

        req = urllib.request.Request(self.api_url, data=data, method='POST')
        req.add_header('Content-Type', 'application/json')
        req.add_header('Accept', 'application/json')

        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                data = response.read().decode('utf-8')
                return json.loads(data)
        except urllib.error.HTTPError as e:
            return {'success': False, 'error': f'HTTP {e.code}: {e.reason}'}
        except json.JSONDecodeError:
            return {'success': False, 'error': 'Invalid JSON response'}

    # =========================================================================
    # CONVENIENCE METHODS
    # =========================================================================

    def send_sms(self, to: str, message: str) -> Dict:
        """Send SMS to a phone number."""
        return self.call('sendSMS', to=to, message=message)

    def send_employee_sms(self, employee_name: str, message: str) -> Dict:
        """Send SMS to an employee by name."""
        # First get employee details
        employees = self.call('getEmployees')
        if employees.get('success') and employees.get('employees'):
            for emp in employees['employees']:
                if employee_name.lower() in emp.get('name', '').lower():
                    phone = emp.get('phone')
                    if phone:
                        return self.send_sms(phone, message)
                    return {'success': False, 'error': f'No phone for {employee_name}'}
        return {'success': False, 'error': f'Employee {employee_name} not found'}

    def print_label(self, product: str, weight: str = None,
                    price: str = None, lot: str = None) -> Dict:
        """Print a product label."""
        params = {'product': product}
        if weight:
            params['weight'] = weight
        if price:
            params['price'] = price
        if lot:
            params['lot'] = lot
        return self.call('printLabel', use_post=True, **params)

    def get_inventory(self, category: str = None) -> Dict:
        """Get current inventory, optionally filtered by category."""
        params = {}
        if category:
            params['category'] = category
        return self.call('getInventory', **params)

    def get_employees(self) -> Dict:
        """Get list of all employees."""
        return self.call('getEmployees')

    def clock_in(self, employee_id: str, pin: str = None) -> Dict:
        """Clock in an employee."""
        params = {'employeeId': employee_id}
        if pin:
            params['pin'] = pin
        return self.call('clockIn', use_post=True, **params)

    def clock_out(self, employee_id: str) -> Dict:
        """Clock out an employee."""
        return self.call('clockOut', use_post=True, employeeId=employee_id)

    def assign_task(self, employee_id: str, task: str,
                    due_date: str = None, priority: str = 'normal') -> Dict:
        """Assign a task to an employee."""
        params = {
            'employeeId': employee_id,
            'task': task,
            'priority': priority
        }
        if due_date:
            params['dueDate'] = due_date
        return self.call('assignTask', use_post=True, **params)

    def get_morning_brief(self) -> Dict:
        """Get the daily morning briefing."""
        return self.call('getMorningBrief')

    def get_orders(self, status: str = None, type: str = None) -> Dict:
        """Get orders, optionally filtered."""
        params = {}
        if status:
            params['status'] = status
        if type:
            params['type'] = type
        return self.call('getOrders', **params)

    def get_schedule(self, date: str = None) -> Dict:
        """Get farm schedule for a date."""
        params = {}
        if date:
            params['date'] = date
        return self.call('getSchedule', **params)

    def chat(self, message: str) -> Dict:
        """Chat with the Chief of Staff AI."""
        return self.call('chatWithChiefOfStaff', message=message)

    # =========================================================================
    # HELP & DISCOVERY
    # =========================================================================

    def list_endpoints(self, category: str = None) -> None:
        """List available API endpoints."""
        print("\n" + "=" * 60)
        print("TINY SEED OS API ENDPOINTS")
        print("=" * 60)

        if category:
            if category in API_ENDPOINTS:
                print(f"\n{category.upper()}:")
                for endpoint in API_ENDPOINTS[category]:
                    print(f"  - {endpoint}")
            else:
                print(f"Unknown category: {category}")
                print(f"Available: {', '.join(API_ENDPOINTS.keys())}")
        else:
            for cat, endpoints in API_ENDPOINTS.items():
                print(f"\n{cat.upper()}:")
                for endpoint in endpoints:
                    print(f"  - {endpoint}")

        print("\n" + "=" * 60)
        print("Usage: api.call('endpoint_name', param1=value1, ...)")
        print("=" * 60 + "\n")

    def list_categories(self) -> List[str]:
        """List available endpoint categories."""
        return list(API_ENDPOINTS.keys())

    def discover_endpoints(self) -> Dict:
        """
        Discover available endpoints from the API itself.

        This queries the API to get a current list of all available
        actions, ensuring Chief of Staff always has access to new
        endpoints as they're added.
        """
        result = self.call('getAvailableActions')
        if result.get('success') and result.get('actions'):
            return {
                'success': True,
                'endpoints': result['actions'],
                'count': len(result['actions'])
            }

        # Fallback: try alternative discovery endpoints
        alt_result = self.call('listEndpoints')
        if alt_result.get('success'):
            return alt_result

        # If no discovery endpoint exists, return the static list
        all_endpoints = []
        for endpoints in API_ENDPOINTS.values():
            all_endpoints.extend(endpoints)
        return {
            'success': True,
            'endpoints': all_endpoints,
            'count': len(all_endpoints),
            'source': 'static_catalog'
        }

    def search_endpoints(self, keyword: str) -> List[str]:
        """Search for endpoints containing a keyword."""
        matches = []
        keyword = keyword.lower()
        for cat, endpoints in API_ENDPOINTS.items():
            for endpoint in endpoints:
                if keyword in endpoint.lower():
                    matches.append(f"{cat}/{endpoint}")
        return matches


# =============================================================================
# GLOBAL INSTANCE
# =============================================================================

_api_instance: Optional[TinySeedAPI] = None


def get_api() -> TinySeedAPI:
    """Get or create global API instance."""
    global _api_instance
    if _api_instance is None:
        _api_instance = TinySeedAPI()
    return _api_instance


# =============================================================================
# CLI INTERFACE
# =============================================================================

if __name__ == "__main__":
    import sys

    api = get_api()

    print("=" * 60)
    print("TINY SEED OS - FULL API ACCESS")
    print("=" * 60)

    if len(sys.argv) < 2:
        print("\nUsage: python tinyseed_api.py <command> [args...]")
        print("\nCommands:")
        print("  list                  - List all API endpoints")
        print("  list <category>       - List endpoints in category")
        print("  categories            - List endpoint categories")
        print("  search <keyword>      - Search for endpoints")
        print("  call <action> [args]  - Call an API endpoint")
        print("  test                  - Test API connection")
        print("\nExamples:")
        print("  python tinyseed_api.py list sms")
        print("  python tinyseed_api.py call getEmployees")
        print("  python tinyseed_api.py call sendSMS to=+14125551234 message='Hello'")
        sys.exit(0)

    command = sys.argv[1]

    if command == "list":
        category = sys.argv[2] if len(sys.argv) > 2 else None
        api.list_endpoints(category)

    elif command == "categories":
        print("\nAvailable categories:")
        for cat in api.list_categories():
            count = len(API_ENDPOINTS[cat])
            print(f"  - {cat} ({count} endpoints)")

    elif command == "search":
        if len(sys.argv) < 3:
            print("Usage: python tinyseed_api.py search <keyword>")
            sys.exit(1)
        keyword = sys.argv[2]
        matches = api.search_endpoints(keyword)
        print(f"\nEndpoints matching '{keyword}':")
        for match in matches:
            print(f"  - {match}")
        if not matches:
            print("  (no matches)")

    elif command == "call":
        if len(sys.argv) < 3:
            print("Usage: python tinyseed_api.py call <action> [param=value ...]")
            sys.exit(1)

        action = sys.argv[2]
        params = {}

        # Parse remaining args as key=value pairs
        for arg in sys.argv[3:]:
            if '=' in arg:
                key, value = arg.split('=', 1)
                # Remove quotes if present
                value = value.strip("'\"")
                params[key] = value

        print(f"\nCalling: {action}")
        if params:
            print(f"Params: {params}")
        print("-" * 40)

        result = api.call(action, **params)
        print(json.dumps(result, indent=2, default=str))

    elif command == "test":
        print("\nTesting API connection...")
        print("-" * 40)

        # Try a simple endpoint
        result = api.call('getMorningBrief')

        if result.get('success') or 'error' not in result:
            print("API Connection: OK")
            print(f"Response keys: {list(result.keys())}")
        else:
            print(f"API Connection: FAILED")
            print(f"Error: {result.get('error')}")

    else:
        print(f"Unknown command: {command}")
        print("Run without arguments for help.")
