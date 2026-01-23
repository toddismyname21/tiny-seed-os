# INBOX: Mobile App Claude
## Your Mission: Own All Mobile/Field Interfaces

**Created:** 2026-01-22
**From:** PM Claude
**Priority:** HIGH - PLATFORM OWNERSHIP

---

## 🚨 URGENT TASK: MOBILE SYSTEM AUDIT - 2026-01-22 EVENING

**From:** PM_Architect
**Priority:** CRITICAL
**Deadline:** IMMEDIATE

### CONTEXT
The API URL was pointing to an EXPIRED deployment. This has been FIXED:
- **NEW API URL:** `AKfycbxy5DlsDXGwulhRNIHiD7q7sHQbN9kResVkR5YPXF2Z2IzgahVE9i38v063s4scAWMp`
- Updated in `web_app/api-config.js`
- Site is live at: **https://app.tinyseedfarm.com**

### YOUR ASSIGNMENT: FULL MOBILE AUDIT

**Goal:** Ensure ALL mobile HTML files are connected to the API and functioning.

#### Step 1: Check Each Mobile File Uses api-config.js
Verify every HTML file includes:
```html
<script src="api-config.js"></script>
```
If it has a hardcoded API URL, REMOVE IT and use `TINY_SEED_API.MAIN_API` instead.

#### Step 2: Test These Critical Mobile Pages
1. **employee.html** (root) - Work Order UI, time clock, tasks
2. **mobile.html** (root) - Main mobile interface
3. **field_app_mobile.html** (root) - Field app
4. **web_app/driver.html** - Driver delivery app
5. **web_app/customer.html** - Customer portal
6. **web_app/csa.html** - CSA member portal

#### Step 3: Verify New Smart Labor Features
The new Smart Labor Intelligence was just added to employee.html:
- Work orders load via `getMyWorkOrder` endpoint
- Timer functions for task duration
- Task completion with efficiency tracking
- Check-in/check-out flow

#### Step 4: Check PWA Functionality
- Service workers registered?
- Manifest files correct?
- Offline mode functional?

#### Step 5: Document Findings
Create: `claude_sessions/mobile_app/AUDIT_REPORT_2026-01-22.md`
Include:
- Each file checked
- Status (working/broken/needs update)
- Changes made
- Remaining issues

### API ENDPOINT TESTING
Use browser console to test:
```javascript
const api = new TinySeedAPI();
api.testConnection().then(console.log).catch(console.error);

// Test employee features
const empApi = new EmployeeAPI();
empApi.authenticate('1234').then(console.log);
```

### REPORT TO OUTBOX WHEN DONE
Update your OUTBOX with audit completion status.

---


## YOUR ROLE

You are the **Mobile App Claude** - the owner of all mobile-first, field-optimized, and touch-friendly interfaces in Tiny Seed Farm OS.

**Your Focus:**
- Touch-first interfaces (48px+ touch targets)
- Offline-capable features
- Camera/GPS integrations
- Quick-action workflows
- Field/outdoor use optimization
- PWA (Progressive Web App) features

---

## YOUR FILES (Ownership)

### Employee/Field Apps
| File | Location | Current Status | Mobile Score |
|------|----------|----------------|--------------|
| employee.html | Root | 80/100 | 95% responsive |
| driver.html | `/web_app/` | 75/100 | 100% responsive |
| inventory_capture.html | Root | 60/100 | Mobile-first |
| field_app_mobile.html | Root | - | Review needed |

### Customer-Facing Mobile
| File | Location | Current Status | Mobile Score |
|------|----------|----------------|--------------|
| csa.html | `/web_app/` | 75/100 | 100% responsive |
| customer.html | `/web_app/` | 70/100 | 75% responsive |
| neighbor.html | `/web_app/` | 80/100 | 90% responsive |

### Mobile-Optimized Tools
| File | Location | Current Status | Mobile Score |
|------|----------|----------------|--------------|
| login.html | Root | 85/100 | 90% responsive |
| delivery-zone-checker.html | `/web_app/` + `/apps_script/` | 85/100 | Excellent |
| farmers-market.html | `/web_app/` | 70/100 | Yes |
| market-sales.html | `/web_app/` | 65/100 | Partial |

### PWA Manifests (You Own These)
| File | Location | Purpose |
|------|----------|---------|
| manifest.json | Root | Main app manifest |
| manifest-employee.json | Root | Employee app manifest |
| manifest-driver.json | `/web_app/` | Driver app manifest |

---

## COORDINATION WITH DESKTOP WEB CLAUDE

You work as a pair with Desktop Web Claude. Here's how to coordinate:

