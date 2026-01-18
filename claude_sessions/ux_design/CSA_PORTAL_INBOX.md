# INBOX: UX/Frontend Claude - Exceptional CSA Member Portal
## From: PM_Architect
## Priority: P1 - CRITICAL

**Created:** 2026-01-18
**Deadline:** URGENT - Owner demands EXCEPTIONAL, state-of-the-art quality

---

## MISSION STATEMENT

Transform the CSA Member Portal from "functional" to **EXCEPTIONAL**.

**Owner's exact words:** "I WANT IT TO BE SO SMART THAT IT KNOWS WHAT I SHOULD DO BEFORE ME. I WANT TO DO ITS BIDDING BECAUSE IT IS WHAT IS BEST FOR TINY SEED FARM."

This means:
- Anticipate member needs before they ask
- Proactive notifications and suggestions
- Delightful, intuitive experience
- Professional, polished design
- Zero friction in common tasks

---

## INDUSTRY RESEARCH FINDINGS

### Best-in-Class CSA Portals (Local Line, CSAware, Harvie)

**Features members love:**
1. **Real-time box customization** - See what's in this week's box, swap items instantly
2. **Vacation holds** - One-click to skip a week, automatic credit
3. **Recipe suggestions** - Based on box contents
4. **Farmer updates** - Photos from the field, what's growing
5. **Multi-channel notifications** - Email, SMS, push for pickup reminders
6. **Share upgrades** - Easy upsells mid-season
7. **Referral rewards** - Share credits for bringing friends
8. **Delivery tracking** - Real-time for home delivery members

**Pain points to avoid:**
- Clunky navigation requiring multiple clicks
- No mobile-first design
- Missing pickup/delivery reminders
- Confusing customization deadlines
- No visibility into upcoming weeks

---

## CURRENT STATE ANALYSIS

### Existing Portal (`web_app/csa.html`)

**What exists:**
- Magic link login flow
- Welcome banner with member name + share type
- Stats row (weeks remaining, swap credits, boxes received)
- This Week's Box display with swap buttons
- Upcoming boxes preview
- Order/pickup history tab
- Account settings tab
- Bottom navigation
- Swap modal (basic)
- Toast notifications

**What's missing (gaps to fill):**
1. No vacation hold scheduling
2. No real-time API integration (uses sample data)
3. No pickup/delivery reminders
4. No farmer updates or field photos
5. No recipe suggestions
6. No referral system
7. No add-on purchases
8. No delivery tracking for home delivery
9. No customization deadline warnings
10. Basic styling (needs polish)

---

## TASK 1: Magic Link Onboarding Experience

When a new member clicks their magic link for the first time:

### First-Time Welcome Flow
```
1. LANDING
   - "Welcome to Tiny Seed Farm, [NAME]!"
   - Brief animated farm illustration
   - "Let's get your account set up"

2. CONFIRM DETAILS
   - Show: Share type, pickup location, season dates
   - Allow corrections
   - "Is this correct?"

3. SET PREFERENCES (Optional)
   - Dislikes: "Any veggies you don't want?"
   - Allergies: "Any dietary restrictions?"
   - Communication: "How should we remind you?"
     [ ] Email
     [ ] SMS
     [ ] Both

4. COMPLETE
   - Confetti animation
   - "You're all set!"
   - "Your first box is [DATE]"
   - Link to portal home
```

### Implementation
- Detect first login via `is_onboarded` flag in membership
- Store preferences in CSA_Members sheet
- Skip for returning members

---

## TASK 2: Smart Dashboard

Replace basic home screen with intelligence:

### This Week's Box (Enhanced)
```
+------------------------------------------+
|  THIS WEEK'S BOX                   READY |
|  Week of Jan 21                          |
|  Pickup: Tuesday 4-7pm @ Squirrel Hill   |
+------------------------------------------+
|  [Photo of actual box being packed]      |
+------------------------------------------+
|  WHAT'S INSIDE (8 items)                 |
|                                          |
|  [Kale]      1 bunch      [Swap] [Hide]  |
|  [Carrots]   1 lb         [Swap] [Hide]  |
|  [Tomatoes]  1 pint       [Swap] [Keep]  |
|  ...                                     |
+------------------------------------------+
|  CUSTOMIZE BY: Wed 5pm (2 days left)     |
|  [Customize My Box]                      |
+------------------------------------------+
```

