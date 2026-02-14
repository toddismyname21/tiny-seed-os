# INBOX: Desktop Web Claude
## Your Mission: Own All Admin/Manager Desktop Interfaces

**Created:** 2026-01-22
**From:** PM Claude
**Priority:** HIGH - PLATFORM OWNERSHIP

---

## 🚨 URGENT TASK: SYSTEM AUDIT - 2026-01-22 EVENING

**From:** PM_Architect
**Priority:** CRITICAL
**Deadline:** IMMEDIATE

### CONTEXT
The API URL was pointing to an EXPIRED deployment. This has been FIXED:
- **NEW API URL:** `AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm`
- Updated in `web_app/api-config.js`
- Site is live at: **https://app.tinyseedfarm.com**

### YOUR ASSIGNMENT: FULL DESKTOP AUDIT

**Goal:** Ensure ALL desktop HTML files are connected to the API and functioning.

#### Step 1: Check Each File Uses api-config.js
Verify every HTML file includes:
```html
<script src="api-config.js"></script>
```
If it has a hardcoded API URL, REMOVE IT and use `TINY_SEED_API.MAIN_API` instead.

#### Step 2: Test These Critical Pages
1. **web_app/index.html** - Does it load? Do dashboard cards show data?
2. **web_app/sales.html** - Does it connect and show orders?
3. **web_app/financial-dashboard.html** - Does it load financial data?
4. **web_app/admin.html** - Does admin dashboard work?
5. **web_app/command-center.html** - Does overview load?
6. **Root index.html** - Does main landing work?

#### Step 3: Check Root HTML Files
Many root files may have OLD hardcoded API URLs. Check:
- planning.html
- calendar.html
- greenhouse.html
- succession.html
- labels.html
- seed_inventory_PRODUCTION.html

If they don't use api-config.js, UPDATE THEM.