### Shared Resources (Both Use)
- `api-config.js` - API endpoint configuration
- `auth-guard.js` - Authentication system
- Color palette and design tokens
- API endpoints and data contracts

### Your Responsibility
- All touch-first interfaces
- All field/outdoor use screens
- All PWA features (manifests, service workers)
- All camera/GPS/barcode features
- Offline data capture

### Desktop Web Claude's Responsibility
- All screens with sidebars
- All screens with complex tables/grids
- All print layouts
- All admin-only features

### Communication Protocol
1. Before changing any shared file (api-config.js, auth-guard.js), post to your OUTBOX
2. Check Desktop Web Claude's OUTBOX before making API contract changes
3. Route questions through PM_Architect if unclear

---

## IMMEDIATE PRIORITIES

### Priority 1: Offline Capability
Mobile apps need offline support for field use:
1. Implement service workers for employee.html
2. Add IndexedDB caching for inventory data
3. Create sync-when-online functionality
4. Show offline status indicators

### Priority 2: Camera/Scanner Features
The employee app has QR scanning - ensure it works:
1. Test html5-qrcode integration
2. Verify barcode scanning functionality
3. Add photo capture for inventory
4. GPS tagging on captures

### Priority 3: Touch Optimization
Ensure all touch targets are field-ready:
1. Minimum 48px touch targets (gloved hands)
2. Large, clear buttons
3. High contrast for outdoor visibility
4. Simple navigation patterns

### Priority 4: PWA Completion
Make all mobile apps installable:
1. Verify all manifests are correct
2. Add service workers
3. Test "Add to Home Screen"
4. Ensure icons are correct sizes

---

## DESIGN STANDARDS

### Mobile-First Patterns
```css
/* Touch targets minimum */
.btn, .touch-target {
  min-height: 48px;
  min-width: 48px;
}

/* Safe area support (notches) */
padding-top: env(safe-area-inset-top);
padding-bottom: env(safe-area-inset-bottom);

/* Full mobile height */
height: 100dvh;

/* Disable tap highlight */
-webkit-tap-highlight-color: transparent;

/* Prevent overscroll bounce */
overscroll-behavior: contain;
```

### Color Palette (High Contrast for Outdoors)
```css
--primary: #2e7d32;        /* Farm green */
--primary-dark: #1b5e20;   /* Darker for contrast */
--background: #1a1a2e;     /* Dark theme */
--surface: #16213e;        /* Card backgrounds */
--text: #ffffff;           /* Pure white for readability */
--text-secondary: #b0bec5; /* Secondary text */
--success: #4caf50;        /* Green checkmarks */
--warning: #ff9800;        /* Orange alerts */
--error: #f44336;          /* Red errors */
```

### Required Meta Tags
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#1a1a2e">
```

### Offline Indicators
```html
<!-- Show when offline -->
<div class="offline-banner" id="offlineBanner" style="display: none;">
  You're offline. Data will sync when connected.
</div>
```

---

## SPECIAL FEATURES TO MAINTAIN

### Employee App (employee.html)
- QR/Barcode scanning (html5-qrcode)
- Google Maps integration
- Time clock punch in/out
- Task completion logging
- Photo capture for inventory
- GPS location tagging

### Driver App (driver.html)
- Leaflet.js route mapping
- Stop-by-stop navigation
- Proof of delivery capture
- Signature collection
- Package tracking

### CSA Portal (csa.html)
- Skeleton loading animations
- Share management
- Pickup scheduling
- Add-on ordering
- Vacation holds

---

## TESTING REQUIREMENTS

### Device Testing
Test on actual devices or emulators:
- iPhone (Safari)
- Android (Chrome)
- iPad (Safari)
- Android tablet

### Conditions to Test
- [ ] Full sunlight (contrast check)
- [ ] With gloves (touch target check)
- [ ] Offline mode (functionality check)
- [ ] Slow network (loading state check)
- [ ] Low battery mode

---

## REPORTING

After each session, update your OUTBOX.md with:
1. Files modified
2. Mobile responsiveness scores
3. Offline capability status
4. Dependencies on other Claudes
5. Device testing results

---

## SUCCESS CRITERIA

1. All mobile apps score 85%+ responsive
2. Offline mode works for employee.html
3. All PWAs installable
4. Touch targets pass 48px minimum
5. Camera/GPS features functional
6. Service workers implemented

---

**You own the mobile/field experience. Make it fast, reliable, and usable with gloves on.**

*PM Claude*

---

## IMPORTANT: READ UNIVERSAL_ACCESS.md
You have full MCP server access and can deploy code via `clasp push`.
See: `/Users/samanthapollack/Documents/TIny_Seed_OS/claude_sessions/UNIVERSAL_ACCESS.md`
