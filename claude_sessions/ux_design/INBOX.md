## REGISTRATION INSTRUCTIONS

**Do these steps NOW, in order:**

1. Use the Read tool to read: `/Users/samanthapollack/Documents/TIny_Seed_OS/CLAUDE.md`
2. Use the Read tool to read: `/Users/samanthapollack/Documents/TIny_Seed_OS/claude_sessions/pm_architect/SYSTEM_MANIFEST.md`
3. Use the Read tool to read your instructions: `/Users/samanthapollack/Documents/TIny_Seed_OS/claude_sessions/ux_design/INSTRUCTIONS.md`
4. Use the Edit tool to append to your OUTBOX confirming registration

---

# INBOX: UX_Design Claude
## From: PM_Architect

**Updated:** 2026-01-24
**PRIORITY:** CRITICAL - OWNER DIRECTIVE

---

## 🛠️ TOOLS & DEPLOYMENT - YOU HAVE ACCESS

| Tool | What It Does | Command |
|------|--------------|---------|
| **clasp** | Push code to Google Apps Script | `clasp push` |
| **brew** | Install packages if needed | `brew install <pkg>` |
| **git** | Version control | `git add . && git commit && git push` |
| **MCP Server** | 40+ specialized tools | Use when it's the best choice |

### DEPLOYMENT REQUIREMENTS

When you complete work:
1. **Commit to GitHub:** `git add . && git commit -m "message" && git push`
2. **Verify live site:** Check https://toddismyname21.github.io/tiny-seed-os/

**Changes must be LIVE, not just local.**

---

## 🔴 PRIORITY OVERRIDE: DESKTOP UI DEEP DIVE - 2026-01-24
**FROM:** PM_Architect (Phone Session)
**PRIORITY:** CRITICAL - CHEFS AND CSA CUSTOMERS COMING
**DEADLINE:** Tomorrow morning - seamless, consistent, FAST

---

### OWNER MANDATE (VERBATIM)

> "I want to start inviting chefs to our wholesale platform and CSA customers to our CSA member dashboard."
> "Both of those systems need a full audit. They need to be FLAWLESS for our reputation."
> "They need to be INTUITIVE and USER FRIENDLY."
> "NO SHORTCUTS. STATE OF THE ART TOP OF THE LINE PRODUCTION READY."

---

### YOUR MISSION: Desktop Web App UI Consistency Audit

**Goal:** Every page looks professional, consistent, and loads FAST. Our reputation depends on this.

#### Phase 1: RESEARCH FIRST (30 min)

Before touching ANY code, research:
1. Top farm management software UI patterns (FarmLogs, Tend, Farmbrite)
2. Best practices for dashboard loading states
3. Modern B2B SaaS UI patterns (clean, fast, professional)
4. Accessibility standards (WCAG 2.1 AA)

**Document your findings before proceeding.**

#### Phase 2: AUDIT (Every Desktop Page)

For EACH HTML file in `/web_app/` and root:

| Check | Pass/Fail |
|-------|-----------|
| Uses api-config.js (not hardcoded URLs) | |
| Consistent header/nav | |
| Consistent color scheme | |
| Consistent button styles | |
| Loading states (not frozen UI) | |
| Error states (helpful messages) | |
| Mobile responsive | |
| No console errors | |
| Fast load (<2 seconds) | |

#### Phase 3: PRIORITY FIXES

Focus on these pages FIRST (customer-facing):
1. **Wholesale Chef Portal** - Chefs will see this
2. **CSA Member Dashboard** - CSA customers will see this
3. **Main Admin Dashboard** - Owner uses daily
4. **Chief of Staff** - Owner's command center

#### RULES

- ❌ DO NOT rebuild pages that work
- ❌ DO NOT change functionality
- ❌ DO NOT add new features
- ✅ Fix inconsistencies
- ✅ Add loading states where missing
- ✅ Fix broken layouts
- ✅ Ensure all pages use api-config.js

#### IMPORTANT: CHECK THE OS FOLDER FIRST