### Proactive Alerts
- "Customization closes in 2 hours!"
- "Pickup is tomorrow - don't forget!"
- "You have 2 unused swap credits"
- "New item this week: Watermelon!"

### Smart Suggestions
Based on member preferences:
- "You usually swap out kale. Want us to auto-swap for extra tomatoes?"
- "Based on your history, you might enjoy our add-on: Fresh Eggs"

---

## TASK 3: Vacation Hold System

### UI Design
```
+------------------------------------------+
|  VACATION HOLDS                          |
|                                          |
|  You have 2 vacation holds available     |
|  (3 max per season)                      |
|                                          |
|  +------------------------------------+  |
|  |  Jan 28 - Week 10                  |  |
|  |  [Schedule Hold]                   |  |
|  +------------------------------------+  |
|  |  Feb 4 - Week 11                   |  |
|  |  [Schedule Hold]                   |  |
|  +------------------------------------+  |
|                                          |
|  SCHEDULED HOLDS:                        |
|  [x] Feb 11 - Week 12  [Cancel]          |
+------------------------------------------+
```

### Backend Integration
```javascript
// API calls to implement:
scheduleVacationHold(memberId, weekDate)
cancelVacationHold(memberId, weekDate)
getVacationHolds(memberId)
```

---

## TASK 4: Enhanced Swap Experience

### Current: Basic modal with options
### Enhanced: Smart swap system

```
+------------------------------------------+
|  SWAP: Kale Bundle                       |
|                                    [X]   |
+------------------------------------------+
|  POPULAR SWAPS (for kale):               |
|  [Extra Salad Mix]  75% of members       |
|  [Herb Sampler]     15% of members       |
+------------------------------------------+
|  OTHER OPTIONS:                          |
|  [Spinach Bundle]   Available            |
|  [Chard Bundle]     Available            |
|  [Root Veggie Mix]  Available            |
|  [Extra Tomatoes]   Limited!             |
+------------------------------------------+
|  YOUR PREFERENCE:                        |
|  [x] Remember this swap for future kale  |
|                                          |
|  [Confirm Swap - Uses 1 Credit]          |
+------------------------------------------+
```

### Features:
- Show popularity of swaps
- "Limited!" badges for scarce items
- Remember preferences for auto-suggestions
- Bulk customization for multiple weeks

---

## TASK 5: Farmer Updates Feed

### Design
```
+------------------------------------------+
|  FROM THE FIELD                    See All|
+------------------------------------------+
|  [Photo: Greenhouse seedlings]           |
|  "Tomato seedlings are thriving!         |
|   Can't wait for you to taste these      |
|   heirlooms this summer."                |
|  - Don, Jan 18                           |
+------------------------------------------+
|  [Photo: Snow on fields]                 |
|  "Winter cover crops protecting the      |
|   soil for spring planting..."           |
|  - Don, Jan 15                           |
+------------------------------------------+
```

### Data Source
- New sheet: `Farmer_Updates` with columns:
  - Date, Photo_URL, Message, Author
- Or pull from social media posts

---

## TASK 6: Notification Preferences

### Settings Screen Addition
```
+------------------------------------------+
|  NOTIFICATIONS                           |
+------------------------------------------+
|  Pickup Reminders                        |
|  [x] Day before pickup                   |
|  [x] Day of pickup                       |
|                                          |
|  Box Updates                             |
|  [x] When box contents finalized         |
|  [x] When customization deadline near    |
|                                          |
|  Farm News                               |
|  [ ] Weekly farm updates                 |
|  [ ] Special offers                      |
|                                          |
|  Communication Method                    |
|  ( ) Email only                          |
|  (x) Email + SMS                         |
|  ( ) SMS only                            |
|                                          |
|  Phone: +1 (412) 555-1234  [Edit]        |
+------------------------------------------+
```

---

## TASK 7: Mobile-First Polish

### Current Issues:
- No pull-to-refresh
- No native-like transitions
- Basic tap feedback
- No haptic feedback hints
- Loading states could be smoother