#### Step 4: Document Findings
Create: `claude_sessions/desktop_web/AUDIT_REPORT_2026-01-22.md`
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
```

### REPORT TO OUTBOX WHEN DONE
Update your OUTBOX with audit completion status.

---

## 🆕 NEW FEATURE: CHIEF OF STAFF COMMUNICATIONS UI - 2026-01-22

**From:** PM_Architect + Owner
**Priority:** HIGH (after audit)
**Spec:** `claude_sessions/CHIEF_OF_STAFF_COMMUNICATIONS_SPEC.md`

### OWNER REQUEST
"I want to be able to tell the chief of staff to text someone or email someone, and it does it. I want team alerts for lunch, all hands tasks, etc."

### YOUR TASK: BUILD FRONTEND UI

Add Communications panel to `web_app/chief-of-staff.html`:

1. **Recipient Selector** - Dropdown with team members + "Whole Team" option
2. **Channel Selector** - SMS / Email / Both buttons
3. **Message Input** - Text area for owner's intent
4. **Draft Preview** - Show AI-drafted message before sending
5. **Send Button** - With confirmation
6. **Quick Alerts** - Preset buttons for Lunch, All Hands, Weather, etc.
7. **History View** - Recent outbound messages

### API ENDPOINTS (Backend Claude building these)
- `getTeamContacts` - Load team dropdown
- `draftMessage` - Generate message from intent
- `sendSMS` - Send text message
- `sendOwnerEmail` - Send email
- `sendTeamAlert` - Broadcast to team
- `getCommunicationHistory` - Show recent messages

### UI WIREFRAME
See full spec: `claude_sessions/CHIEF_OF_STAFF_COMMUNICATIONS_SPEC.md`

---



## YOUR ROLE

You are the **Desktop Web Claude** - the owner of all admin, manager, and desktop-first interfaces in Tiny Seed Farm OS.

**Your Focus:**
- Complex data grids and tables
- Multi-panel dashboards
- Keyboard-heavy workflows
- Print layouts (labels, reports)
- Desktop-optimized admin tools

---

## YOUR FILES (Ownership)

### Admin Dashboards
| File | Location | Current Status |
|------|----------|----------------|
| admin.html | `/web_app/admin.html` | 70/100 |
| sales.html | `/web_app/sales.html` | 75/100 |
| accounting.html | `/web_app/accounting.html` | 70/100 |
| financial-dashboard.html | `/web_app/financial-dashboard.html` | 65/100 |
| command-center.html | `/web_app/command-center.html` | 70/100 |
| field-planner.html | `/web_app/field-planner.html` | 70/100 |
| ai-assistant.html | `/web_app/ai-assistant.html` | 65/100 |
| quickbooks-dashboard.html | `/web_app/quickbooks-dashboard.html` | 55/100 |

### Planning & Operations (Root)
| File | Location | Current Status |
|------|----------|----------------|
| index.html | Root | 75/100 |
| planning.html | Root | 55/100 |
| calendar.html | Root | 50/100 |
| succession.html | Root | 55/100 |
| farm-operations.html | Root | 70/100 |
| greenhouse.html | Root | 60/100 |
| sowing-sheets.html | Root | 55/100 |

### Tools & Utilities
| File | Location | Current Status |
|------|----------|----------------|
| labels.html | Root + `/web_app/` | 65-70/100 |
| seed_inventory_PRODUCTION.html | Root | 70/100 |
| soil-tests.html | Root | 50/100 |
| smart_learning_DTM.html | Root | 50/100 |
| food-safety.html | Root | 55/100 |

### Google Apps Script Forms
| File | Location | Current Status |
|------|----------|----------------|
| Form_NewCrop.html | `/apps_script/` | 85/100 |
| Form_Duplicate.html | `/apps_script/` | 75/100 |
| Form_ImportStaging.html | `/apps_script/` | 80/100 |
| Wizard_Form.html | `/apps_script/` | 80/100 |
| FinancialDashboard.html | `/apps_script/` | 45/100 |

### Analytics & Specialized
| File | Location | Current Status |
|------|----------|----------------|
| smart-predictions.html | `/web_app/` | 55/100 |
| marketing-command-center.html | `/web_app/` | 60/100 |
| social-intelligence.html | `/web_app/` | 55/100 |
| seo_dashboard.html | `/web_app/` | 55/100 |
| book-import.html | `/web_app/` | 50/100 |
| wealth-builder.html | `/web_app/` | 55/100 |

---

## COORDINATION WITH MOBILE APP CLAUDE

You work as a pair with Mobile App Claude. Here's how to coordinate:

### Shared Resources (Both Use)
- `api-config.js` - API endpoint configuration
- `auth-guard.js` - Authentication system
- Color palette and design tokens
- API endpoints and data contracts

### Your Responsibility
- All screens with sidebars
- All screens with complex tables/grids
- All print layouts
- All admin-only features

### Mobile App Claude's Responsibility
- All touch-first interfaces
- All field/outdoor use screens
- All PWA features
- All camera/GPS features

### Communication Protocol
1. Before changing any shared file (api-config.js, auth-guard.js), post to your OUTBOX
2. Check Mobile App Claude's OUTBOX before making API contract changes
3. Route questions through PM_Architect if unclear

---

## IMMEDIATE PRIORITIES

### Priority 1: Analytics Dashboards (Stubs)
Many analytics pages are stubs (50-60 status). These need completion:
1. smart-predictions.html
2. seo_dashboard.html
3. wealth-builder.html
4. book-import.html

### Priority 2: Planning Tools
Root-level planning tools need work:
1. planning.html (55/100)
2. calendar.html (50/100)
3. succession.html (55/100)
4. soil-tests.html (50/100)

### Priority 3: Financial Dashboard Support
Support Financial Claude's mega-build by:
1. Improving FinancialDashboard.html UI (45/100)
2. Ensuring wealth-builder.html is ready
3. Making accounting.html production-ready

---

## DESIGN STANDARDS

### Desktop-First Patterns
- Sidebar navigation (260px fixed width)
- Data tables with sorting/filtering
- Keyboard shortcuts for power users
- Print-optimized CSS (@media print)

### Color Palette (Use Consistently)
```css
--primary: #2e7d32;        /* Farm green */
--secondary: #1565c0;       /* Action blue */
--accent: #ff8c00;          /* Orange accent */
--background: #1a1a2e;      /* Dark theme */
--surface: #16213e;         /* Card backgrounds */
--text: #f5f5f5;            /* Light text */
```

### Component Patterns
- Use existing button variants (primary, secondary, success, warning, danger)
- Maintain consistent spacing (8px grid)
- Follow existing card/panel patterns
- Include loading states and error handling

---

## REPORTING

After each session, update your OUTBOX.md with:
1. Files modified
2. Status changes (new scores)
3. Dependencies on other Claudes
4. Blockers or questions

---

## SUCCESS CRITERIA

1. All desktop dashboards at 75+ status
2. All planning tools functional
3. Consistent design across all admin pages
4. Print layouts work correctly
5. Keyboard navigation functional

---

**You own the desktop experience. Make it powerful, efficient, and professional.**

*PM Claude*

---

## IMPORTANT: READ UNIVERSAL_ACCESS.md
You have full MCP server access and can deploy code via `clasp push`.
See: `/Users/samanthapollack/Documents/TIny_Seed_OS/claude_sessions/UNIVERSAL_ACCESS.md`

---

# 🚨 NEW PRIORITY TASKS - MCC CREATE TAB - 2026-02-14

**From:** PM_Architect
**Priority:** HIGH
**Context:** Marketing Command Center improvements based on user feedback and industry research

---

## Task 1: Add Carousel Checkbox at Media Upload Point

**User Feedback:** "I FEEL LIKE THE CAROUSEL SHOULD BE JUST A CHECKMARK AT THE UPLOAD POINT"

**Location:**
- `web_app/marketing-command-center.html`
- Quick Post media upload section (~line 5933)

**Implementation:**
1. Add checkbox "Create Carousel" next to/below media upload button
2. When checked, show thumbnail strip of uploaded images
3. Allow drag-to-reorder thumbnails
4. Connect to existing carousel logic (lines 31107-31206, maxSlides now 20)

**Acceptance Criteria:**
- [ ] Checkbox appears near media upload area
- [ ] Checking it reveals thumbnail strip
- [ ] Images can be reordered via drag
- [ ] Carousel posts correctly when POST NOW clicked

---

## Task 2: Add "Check Post" Analysis Button

**User Request:** "Can we have some sort of rating system before we post?"

**Location:**
- `web_app/marketing-command-center.html`
- Above POST NOW button (~line 6414)

**Implementation:**
1. Add "Check Post" button that opens analysis modal
2. Modal shows:
   - Engagement prediction score (use predictEngagement, line 22506)
   - Optimal posting time (use getOptimalPostingTime, line 22202)
   - Caption length optimization
   - Hashtag effectiveness
   - Suggestions for improvement
3. Include "Post Anyway" and "Optimize" buttons in modal

**Acceptance Criteria:**
- [ ] "Check Post" button appears above POST NOW
- [ ] Modal opens with analysis results
- [ ] Shows actionable suggestions

---

## Task 3: Make POST NOW Sticky on Mobile (Priority 2.4)

**Context:** 624 lines between caption textarea and POST NOW button.

**Implementation:**
Add CSS media query:
```css
@media (max-width: 768px) {
    .publish-actions {
        position: sticky;
        bottom: 0;
        background: var(--bg-primary);
        padding: 1rem;
        z-index: 100;
        border-top: 1px solid var(--border);
        box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
    }
}
```

**Acceptance Criteria:**
- [ ] POST NOW button sticks to bottom on mobile (<768px)
- [ ] Desktop layout unchanged

---

## Reference Documents

- `docs/MCC_CREATE_TAB_REMAINING_TASKS.md` - Full task list with priorities
- `docs/audits/CREATE_TAB_VERIFIED_TRUTH.md` - Verified feature inventory
- `docs/audits/CREATE_TAB_UNIFIED_ANALYSIS.md` - Industry comparison

---

## Priority 1 Changes COMPLETED (2026-02-14)

These changes are already implemented and need verification:
- [x] maxSlides 10 → 20 (lines 31107, 31206)
- [x] Tone dropdown in Quick Post
- [x] Tone passed to generateAICaption
- [x] Celebration triggers on post success
- [x] AI predictions surfaced above POST NOW

---

# URGENT: FIX SCHEDULE FLOW IN MCC CREATE TAB - 2026-02-14

**From:** PM_Architect
**Priority:** CRITICAL
**Goal:** Make the CREATE tab FLAWLESS - scheduling is currently broken
**Discovered by:** Backend_Claude (see their OUTBOX for full analysis)

---

## THE PROBLEM

The SCHEDULE button in Quick Post **does not actually schedule anything**. Three pieces exist but are disconnected:

| Piece | Location | Status |
|-------|----------|--------|
| POST NOW -> `publishAll()` -> posts to Instagram | MCC line ~17555 | WORKS |
| SCHEDULE button -> `openSchedulePicker()` -> date picker UI | MCC line ~25624 | UI ONLY |
| `schedulePost` backend endpoint | MERGED TOTAL.js (deployed @627) | EXISTS but nothing calls it |

---

## YOUR 3 TASKS (all in `web_app/marketing-command-center.html`)

### Task 1: Fix `setScheduleTime()` to actually enable scheduled mode

**Current bug:** `setScheduleTime()` (line ~25647) updates the display label and shows a toast but NEVER sets `isScheduled = true`. It also never calls `toggleScheduleMode()`.

**Fix:** After `setScheduleTime()` sets the display, it must:
```javascript
isScheduled = true;
// Update UI to show user is in SCHEDULE mode, not POST NOW mode
```

Also make sure the POST NOW button text/style changes to indicate "SCHEDULE" mode when a time is picked. The user must clearly see they're scheduling, not posting immediately.

### Task 2: Fix `publishAll()` to call `schedulePost` when `isScheduled === true`

**Current bug:** `publishAll()` (line ~17555) reads `scheduleTime` at line ~17560 but then calls `postToInstagram` directly (immediate post). It NEVER sends `scheduleTime` to the backend.

**Fix:** Add a check at the top of the publish flow:

```javascript
if (isScheduled && scheduleTime) {
    // Call backend schedulePost endpoint instead of posting immediately
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
            action: 'schedulePost',
            platforms: selectedPlatforms,
            caption: document.getElementById('captionInput').value,
            mediaUrls: [/* collected media URLs */],
            scheduledFor: scheduleTime,
            createdBy: 'mcc_quick_post'
        })
    });
    const result = await response.json();
    if (result.success) {
        showToast(`Scheduled for ${new Date(scheduleTime).toLocaleString()}!`, 'success');
        showCelebration(1);
        // Reset form
    }
    return; // Don't continue to immediate post
}
```

**Backend `schedulePost` accepts:** `{ platforms, caption, mediaUrls, scheduledFor, createdBy, campaignId }`
**Returns:** `{ success: true, scheduleId: "SCH_xxx" }`

### Task 3: Show confirmation with scheduled time after scheduling

After a successful schedule:
1. Show a success toast with the scheduled date/time
2. Trigger the celebration animation (same as POST NOW success)
3. Optionally show a small banner: "Scheduled! View in Calendar tab" with a link/button to switch to the CALENDAR tab
4. Reset the form (clear caption, media, set `isScheduled = false`)

---

## IMPORTANT CONTEXT

- The backend `schedulePost` endpoint is **already deployed and live** at @627
- It saves to a SCHEDULED_POSTS sheet with status "scheduled"
- A `getScheduledPosts` endpoint also exists for reading back scheduled posts
- Backend_Claude is building a separate time-trigger to publish when due (that's their task, not yours)
- You ONLY need to fix the frontend wiring

## TESTING

After implementing:
1. Open CREATE tab -> Quick Post
2. Write a caption, add media, select platforms
3. Click SCHEDULE -> pick a date/time
4. Confirm the button changes to indicate SCHEDULE mode
5. Click the schedule action -> verify toast shows scheduled time
6. Check browser Network tab -> confirm `schedulePost` endpoint was called (not `postToInstagram`)

## FILES TO MODIFY
- `web_app/marketing-command-center.html` ONLY

## DELIVERABLE
- Push changes to main branch
- Update your OUTBOX with what you changed + line numbers
- Mark task as IMPLEMENTED (Verifier will verify)

---

*PM_Architect - 2026-02-14 - Make CREATE tab FLAWLESS*

---

# NEW: Implement Social Media Tagging UX - 2026-02-14

**From:** PM_Architect
**Priority:** HIGH
**Context:** Social Media Claude completed comprehensive UX research. Backend Claude documented API capabilities. This is the frontend implementation task.
**Research:** `claude_sessions/social_media/OUTBOX.md` → RESEARCH 1: Social Media Tagging UX Best Practices
**Backend API Research:** `claude_sessions/backend/SOCIAL_MEDIA_TAGGING_API_RESEARCH.md`

---

## Task 1: @Mention Autocomplete with Local Favorites

**Location:** `web_app/marketing-command-center.html` - Quick Post caption area

**Implementation:**
1. Detect `@` typed in the caption textarea
2. Show a dropdown of **saved recent/favorite usernames** (NOT platform autocomplete - IG/TikTok APIs don't support it)
3. Pre-populate favorites with these farm accounts:
   - `@tinyseedfarm`, `@tinyseedfleurs`, `@tinyseedfungi`
   - `@kretschmannfarm`
4. Store recent mentions in `localStorage` under key `mcc_recent_mentions`
5. Render @mentions as **blue text** (visual only - use CSS or inline styling)
6. Show subtle note: "Verify spelling — Instagram does not support username lookup"
7. Max 20 mentions for Instagram (platform limit)

**UI Pattern:**
```
Caption textarea:
+--------------------------------------------------+
| Had an amazing time at the farm with              |
| @tinyseedfarm picking fresh veggies!              |
+--------------------------------------------------+
  [dropdown when @ typed]
  +---------------------------+
  | Recent Mentions           |
  |   @tinyseedfleurs         |
  |   @tinyseedfungi          |
  | Favorites                 |
  |   @kretschmannfarm        |
  |   @lawrencevillefm        |
  +---------------------------+