**BEFORE YOU BUILD ANYTHING** - Check the root project folder and subfolders for existing work:
- Design specs
- UI mockups
- Partial implementations
- Style guides

**DO NOT DUPLICATE WORK THAT ALREADY EXISTS.**

#### DELIVERABLES

Write to your OUTBOX.md:
1. Complete page audit table
2. List of UI fixes made
3. Screenshots if helpful
4. Any pages that need Backend fixes (report to PM)
5. **FLAG anything not working or half-built** - these get repaired tomorrow

#### MORNING REPORT REQUIRED

Your findings will be compiled into an email report to the owner tomorrow morning. Be thorough.

---

## PREVIOUS: HIGH - DASHBOARD INVITE BUTTONS

---

## NEW TASK: Add Invite Buttons to Dashboard

**Owner Request:** The main dashboard needs invite buttons for:
1. **Employees** - Send invite with desktop/mobile setup instructions
2. **Wholesale Customers** - Send invite to chef ordering portal

### Location
Add to `master_dashboard_FIXED.html` or the main admin interface.

### UI Requirements

#### Invite Section (Card or Modal)
```
┌─────────────────────────────────────────────┐
│  👥 Invite Team Members                      │
├─────────────────────────────────────────────┤
│  [👷 Invite Employee]  [🍳 Invite Chef]     │
└─────────────────────────────────────────────┘
```

#### Employee Invite Modal
```
┌─────────────────────────────────────────────┐
│  👷 Invite New Employee               [X]   │
├─────────────────────────────────────────────┤
│  Name: [________________________]           │
│  Email: [_______________________]           │
│  Phone: [_______________________]           │
│  Role:  [Field Worker ▼]                    │
│                                             │
│  They'll receive:                           │
│  ✓ Email with login link                    │
│  ✓ Desktop shortcut instructions            │
│  ✓ Mobile app install guide                 │
│                                             │
│           [Cancel]  [Send Invite]           │
└─────────────────────────────────────────────┘
```

#### Chef Invite Modal
```
┌─────────────────────────────────────────────┐
│  🍳 Invite New Chef                   [X]   │
├─────────────────────────────────────────────┤
│  Restaurant: [____________________]         │
│  Contact Name: [__________________]         │
│  Email: [_________________________]         │
│  Phone: [_________________________]         │
│                                             │
│  They'll receive:                           │
│  ✓ Email invitation to order portal         │
│  ✓ SMS with quick link                      │
│                                             │
│           [Cancel]  [Send Invite]           │
└─────────────────────────────────────────────┘
```

### API Endpoints to Call

```javascript
// Employee invite
api.post('inviteEmployee', {
  name: '...',
  email: '...',
  phone: '...',
  role: '...'
});

// Chef invite (already exists)
api.post('inviteChef', {
  company_name: '...',
  contact_name: '...',
  email: '...',
  phone: '...'
});
```

### Files to Modify
- `master_dashboard_FIXED.html` - Add invite section
- Or create standalone `invite.html` if dashboard is complex

### Success Criteria
- One-click access to invite employees or chefs
- Clean, simple forms
- Confirmation message when invite sent

---

## PREVIOUS MISSION: WORLD-CLASS MOBILE CHEF ORDERING EXPERIENCE

**Owner Directive:** "NO SHORTCUTS. ONLY THE BEST POSSIBLE. STATE OF THE ART."

Build a mobile-first ordering experience that chefs will LOVE using.

---

## DESIGN PRINCIPLES

1. **Mobile-First** - Chefs order from their phones during service
2. **Speed** - Reorder in under 10 seconds
3. **Visual** - Beautiful produce photos, freshness indicators
4. **Smart** - Learns preferences, suggests intelligently
5. **Connected** - Real-time availability, instant confirmations

---

## TASK 1: Create Chef Mobile App

Create `/web_app/chef-order.html` - A PREMIUM mobile experience:

### Screen 1: Login/Onboarding
- Magic link authentication (no passwords)
- Beautiful farm branding
- Quick tutorial on first visit
- "Add to Home Screen" prompt for PWA

