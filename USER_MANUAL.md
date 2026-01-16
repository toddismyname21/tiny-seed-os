# TINY SEED OS - USER MANUAL

## A Living Document for All Users

**Version:** 1.1
**Last Updated:** 2026-01-16
**System Status:** Production (MVP)

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [User Roles & Access](#user-roles--access)
3. [Admin Guide](#admin-guide)
4. [Manager Guide](#manager-guide)
5. [Field Lead Guide](#field-lead-guide)
6. [Employee Guide](#employee-guide)
7. [Driver Guide](#driver-guide)
8. [Customer Guide](#customer-guide)
9. [Mobile App Guide](#mobile-app-guide)
10. [Troubleshooting](#troubleshooting)
11. [Feature Status](#feature-status)

---

# GETTING STARTED

## What is Tiny Seed OS?

Tiny Seed OS is a comprehensive farm management system designed for Tiny Seed Farm. It handles everything from crop planning to delivery tracking to financial management.

## System Requirements

### Desktop (Recommended for Admin/Manager)
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Screen resolution: 1280x720 minimum
- Internet connection required

### Mobile (Employee/Driver Apps)
- iPhone or Android smartphone
- Mobile data or WiFi connection
- GPS enabled for location features

## Logging In

1. Open the app in your browser
2. Go to the login page: `login.html`
3. Enter your **username** (lowercase, no spaces)
4. Enter your **4-digit PIN**
5. Tap **Sign In**

You'll be automatically redirected to your appropriate dashboard based on your role.

### Quick Access (No Login Required)
- **Customer Portal**: `web_app/customer.html`
- **Driver App**: `web_app/driver.html` (PIN required)

---

# USER ROLES & ACCESS

| Role | Access Level | Primary Apps | Description |
|------|--------------|--------------|-------------|
| **Admin** | Full | All applications | Farm owner with complete system access including financials |
| **Manager** | High | Planning, Sales, Reports | Operations management without financial access |
| **Field Lead** | Medium | Field tools, Tasks, Greenhouse | Supervises field operations, views plans |
| **Employee** | Basic | Employee App, Tasks, Harvest | Day-to-day field work and time tracking |
| **Driver** | Delivery | Driver App | Delivery routes and proof of delivery |
| **Customer** | External | Customer Portal, CSA | Order placement and account management |

---

# ADMIN GUIDE

## Your Dashboard

As Admin, you have access to everything. Your primary tools are:

### Core Management
| Tool | Location | Purpose |
|------|----------|---------|
| **Admin Panel** | `web_app/admin.html` | User management, system status, permissions |
| **Master Dashboard** | `index.html` | Overview of farm operations |
| **Financial Dashboard** | `web_app/financial-dashboard.html` | Bank accounts, investments, debt tracking |

### Planning Tools
| Tool | Location | Purpose |
|------|----------|---------|
| **Planning Grid** | `planning.html` | Full crop schedule with editing |
| **Succession Wizard** | `succession.html` | Create new planting batches |
| **Bed Assignment** | `bed_assignment_COMPLETE.html` | Allocate beds to plantings |
| **Field Planner** | `web_app/field-planner.html` | Visual field layout planning |
| **Visual Calendar** | `calendar.html` | Timeline view of all plantings |
| **Gantt - Fields** | `gantt_FINAL.html` | Project timeline by field |
| **Gantt - Crops** | `gantt_CROP_VIEW_FINAL.html` | Project timeline by crop |

### Growing
| Tool | Location | Purpose |
|------|----------|---------|
| **Greenhouse** | `greenhouse.html` | Seedling and tray management |
| **Seed Inventory** | `seed_inventory_PRODUCTION.html` | Track seed stock |
| **Flowers** | `flowers.html` | Flower-specific operations |
| **Labels** | `labels.html` | Print crop labels |
| **GH Labels** | `greenhouse_labels_PRODUCTION (1).html` | Greenhouse-specific labels |

### Operations
| Tool | Location | Purpose |
|------|----------|---------|
| **Farm Operations** | `farm-operations.html` | Daily farm tasks |
| **Tracking** | `track.html` | Progress and harvest tracking |
| **Field Kiosk** | `field_app_mobile.html` | Quick field data entry |
| **DTM Learning** | `smart_learning_DTM.html` | Days-to-maturity AI learning |
| **Soil Tests** | `soil-tests.html` | Soil analysis and amendments |
| **Sowing Sheets** | `sowing-sheets.html` | Print daily task sheets |

### Sales & Customers
| Tool | Location | Purpose |
|------|----------|---------|
| **Sales Dashboard** | `web_app/sales.html` | Revenue and order tracking |
| **Marketing** | `web_app/marketing-command-center.html` | Campaigns and analytics |

---

## Admin Panel Usage

### Accessing the Admin Panel
1. Login with Admin credentials
2. Navigate to `web_app/admin.html`
3. You'll see the dashboard overview

### Viewing Users
1. Click **All Users** in the sidebar
2. See list of all system users
3. View their role, status, and last login

### Adding a New User
**Note: Currently requires backend fix - see Feature Status**

1. Click **Add User** button
2. Fill in the form:
   - **Full Name**: User's display name
   - **Username**: Lowercase, no spaces (e.g., `jsmith`)
   - **PIN**: 4 digits (e.g., `1234`)
   - **Role**: Select from dropdown
   - **Email**: Optional
3. Click **Create User**

### System Status
1. Click **System Status** in sidebar
2. View API connectivity
3. Click **Run Check** to test all endpoints

### Roles & Permissions
1. Click **Roles & Permissions** in sidebar
2. View the permission matrix
3. See what each role can access

---

## Financial Dashboard (Admin Only)

### Overview
The Financial Dashboard provides visibility into:
- Bank account balances (via Plaid integration)
- Investment portfolio tracking
- Debt payoff progress
- Revenue and expenses

### Sections
1. **Accounts**: Connected bank accounts and balances
2. **Investments**: Portfolio value and allocation
3. **Debt Tracker**: Credit card and loan payoff progress
4. **Cash Flow**: Income vs expenses visualization

**Note:** Some features require Plaid banking connection setup.

---

## Time Tracking (Admin)

As Admin, you can track your own hours even though you're not paid hourly:

1. Open the Employee App (`employee.html`)
2. You can clock in from **any location** (geofence bypassed for Admin)
3. Your hours are logged for personal tracking

---

# MANAGER GUIDE

## Your Dashboard

As Manager, you have access to all operational tools except financials.

### Your Primary Tools
| Tool | Location | What You'll Do |
|------|----------|----------------|
| **Master Dashboard** | `index.html` | Daily overview |
| **Planning View** | `planning.html` | Create and edit crop plans |
| **Sales Dashboard** | `web_app/sales.html` | Track orders and revenue |
| **Greenhouse** | `greenhouse.html` | Monitor seedling progress |

### What You Cannot Access
- Financial Dashboard (bank accounts, investments)
- Wealth Builder
- Admin Panel (user management)

---

## Planning View

### Opening Planning View
Navigate to `planning.html`

### Understanding the Interface
- **Table View**: All plantings in spreadsheet format
- **Filters**: Filter by status, crop, field
- **Search**: Find specific batches

### Creating a New Planting
1. Click **Add Planting** or use Succession Planner
2. Fill in crop details:
   - Crop and Variety
   - Planting method (Direct Seed / Transplant)
   - Target field and bed
   - Planned dates
3. Save the planting

### Editing a Planting
1. Click on a row in the table
2. Edit fields inline OR click to open side panel
3. Changes save automatically

### Batch Operations
1. Select multiple rows using checkboxes
2. Use bulk action buttons:
   - Change status
   - Assign to field
   - Delete selected

---

## Succession Planner

### Purpose
Quickly create multiple plantings of the same crop with staggered dates.

### How to Use
1. Navigate to `succession.html`
2. Select a crop
3. Choose variety
4. Set:
   - Start date
   - Number of successions
   - Days between plantings
5. Preview the schedule
6. Click **Create All** to add to planning

---

## Sales Dashboard

### Overview
Track all orders, revenue, and customer activity.

### Key Metrics
- Today's orders
- This week's revenue
- Pending deliveries
- Customer count

### Order Management
1. View all orders in the orders tab
2. Filter by status (Pending, Confirmed, Delivered)
3. Click an order to view details
4. Update status as orders progress

---

# FIELD LEAD GUIDE

## Your Dashboard

As Field Lead, you supervise daily field operations.

### Your Primary Tools
| Tool | Location | What You'll Do |
|------|----------|----------------|
| **Planning View** | `planning.html` | View crop plans (read-only) |
| **Greenhouse** | `greenhouse.html` | Track seedlings |
| **Field App** | `field_app_mobile.html` | Manage field tasks |
| **Sowing Sheets** | `sowing-sheets.html` | Print daily task lists |
| **Bed Assignment** | `bed_assignment_COMPLETE.html` | View bed allocations |

### What You Can Do
- View all crop plans
- Mark tasks as complete
- Log harvests
- Monitor greenhouse progress
- Print task sheets for crew

### What You Cannot Do
- Create or edit crop plans
- Access sales or financial data
- Manage users

---

## Daily Workflow

### Morning
1. Check **Sowing Sheets** for today's tasks
2. Print task lists for crew
3. Review **Greenhouse** for transplant-ready seedlings

### During the Day
1. Use **Field App** to track task progress
2. Log any issues or notes
3. Record harvests as they happen

### End of Day
1. Verify all tasks marked complete
2. Log any incomplete tasks with notes
3. Check tomorrow's schedule

---

## Greenhouse Tracking

### Accessing Greenhouse View
Navigate to `greenhouse.html`

### What You'll See
- All active seedling trays
- Days since sowing
- Estimated transplant date
- Germination status

### Marking Transplant Ready
1. Find the tray in the list
2. Click to update status
3. Select "Ready for Transplant"

---

# EMPLOYEE GUIDE

## Your App

As an Employee, you use the **Employee App** for all your daily work.

### Accessing Your App
- **Mobile**: Open `employee.html` on your phone
- **Desktop**: Open `employee.html` in browser

### Logging In
1. Enter your 4-digit PIN
2. Tap **Clock In** (must be at farm location)

---

## Time Clock

### Clocking In
1. Open the Employee App
2. Make sure you're at the farm (GPS required)
3. Tap the big **Clock In** button
4. You'll see confirmation and start time

### Clocking Out
1. Open the Employee App
2. Tap **Clock Out**
3. Your hours are automatically calculated

### Viewing Your Hours
- **Today**: Shown on main screen
- **This Week**: Shown below today's hours

---

## Your Tasks

### Viewing Tasks
1. Go to the **Tasks** tab
2. See all tasks assigned to you
3. Tasks show:
   - Description
   - Location
   - Priority
   - Due time

### Completing a Task
1. Tap on a task
2. Do the work
3. Tap **Complete**
4. Add any notes if needed
5. Task moves to "Completed"

---

## Logging Harvests

### When to Log
Log harvests immediately after picking.

### How to Log
1. Go to **Harvest** tab
2. Tap **Log Harvest**
3. Select the crop
4. Enter quantity (pounds or count)
5. Add quality notes if needed
6. Submit

---

## Greenhouse Seeding

### When Assigned Seeding Tasks
1. Go to **Tasks** tab
2. Find seeding task
3. Follow the instructions:
   - Crop and variety
   - Number of trays
   - Cell count
4. Mark complete when done

---

## Field Scouting

### Reporting Issues
If you see pests, disease, or problems:
1. Go to **Scout** tab
2. Tap **Report Issue**
3. Select issue type
4. Take a photo
5. Add location and notes
6. Submit

---

# DRIVER GUIDE

## Your App

As a Driver, you use the **Driver App** for deliveries.

### Accessing Your App
Open `web_app/driver.html` on your phone

### Logging In
1. Enter your 4-digit PIN
2. You'll see today's routes

---

## Daily Workflow

### Start of Day
1. Open Driver App
2. Log in with PIN
3. View your assigned route
4. Check total stops and estimated time

### During Deliveries
1. Follow the route order
2. At each stop:
   - Confirm delivery
   - Get signature if required
   - Take photo proof
   - Mark complete
3. Report any issues immediately

### End of Day
1. Verify all stops completed
2. Check earnings summary
3. Log out

---

## Route Navigation

### Viewing Your Route
- All stops shown in order
- Each stop shows:
  - Customer name
  - Address
  - Items to deliver
  - Special instructions

### Getting Directions
1. Tap a stop
2. Tap **Navigate**
3. Opens in Google Maps/Apple Maps

---

## Proof of Delivery

### Required Documentation
At each stop, you must:
1. **Take a photo** of delivered items
2. **Get signature** (if required)
3. **Note any issues**

### Recording Proof
1. Tap the stop
2. Tap **Complete Delivery**
3. Camera opens - take photo
4. Customer signs on screen
5. Submit

### Reporting Issues
If there's a problem (not home, wrong address, etc.):
1. Tap **Report Issue**
2. Select issue type
3. Add notes
4. Take photo if relevant
5. Submit

---

## Driver Mode / Employee Mode

If you also work on the farm:
1. Your account can toggle between modes
2. In **Driver Mode**: See delivery routes
3. In **Employee Mode**: Access time clock, tasks, harvests
4. Toggle in the app settings

---

# CUSTOMER GUIDE

## Accessing Your Portal

### First Time
1. Go to `web_app/customer.html`
2. Enter your email
3. Click **Send Magic Link**
4. Check your email for login link
5. Click the link to access your account

### Returning
- Use the same magic link process
- Links expire after 24 hours

---

## Placing an Order

### Browsing Products
1. View available products on the main page
2. Products show:
   - Name and description
   - Price per unit
   - Availability

### Adding to Cart
1. Click a product
2. Select quantity
3. Click **Add to Cart**

### Checkout
1. Click **Cart** icon
2. Review your items
3. Select delivery date/pickup
4. Confirm order
5. You'll receive email confirmation

---

## Order History

### Viewing Past Orders
1. Click **My Orders** or **Account**
2. See all past orders
3. View status (Pending, Confirmed, Delivered)

### Tracking Delivery
1. Open an order
2. Click **Track Delivery**
3. See driver location in real-time
4. Estimated arrival time shown

---

## CSA Membership

### For CSA Members
If you're a CSA subscriber:
1. Access `web_app/csa.html`
2. View your weekly box contents
3. Customize swaps (if allowed)
4. Update delivery preferences

### Weekly Box
- Contents determined by farm availability
- Some items may be swappable
- Delivery schedule shown in your account

---

## Wholesale Customers

### For Wholesale Accounts
1. Access `web_app/wholesale.html`
2. Login with your account
3. Access wholesale pricing
4. Place bulk orders
5. View account terms and history

---

# MOBILE APP GUIDE

## Mobile-Optimized Apps

These apps work great on phones:

| App | Purpose | User |
|-----|---------|------|
| Employee App | Time clock, tasks, harvest | Employee |
| Driver App | Delivery routes | Driver |
| Field App | Field operations | Employee, Field Lead |
| Customer Portal | Orders | Customer |
| CSA Portal | Membership | CSA Member |
| Track Delivery | Live tracking | Customer |

## Adding to Home Screen

### iPhone
1. Open the app in Safari
2. Tap the Share button
3. Tap **Add to Home Screen**
4. Name it and tap Add

### Android
1. Open the app in Chrome
2. Tap the menu (3 dots)
3. Tap **Add to Home Screen**
4. Tap Add

Now you can open the app like a regular app!

---

## Offline Mode

Some apps work offline:
- Tasks you've loaded stay visible
- You can mark tasks complete
- Data syncs when you're back online

**Note:** You need internet to:
- Log in
- Submit harvests
- View real-time updates

---

# TROUBLESHOOTING

## Common Issues

### "Connection Error"
1. Check your internet connection
2. Try refreshing the page
3. If on mobile, try switching WiFi/data
4. Contact Admin if problem persists

### "Invalid PIN"
1. Make sure you're entering 4 digits
2. Try again carefully
3. Contact Admin to reset your PIN

### "Location Required" (Clock In)
1. Enable GPS on your device
2. Allow location access for the browser
3. Make sure you're at the farm location
4. **Admin users**: You can clock in from anywhere

### "Page Not Loading"
1. Clear your browser cache
2. Try a different browser
3. Check if other sites work
4. Contact Admin

### "Cannot Save"
1. Check your internet connection
2. Try refreshing and saving again
3. Make sure all required fields are filled
4. Contact Admin with error message

---

## Getting Help

### For Employees
- Talk to your Field Lead
- Or contact the office

### For Field Leads
- Contact the Manager
- Or use the operations phone

### For Managers
- Contact Admin (Todd)

### For Customers
- Email: [farm email]
- Phone: [farm phone]
- Hours: [business hours]

---

# FEATURE STATUS

## Legend
- **WORKING**: Fully functional
- **PARTIAL**: Some features need backend work
- **IN DEVELOPMENT**: UI complete, waiting on backend
- **DEMO**: Shows sample data only

## Current Status by App

### Core Apps
| App | Status | Notes |
|-----|--------|-------|
| Login | WORKING | |
| Master Dashboard | PARTIAL | Uses demo data when API unavailable |
| Admin Panel | PARTIAL | View users works; add user needs backend fix |
| Planning View | WORKING | |
| Employee App | WORKING | |
| Driver App | WORKING | |
| Customer Portal | WORKING | |

### Planning Tools
| App | Status | Notes |
|-----|--------|-------|
| Succession Planner | WORKING | |
| Bed Assignment | PARTIAL | Falls back to demo data |
| Visual Calendar | PARTIAL | Falls back to demo data |
| Gantt Chart | PARTIAL | Falls back to demo data |

### Operations
| App | Status | Notes |
|-----|--------|-------|
| Greenhouse | WORKING | |
| Seed Inventory | PARTIAL | Falls back to demo data |
| Soil Tests | WORKING | |
| Sowing Sheets | PARTIAL | Falls back to demo data |

### Sales & Finance
| App | Status | Notes |
|-----|--------|-------|
| Sales Dashboard | WORKING | |
| Financial Dashboard | PARTIAL | Plaid integration needs setup |
| Marketing | WORKING | |

---

## Backend APIs Needed

These features need backend team to implement:

| Feature | API Needed | Priority |
|---------|------------|----------|
| Add User | `createUser` (needs wiring) | HIGH |
| Edit User | `updateUser` | HIGH |
| Deactivate User | `deactivateUser` | MEDIUM |
| Reset PIN | `resetUserPin` | MEDIUM |
| Active Sessions | `getActiveSessions` | LOW |
| Audit Log | `getAuditLog` | LOW |

---

## Reporting Bugs

If you find something that doesn't work:
1. Note what you were trying to do
2. Note any error messages
3. Take a screenshot if possible
4. Report to Admin

---

# DOCUMENT HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.1 | 2026-01-16 | Added unified navigation structure, new tools inventory |
| 1.0 | 2026-01-15 | Initial comprehensive manual |

---

*This is a living document. It will be updated as features are added and changed.*

**Need this manual updated?** Contact the Architecture/Development team.