```

---

## Task 2: Location Tag Search with Saved Favorites

**Implementation:**
1. Add a location search field BELOW the caption area (NOT inline in caption)
2. On search, call `?action=searchFacebookPlaces&query={search_text}` (Backend Claude building this)
3. Pre-populate saved favorites with Todd's CSA stops:
   - Rochester - Kretschmann Family Organic Farm
   - Lawrenceville - Tuesday Farmer's Market
   - Sewickley - Saturday Farmer's Market
   - Oakmont - Today's Organic Market
   - Highland Park - Bryant St. Market
   - Bloomfield - Saturday Farmer's Market
4. Store in `localStorage` under key `mcc_saved_locations`
5. Selected location shown as a removable pill/chip with pin icon
6. Show platform indicator: "Applies to IG + FB" (gray out when only TikTok selected)

**UI Pattern:**
```
Location: [Search locations...        ] [pin icon]
           +--------------------------+
           | Saved Locations          |
           |   Kretschmann Farm       |
           |   Lawrenceville Market   |
           |   Bryant St. Market      |
           | Recent                   |
           |   Sewickley FM           |
           +--------------------------+

Selected: [Kretschmann Farm  x]
```

---

## Task 3: Hashtag Group Manager

**Implementation:**
1. Add `#` icon to caption toolbar (next to existing buttons)
2. Clicking `#` opens a floating popover with saved hashtag groups
3. Default groups to pre-create:
   - **Farm Fresh** (8): `#organic #farmfresh #pittsburgh #localfood #farmtotable #CSA #organicfarm #sustainablefarming`
   - **Markets** (5): `#farmersmarket #pittsburghfarmers #shoplocal #freshproduce #marketday`
   - **Seasonal** (6): `#springharvest #farmlife #growyourown #eatlocal #seasonaleating #harvestseason`