### Screen 2: Today's Availability (Home)
- Hero section: "Fresh This Week" with stunning photos
- Cards showing available products with:
  - Product photo
  - Name + variety
  - "Harvested Today" / "Harvested Yesterday" badges
  - Available quantity (real-time)
  - Price per unit
  - Quick-add button
- Filter: Greens | Roots | Fruits | Herbs | Flowers
- Search with autocomplete

### Screen 3: Coming Soon
- Calendar view of what's coming
- "Notify Me" button for products not yet available
- Forecast confidence indicator (High/Medium/Low)

### Screen 4: Quick Reorder
- Last order with one-tap reorder
- Favorite products grid
- Standing orders management
- "Order Again" templates

### Screen 5: Cart & Checkout
- Slide-up cart (not separate page)
- Delivery date picker
- Special instructions field
- Order total with running calculation
- "Submit Order" with confirmation

### Screen 6: Account & Preferences
- Contact preferences (SMS, Email, Both)
- Notification settings
- Favorite products
- Order history
- Delivery addresses

---

## TASK 2: Smart Features

### Freshness Indicators
```html
<span class="freshness harvested-today">🌿 Harvested Today</span>
<span class="freshness harvested-yesterday">✨ Picked Yesterday</span>
<span class="freshness peak-season">🔥 Peak Season</span>
<span class="freshness limited">⚡ Limited - Only 15 lb left</span>
<span class="freshness last-chance">🍂 Season Ending Soon</span>
```

### Smart Recommendations
- "Based on your orders: Try our Lacinato Kale"
- "Pairs well with your Cherry Tomatoes"
- "Other chefs are loving: Summer Squash"

### Real-Time Updates
- WebSocket or polling for availability changes
- "Sorry, Heirloom Tomatoes just sold out" toast
- Quantity updates while browsing

---

## TASK 3: Communication Integration

### In-App Notifications
- Order confirmations
- Availability alerts
- Harvest notifications

### SMS Integration (existing Twilio)
- Order confirmation text
- "Your order is ready for pickup"
- Weekly availability summary

### Email Integration
- Beautiful HTML order confirmations
- Weekly availability newsletter
- Shortage notifications with alternatives

---

## TASK 4: PWA Features

Make it installable:
```json
// manifest.json
{
  "name": "Tiny Seed Farm - Chef Orders",
  "short_name": "TSF Order",
  "start_url": "/web_app/chef-order.html",
  "display": "standalone",
  "background_color": "#1a1a2e",
  "theme_color": "#22c55e",
  "icons": [...]
}
```

---

## VISUAL DESIGN

### Color Palette (Premium Farm Feel)
- Primary: #22c55e (Fresh Green)
- Secondary: #1a1a2e (Deep Earth)
- Accent: #f59e0b (Harvest Gold)
- Background: #fafaf9 (Cream)
- Text: #1c1917 (Rich Brown)

### Typography
- Headers: Inter or DM Sans (Bold)
- Body: Inter (Regular)
- Prices: Tabular figures

### Photography Style
- Clean white/natural backgrounds
- Overhead and angled shots
- Show freshness (water droplets, soil)
- Consistent lighting

---

## FILE STRUCTURE

```
/web_app/
  chef-order.html        # Main app (you create this)
  chef-manifest.json     # PWA manifest
  /chef-assets/
    logo.svg
    default-product.jpg
```

---

## API ENDPOINTS TO USE

```javascript
// From api-config.js
const api = new TinySeedAPI();

// Get availability
api.get('getRealtimeAvailability')
api.get('getWeeklyAvailability')
api.get('getProductForecast', { productId, weeks: 4 })

// Chef account
api.get('getChefProfile', { customerId })
api.get('getChefOrderHistory', { customerId })
api.get('getChefRecommendations', { customerId })

// Orders
api.post('submitWholesaleOrder', { ... })
api.get('getStandingOrders', { customerId })
api.post('createStandingOrder', { ... })
```