### Enhancements:
1. **Pull-to-refresh** - Native iOS/Android feel
2. **Skeleton loading** - Gray boxes while loading
3. **Smooth transitions** - Page slides, modal animations
4. **Touch feedback** - Ripple effects on buttons
5. **Offline support** - Show cached data when offline
6. **Add to Home Screen** - PWA prompt

### CSS/Animation Additions
```css
/* Skeleton loading */
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

/* Page transitions */
.page-enter { animation: slideInRight 0.3s ease; }
.page-exit { animation: slideOutLeft 0.3s ease; }

/* Touch feedback */
.btn:active { transform: scale(0.98); }
```

---

## TASK 8: Integration with Backend APIs

### API Endpoints (Backend Claude is building these)

```javascript
// Magic Link
api.sendMagicLink(email)
api.verifyMagicLink(token, email)

// Member Data
api.getCSAMember(memberId)
api.updateCSAMember(memberId, data)

// Box Contents
api.getBoxContents(memberId, weekDate)
api.customizeBox(memberId, weekDate, swaps)

// Vacation Holds
api.scheduleVacationHold(memberId, weekDate)
api.cancelVacationHold(memberId, weekDate)
api.getVacationHolds(memberId)

// Preferences
api.updatePreferences(memberId, preferences)

// History
api.getPickupHistory(memberId)
```

### Error Handling
- Show friendly error messages
- Retry logic for network failures
- Fallback to cached data
- "Something went wrong" with retry button

---

## TASK 9: Add-On Shop (Stretch)

For members who want more:

```
+------------------------------------------+
|  ADD TO THIS WEEK'S BOX                  |
+------------------------------------------+
|  [Eggs - 1 dozen]        $6    [+ Add]   |
|  [Honey - 8oz jar]       $12   [+ Add]   |
|  [Extra Bouquet]         $15   [+ Add]   |
|  [Bread Loaf]            $8    [+ Add]   |
+------------------------------------------+
|  Your Add-Ons: 1 item                    |
|  [Eggs - 1 dozen]  $6           [Remove] |
|                                          |
|  Total: $6.00                            |
|  [Checkout - Pay with Card on File]      |
+------------------------------------------+
```

---

## DELIVERABLES

### Required Files to Modify/Create:

1. **`web_app/csa.html`** - Enhanced portal with all features
2. **`web_app/api-config.js`** - API integration layer
3. **`web_app/css/csa-portal.css`** - Extracted/enhanced styles (optional)

### Feature Checklist:

**Must Have (P1):**
- [ ] First-time onboarding flow
- [ ] Real-time API integration (not sample data)
- [ ] Vacation hold UI
- [ ] Enhanced swap modal with popularity
- [ ] Pickup/delivery reminder UI
- [ ] Mobile polish (skeleton loading, transitions)

**Should Have (P2):**
- [ ] Farmer updates feed
- [ ] Notification preferences
- [ ] Preference memory for swaps
- [ ] Offline caching

**Nice to Have (P3):**
- [ ] Add-on shop
- [ ] Recipe suggestions
- [ ] Referral system

---

## DESIGN PRINCIPLES

1. **Farm-fresh aesthetic** - Warm greens, earthy tones, natural imagery
2. **Instant feedback** - Every action shows immediate response
3. **Anticipate needs** - Show relevant info before member asks
4. **Forgiveness** - Easy undo, clear confirmations
5. **Delight** - Small animations, friendly copy, celebration moments

---

## CRITICAL REQUIREMENTS

1. **EXCEPTIONAL quality** - This is the member's primary touchpoint
2. **Mobile-first** - 80% of members will use phone
3. **Accessible** - WCAG 2.1 AA compliance
4. **Fast** - Page load under 2 seconds
5. **Reliable** - Graceful degradation when API is slow

---

## COORDINATION

- Read COORDINATION_RULES.md before making changes
- Backend Claude is building the API endpoints - coordinate timing
- Update your OUTBOX.md when done
- Test on actual mobile devices, not just browser simulator

---

*UX Claude - Make the CSA portal so good that members brag about it to their friends*
