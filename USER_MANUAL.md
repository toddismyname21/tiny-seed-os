# TINY SEED OS - USER MANUAL

## A Living Document for All Users

**Version:** 2.0
**Last Updated:** 2026-02-03
**System Status:** Production

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [User Roles & Access](#user-roles--access)
3. [New Task Management System](#new-task-management-system)
4. [Mobile App Usage](#mobile-app-usage)
5. [Admin Guide](#admin-guide)
6. [Manager Guide](#manager-guide)
7. [Field Lead Guide](#field-lead-guide)
8. [Employee Guide](#employee-guide)
9. [Driver Guide](#driver-guide)
10. [Customer Guide](#customer-guide)
11. [Notifications](#notifications)
12. [Troubleshooting](#troubleshooting)
13. [Feature Status](#feature-status)

---

# GETTING STARTED

## What is Tiny Seed OS?

Tiny Seed OS is a comprehensive farm management system designed for Tiny Seed Farm. It handles everything from crop planning to delivery tracking to financial management, with an intelligent AI-powered task management system that knows what you should do before you do.

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
| **Manager** | High | Planning, Sales, Reports, Manager Dashboard | Operations management without financial access |
| **Field Lead** | Medium | Field tools, Tasks, Greenhouse | Supervises field operations, views plans |
| **Employee** | Basic | Employee App, Tasks, Harvest | Day-to-day field work and time tracking |
| **Driver** | Delivery | Driver App | Delivery routes and proof of delivery |
| **Customer** | External | Customer Portal, CSA | Order placement and account management |

---

# NEW TASK MANAGEMENT SYSTEM

## Overview

The new Unified Task Management System uses AI to prioritize your work intelligently. It consolidates all farm tasks into a single, smart system that:

- **Knows what to do next** - AI calculates priority scores based on multiple factors
- **Warns you about risks** - At-risk indicators flag tasks that need immediate attention
- **Balances workloads** - Prevents team member overload
- **Handles bulk operations** - Complete or assign multiple tasks at once

## AI Priority Scoring Explained

Every task receives an **AI Priority Score** from 0-100. This score is calculated using multiple factors:

### Priority Score Factors

| Factor | Weight | What It Considers |
|--------|--------|-------------------|
| **Deadline Urgency** | 25% | How close is the due date? Overdue tasks score highest |
| **Weather Fit** | 20% | Can this task be done today given weather conditions? |
| **Dependency Chain** | 15% | How many other tasks are waiting on this one? |
| **Revenue Impact** | 15% | Financial importance (harvest value, customer orders) |
| **Manual Priority** | 15% | Your explicit priority setting (Critical/High/Medium/Low) |
| **Workload Balance** | 10% | Is the assigned person overloaded? |
| **GDD Bonus** | Variable | Growing Degree Days - crop ripeness for harvests |

### Understanding Priority Badges

Tasks display color-coded priority badges:

| Badge Color | Score Range | Meaning |
|-------------|-------------|---------|
| **Red (Critical)** | 80-100 | Do this NOW - highest urgency |
| **Orange (High)** | 50-79 | Do this today if possible |
| **Yellow (Medium)** | 30-49 | Important but can wait |
| **Green (Low)** | 0-29 | Flexible timing |

### Example Priority Calculations

**Scenario 1: Harvest Cherokee Purple Tomatoes**
- Deadline: Today (25 points)
- Weather: Perfect conditions (18 points)
- Dependencies: CSA boxes waiting (15 points)
- Revenue: High value crop (15 points)
- Manual: Set to High (11 points)
- GDD: 98% maturity (+10 bonus)
- **Total Score: 94 (CRITICAL)**

**Scenario 2: Weed Row 4**
- Deadline: This week (10 points)
- Weather: Any conditions (10 points)
- Dependencies: None (0 points)
- Revenue: Maintenance (5 points)
- Manual: Low (4 points)
- **Total Score: 29 (LOW)**

## At-Risk Indicators

The system automatically detects tasks that are in danger of not being completed properly. An at-risk task displays a warning badge with the reason.

### Types of Risk Detection

| Risk Type | Icon | What It Means |
|-----------|------|---------------|
| **TIME** | Clock | Not enough time available to complete this task |
| **WEATHER** | Cloud | Bad weather coming that will prevent completion |
| **OVERRIPE/GDD** | Leaf | Crop is at or past peak ripeness - harvest immediately |
| **OVERDUE** | Alert | Task is past its due date |
| **DEPENDENCY** | Chain | Blocked by incomplete tasks |

### Responding to At-Risk Tasks

1. **TIME Risk**: Reassign to someone with availability, or split the task
2. **WEATHER Risk**: Do it now before weather changes, or reschedule
3. **OVERRIPE Risk**: Harvest immediately to prevent quality loss
4. **OVERDUE Risk**: Complete ASAP or update the due date
5. **DEPENDENCY Risk**: Complete the blocking tasks first

## Bulk Operations

You can perform actions on multiple tasks at once:

### How to Use Bulk Operations

1. **Enter Bulk Mode**: Click the checkbox icon in the task list header
2. **Select Tasks**: Check the boxes next to tasks you want to modify
3. **Choose Action**: Use the bulk action buttons:
   - **Complete All**: Mark all selected as done
   - **Assign All**: Assign all to one person
   - **Delete All**: Remove all selected

### Best Practices for Bulk Operations

- Select tasks of the same type for cleaner operations
- Use bulk assign to quickly distribute work at shift start
- Bulk complete at end of day for tasks done together

---

# MOBILE APP USAGE

## Installing as a PWA (Progressive Web App)

The mobile apps can be installed on your phone like a regular app. This gives you:
- One-tap access from home screen
- Faster loading
- Offline capability for some features
- Push notifications

### Installing on iPhone

1. Open the app URL in **Safari** (not Chrome)
2. Tap the **Share** button (square with arrow)
3. Scroll down and tap **Add to Home Screen**
4. Give it a name (e.g., "Farm Tasks")
5. Tap **Add**
6. The app icon now appears on your home screen

### Installing on Android

1. Open the app URL in **Chrome**
2. Tap the **menu** (three dots in top right)
3. Tap **Add to Home Screen** or **Install App**
4. Tap **Add** or **Install**
5. The app icon now appears on your home screen

## Offline Mode

The mobile apps have offline support for field work:

### What Works Offline

- View tasks you've already loaded
- Mark tasks as complete (syncs when online)
- View your schedule
- Access harvest logging (syncs when online)
- View crop information

### What Needs Internet

- Logging in
- Clocking in/out (requires GPS verification)
- Submitting harvests to server
- Getting real-time updates
- Viewing new tasks

### Syncing Data

When you come back online:
1. The app automatically detects connectivity
2. Pending actions sync in the background
3. You'll see a "Synced" confirmation
4. Refresh to see latest data

## Voice Commands

Some apps support voice commands for hands-free operation:

### Enabling Voice Commands

1. Open the app
2. Go to Settings (gear icon)
3. Enable **Voice Commands**
4. Allow microphone access when prompted

### Available Voice Commands

| Command | Action |
|---------|--------|
| "Clock in" | Start your shift |
| "Clock out" | End your shift |
| "Complete task" | Mark current task done |
| "Next task" | Move to next task |
| "Log harvest [amount]" | Log a harvest quantity |
| "Report problem" | Open issue reporting |

### Voice Command Tips

- Speak clearly in a normal voice
- Wait for the listening indicator
- Keep commands simple and direct
- Works best in quiet environments

---

# ADMIN GUIDE

## Your Dashboard

As Admin, you have access to everything. Your primary tools are:

### Core Management
| Tool | Location | Purpose |
|------|----------|---------|
| **Admin Panel** | `web_app/admin.html` | User management, system status, permissions |
| **Master Dashboard** | `index.html` | Overview of farm operations |
| **Manager Dashboard** | `web_app/manager-dashboard.html` | AI task queue, team workload |
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
| **Task Assignment** | `web_app/task-assignment.html` | Create and assign tasks |
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

As Manager, you have access to all operational tools except financials. Your key tool is the **Manager Dashboard**.

### Accessing Manager Dashboard

Navigate to `web_app/manager-dashboard.html`

### Manager Dashboard Features

#### 1. Smart Priority Queue

The main panel shows all tasks sorted by AI priority score:

- **Color-coded urgency**: Red (critical), Orange (high), Yellow (medium), Green (low)
- **At-risk warnings**: Yellow warning badges indicate problems
- **Quick actions**: Complete, assign, or edit tasks inline
- **Filter by**: Status, assignee, priority level, task type

#### 2. Stats Bar

Quick overview chips at the top:
- **Today's Tasks**: Total count and progress bar
- **At Risk**: Tasks needing immediate attention
- **Team Capacity**: Overall team availability percentage
- Click any stat to filter the list

#### 3. Proactive Alerts Panel

The AI generates alerts before you ask:

| Alert Type | Example |
|------------|---------|
| **Opportunity** | "Spray window available 6-10 AM" |
| **Warning** | "Frost tonight - 32F expected" |
| **Seasonal** | "Time to order tomato seeds" |
| **Market Prep** | "Harvest for Saturday market tomorrow" |

Actions:
- Click alert to create a task
- Dismiss with "Got it"
- Snooze for later

#### 4. Team Workload Panel

Visual representation of each team member's capacity:

```
Maria  [████████████████░░░░░] 80%
Jose   [████████████████████░] 95% <- OVERLOADED
Sarah  [████████████░░░░░░░░░] 50%
Carlos [██████░░░░░░░░░░░░░░░] 30%
```

Features:
- Click a name to see their task breakdown
- Red bars indicate overloaded workers
- Use **Rebalance** to get AI suggestions for reassignment

#### 5. Field Status Panel

Overview of all field areas:
- Green = Active (work happening)
- Yellow = Partial activity
- Red = Blocked or needs attention
- Click to see field details and assigned tasks

### Your Primary Tools

| Tool | Location | What You'll Do |
|------|----------|----------------|
| **Manager Dashboard** | `web_app/manager-dashboard.html` | AI task queue, team management |
| **Master Dashboard** | `index.html` | Daily overview |
| **Task Assignment** | `web_app/task-assignment.html` | Create and assign tasks |
| **Planning View** | `planning.html` | Create and edit crop plans |
| **Sales Dashboard** | `web_app/sales.html` | Track orders and revenue |
| **Greenhouse** | `greenhouse.html` | Monitor seedling progress |

### What You Cannot Access
- Financial Dashboard (bank accounts, investments)
- Wealth Builder
- Admin Panel (user management)

---

## Team Workload Management

### Viewing Workload

1. Open Manager Dashboard
2. Look at the Team Workload panel on the right
3. Bars show current capacity usage

### Identifying Overload

- **Over 90%**: Red bar, needs immediate rebalancing
- **70-90%**: Yellow bar, monitor closely
- **Under 70%**: Green bar, has availability

### Rebalancing Work

1. Click **Rebalance** button
2. AI analyzes current assignments
3. Review suggested reassignments
4. Accept or modify suggestions
5. Apply changes

### Manual Reassignment

1. Click on an overloaded worker's name
2. See their task list
3. Select tasks to move
4. Click **Reassign**
5. Choose the new assignee

---

## Proactive Alerts

The Manager Dashboard includes proactive alerts that predict what needs attention.

### Alert Categories

| Category | Icon | Urgency | Action |
|----------|------|---------|--------|
| **OPPORTUNITY** | Star | Act now | Time-sensitive good conditions |
| **WARNING** | Triangle | High | Prevent a problem |
| **ANOMALY** | Magnifier | Medium | Investigate something unusual |
| **SEASONAL** | Calendar | Low | Regular seasonal reminder |
| **MARKET** | Cart | High | Sales/delivery deadline |

### Responding to Alerts

1. **Review** the alert message and reason
2. **Create Task** if action is needed
3. **Dismiss** if handled or not relevant
4. **Snooze** to be reminded later

### Alert Settings

Access via Settings gear icon:
- Set which alert types to show
- Configure delivery preferences
- Set quiet hours for non-urgent alerts

---

## Field Status Monitoring

### Understanding Field Status

| Status | Meaning |
|--------|---------|
| **Active** | Work currently happening |
| **Partial** | Some beds active, some idle |
| **Idle** | No current activity |
| **Blocked** | Cannot work (weather, supplies, etc.) |

### Field Details

Click any field in the status panel to see:
- Current plantings in that field
- Active tasks assigned there
- Upcoming work scheduled
- Historical yield data

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
- View AI priority scores on tasks

### What You Cannot Do
- Create or edit crop plans
- Access sales or financial data
- Manage users
- Reassign tasks between workers

---

## Daily Workflow

### Morning
1. Check **Sowing Sheets** for today's tasks
2. Print task lists for crew
3. Review **Greenhouse** for transplant-ready seedlings
4. Note any at-risk tasks for priority attention

### During the Day
1. Use **Field App** to track task progress
2. Log any issues or notes
3. Record harvests as they happen
4. Watch for at-risk warnings

### End of Day
1. Verify all tasks marked complete
2. Log any incomplete tasks with notes
3. Check tomorrow's schedule
4. Report issues to Manager

---

## Understanding Task Priority

As Field Lead, you'll see priority information on all tasks:

### Reading Priority Badges

- **Red badge (80+)**: Do first, most urgent
- **Orange badge (50-79)**: Do today
- **Yellow badge (30-49)**: Important but flexible
- **Green badge (0-29)**: When time allows

### At-Risk Tasks

Look for yellow warning triangles - these need attention:
- **TIME**: May not have enough hours
- **WEATHER**: Conditions may change
- **OVERRIPE**: Harvest before quality drops

---

## Greenhouse Tracking

### Accessing Greenhouse View
Navigate to `greenhouse.html`

### What You'll See
- All active seedling trays
- Days since sowing
- Estimated transplant date
- Germination status
- AI-calculated optimal transplant window

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

## Viewing Your Tasks

### Task List
1. Go to the **Tasks** tab
2. See all tasks assigned to you
3. Tasks are sorted by AI priority (most important first)

### Understanding Task Cards

Each task card shows:
- **Title**: What needs to be done
- **Priority Badge**: Color-coded urgency score
- **Location**: Where to do the work
- **Due Time**: When it needs to be done
- **At-Risk Warning**: Yellow badge if there's a problem

### Priority Badge Meanings

| Color | Score | What It Means |
|-------|-------|---------------|
| Red | 80+ | Do this FIRST |
| Orange | 50-79 | Do this today |
| Yellow | 30-49 | Important |
| Green | 0-29 | When you can |

---

## Completing Tasks with Time Tracking

### Starting a Task
1. Tap on the task
2. Tap **Start** to begin time tracking
3. Timer begins automatically

### Finishing a Task
1. Complete the work
2. Tap **Complete**
3. Timer stops and records your time
4. Add notes if needed (optional)
5. Actual time is compared to estimate for learning

### Time Tracking Benefits
- Accurate labor cost tracking
- Helps improve future time estimates
- Shows your productivity

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

# NOTIFICATIONS

## Overview

Tiny Seed OS sends notifications to keep you informed about important tasks, alerts, and updates.

## Priority Levels

Notifications are categorized by urgency:

| Level | Delivery | Example |
|-------|----------|---------|
| **CRITICAL** | Immediate push + SMS | Frost warning, equipment failure |
| **HIGH** | Push notification | Harvest overdue, delivery issue |
| **MEDIUM** | App badge | Task assigned, reminder |
| **LOW** | In-app only | Weekly summary, suggestions |

## Notification Types

### Task Notifications
- New task assigned to you
- Task approaching due time
- Task marked at-risk
- Bulk assignment changes

### Alert Notifications
- Weather warnings (frost, rain, heat)
- Equipment maintenance due
- Crop condition alerts
- Delivery delays

### System Notifications
- Schedule changes
- Team messages
- System updates

## Quiet Hours

You can set quiet hours to prevent non-urgent notifications during off hours.

### Setting Quiet Hours

1. Open any app
2. Go to **Settings** (gear icon)
3. Find **Notifications**
4. Toggle **Quiet Hours** on
5. Set start and end times
6. Save

### What Changes During Quiet Hours

- **CRITICAL alerts**: Still delivered immediately
- **HIGH priority**: Queued until quiet hours end
- **MEDIUM/LOW**: Delivered at quiet hours end as a digest

### Default Quiet Hours

- Most users: 8 PM - 6 AM
- Admin can override for emergencies

## SMS Alerts

For critical notifications, SMS text messages are sent to your registered phone number.

### What Triggers SMS

- Frost/freeze warnings
- Critical harvest deadlines
- Equipment emergencies
- Delivery problems
- Schedule changes (same-day)

### Managing SMS Preferences

1. Go to **Settings** > **Notifications**
2. Find **SMS Alerts**
3. Choose which types to receive via SMS
4. Verify your phone number

### SMS Tips

- Keep your phone number current
- Standard messaging rates may apply
- Reply STOP to unsubscribe (not recommended)

## Push Notifications

### Enabling Push Notifications

1. Install the app as a PWA (see Mobile App Usage)
2. When prompted, click **Allow** for notifications
3. Notifications will appear even when app is closed

### If Notifications Aren't Working

1. Check browser notification settings
2. Ensure app is installed as PWA
3. Check device Do Not Disturb settings
4. Verify internet connection

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

### "Priority Score Not Showing"
1. Tasks may be loading - wait a moment
2. Refresh the page
3. Check if you're viewing unified tasks (new system)
4. Legacy tasks may not have scores

### "At-Risk Warning Won't Clear"
1. The warning updates when conditions change
2. Complete blocking tasks first
3. Check if weather forecast has changed
4. Contact Manager if unclear

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
| Master Dashboard | WORKING | Now with AI priority scores |
| Manager Dashboard | WORKING | Full team management |
| Task Assignment | WORKING | Unified task system |
| Admin Panel | PARTIAL | View users works; add user needs backend fix |
| Planning View | WORKING | |
| Employee App | WORKING | Priority badges, time tracking |
| Driver App | WORKING | |
| Customer Portal | WORKING | |

### Task Management
| Feature | Status | Notes |
|---------|--------|-------|
| AI Priority Scoring | WORKING | 7-factor calculation |
| At-Risk Detection | WORKING | 5 risk types |
| Bulk Operations | WORKING | Complete, assign, delete |
| Proactive Alerts | WORKING | Weather, seasonal, market |
| Team Workload | WORKING | Rebalancing suggestions |

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

## API Endpoints Reference

### Task Management APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `getTaskPriorities` | GET | Get AI-sorted task list |
| `getUnifiedTasks` | GET | Get tasks with filters |
| `createUnifiedTask` | POST | Create new task |
| `updateUnifiedTask` | POST | Update task status/details |
| `bulkUpdateTasks` | POST | Batch update multiple tasks |
| `getAtRiskTasks` | GET | Get only at-risk tasks |
| `getTeamWorkloadBalance` | GET | Get team capacity data |
| `getProactiveAlerts` | GET | Get AI-generated alerts |
| `getAIPriorityDashboard` | GET | Combined dashboard data |

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
| 2.0 | 2026-02-03 | Complete overhaul: Added AI Task Management, Manager Dashboard, Mobile PWA, Notifications sections |
| 1.1 | 2026-01-16 | Added unified navigation structure, new tools inventory |
| 1.0 | 2026-01-15 | Initial comprehensive manual |

---

*This is a living document. It will be updated as features are added and changed.*

**Need this manual updated?** Contact the Architecture/Development team.