4. One-click group insertion into caption
5. "AI Suggest" button that calls existing AI caption analysis to suggest hashtags
6. Live counter: `X/30` for Instagram hashtag limit
7. Store custom groups in `localStorage` under key `mcc_hashtag_groups`
8. Allow user to create/edit/delete groups

---

## Task 4: First Comment Field (Instagram Best Practice)

**Implementation:**
1. Add a separate "First Comment" textarea that appears ONLY when Instagram is selected
2. Label: "First Comment (Instagram)" with info tooltip: "Industry best practice: put hashtags in the first comment to keep your caption clean"
3. Show subtle dashed border to distinguish from main caption
4. Character counter for first comment
5. When posting to Instagram, send first comment content as a separate API call after the main post publishes
6. Add `?action=postInstagramComment` call after successful `postToInstagram` (Backend may need to add this endpoint)

---

## Task 5: Per-Platform Feature Visibility

**Implementation:**
Show/hide tagging features based on which platforms are selected:

| Feature | Instagram | Facebook | TikTok |
|---------|-----------|----------|--------|
| @Mentions | YES (max 20) | YES | YES |
| Location tags | YES | YES | HIDE field |
| First comment | YES | HIDE | HIDE |
| Hashtag limit counter | 30 max | Hide counter | Hide counter |