---

## SUCCESS CRITERIA

A chef should be able to:
1. Open app on phone → See what's available in 2 seconds
2. Tap a product → Add to cart instantly
3. Reorder last order → 3 taps total
4. See what's coming next week → Calendar view
5. Get notified when their favorite product is harvested

---

## DEPLOYMENT

```bash
git add web_app/chef-order.html web_app/chef-manifest.json
git commit -m "Add world-class chef mobile ordering app"
git push origin main
```

---

## REPORT TO OUTBOX.md WHEN:
1. chef-order.html created with full UI
2. PWA manifest added
3. All screens functional
4. Tested on mobile device
5. Ready for chef invites

**DEADLINE: TODAY - Owner wants to invite chefs tonight**

---

## PREVIOUS TASK (Lower Priority)

MCP Shopify Import Tool - See previous inbox

---

*See UNIVERSAL_ACCESS.md for deployment instructions*

---

## NEW TASK: Add Field Management UI
**Date:** 2026-01-23
**From:** PM_Architect
**Priority:** MEDIUM

### Background
We just added two new fields to the OS (Z1 and CL) via API. The owner wants a frontend UI to add new fields without needing to call APIs directly.

### Requirements

#### Location
Add to an appropriate admin page (master_dashboard_FIXED.html or dedicated field management page)

#### Add Field Form/Modal
```
┌─────────────────────────────────────────────────┐
│  🌾 Add New Field                         [X]   │
├─────────────────────────────────────────────────┤
│  Field ID: [_________] (e.g., Z1, CL, P3)       │
│  Field Name: [_______________] (optional)       │
│                                                 │
│  Dimensions:                                    │
│  Length (ft): [_______]  Width (ft): [_______]  │
│                                                 │
│  Field Type: [Veg ▼]                            │
│    Options: Veg, Floral, Perennial              │
│                                                 │
│  ─── Bed Configuration ────────────────────     │
│  Bed Width (in): [30]   Path Width (in): [18]   │
│                                                 │
│  Auto-calculated beds: 14                       │
│  ☐ Override bed count manually                  │
│  Manual beds: [____] (for 30" potato rows, etc) │
│                                                 │
│  Preview: 14 beds × 450ft = 6,300 bed-ft        │
│           Acreage: 0.72 acres                   │
│                                                 │
│           [Cancel]  [Add Field]                 │
└─────────────────────────────────────────────────┘
```

### Key Features

1. **Auto-calculated beds** - Based on width / (bedWidth + pathWidth)
2. **Manual override checkbox** - When checked, allows entering custom bed count
   - Use case: Potatoes at 30" row spacing instead of standard beds
   - Use case: Accidental plastic layout that changes bed count
3. **Live preview** - Shows beds × length and acreage as user types
4. **Field type dropdown** - Veg, Floral, Perennial

### API Endpoint

```javascript
// POST to addField
const response = await fetch(API_BASE + '?action=addField', {
  method: 'POST',
  body: JSON.stringify({
    fieldId: 'Z1',
    name: 'Zone 1',
    length: 450,
    width: 70,
    type: 'Veg',
    bedWidth: 30,    // optional, default 30
    pathWidth: 18,   // optional, default 18
    numBeds: 14      // optional, overrides auto-calculation
  })
});

// Returns:
{
  "success": true,
  "field": { fieldId, name, length, width, acreage, numBeds, type },
  "bedsCreated": ["Z1-01", "Z1-02", ...],
  "message": "Field Z1 added with 14 beds"
}
```

### Validation

- fieldId required, must be unique
- length and width required, must be positive numbers
- If manual override enabled, numBeds must be positive integer

### Success State

After adding:
- Show success toast: "Field Z1 added with 14 beds"
- Optionally show link to view field in planning dashboard
- Clear form for next entry

### Files to Modify

- `master_dashboard_FIXED.html` - Add "Manage Fields" button/section
- Or create `field-management.html` if more appropriate

### Report to OUTBOX.md when complete

---