Gray out or hide unsupported features when that platform is deselected.

---

## Visual Design Spec (Match UX Design Claude's Aesthetic)

| Element | Visual Treatment |
|---------|-----------------|
| @Mention (in dropdown) | Blue chip/pill with subtle glow |
| Hashtag (in caption) | Teal text |
| Location tag (selected) | Pill with pin icon + `x` to remove |
| Hashtag group card | Rounded card with group name + count badge |
| First comment field | Dashed border, slightly lighter background |
| Dropdown | Glass morphism (`backdrop-filter: blur(10px)`), consistent with existing UX polish |

---

## IMPORTANT NOTES

- **Do NOT build platform autocomplete for Instagram** - the API doesn't support it. Use local favorites only.
- Match the existing UX Design Claude aesthetic (glass morphism, gradient borders, micro-interactions)
- All localStorage keys should be prefixed with `mcc_`
- Test on mobile - dropdowns should be touch-friendly (44px min tap targets)
- Commit and push to main when done

---

## DELIVERABLE

1. Implement all 5 tasks in `web_app/marketing-command-center.html`
2. Push to main branch
3. Update OUTBOX with what you built + line numbers
4. Mark as IMPLEMENTED

---

*PM_Architect - 2026-02-14 - Implement social media tagging in CREATE tab*
