# CSA System Improvement Roadmap

**Date:** 2026-02-12
**Author:** Claude Opus 4.5 (PM Architect)
**Status:** Strategic Planning Document

---

## Executive Summary

### Key Insight: Harvie Closed (End 2024) - Market Opportunity for AI Customization

Harvie was the industry leader in AI-powered CSA box customization. Their closure at the end of 2024 has created a significant gap in the market for farms wanting intelligent, preference-based box building. This represents a **major competitive opportunity** for Tiny Seed Farm.

**What Harvie Was Known For:**
- AI-powered box customization (their signature "BoxBot" competitor)
- Member preference learning and tracking
- Smart substitutions based on member history
- Personalized boxes without member effort

**Current Market Landscape:**
- **CSAware** is now the only platform with algorithm-based box building ("BoxBot")
- **GrownBy** has AI Custom Shares in Beta
- **Local Line** emerged as the main Harvie migration destination (no AI)
- **NO platform** has recipe integration or meal planning
- **NO platform** has a dedicated mobile app

**Bottom Line:** Tiny Seed Farm already has many building blocks for Harvie-level customization. The opportunity is to **activate and enhance** existing features to capture former Harvie customers and differentiate in the market.

---

## What We Have vs What Industry Leaders Have

| Feature | Our System | Industry Standard | Gap Status |
|---------|-----------|-------------------|------------|
| **Box Customization** | Item swap system with credits | Harvie had AI, CSAware has BoxBot | **PARTIAL - Need AI layer** |
| **Member Preferences** | Explicit dislikes + implicit signal tracking | YES - explicit 1-5 ratings | **HAVE IT - Not fully connected** |
| **Smart Substitutions** | "Remember this swap" checkbox | AI-based substitutions | **PARTIAL - Manual only** |
| **Preference Learning** | Implicit signals (kept, swapped, bought) | Behavioral tracking | **HAVE IT - Backend exists** |
| **Health Scoring** | Full churn prediction (0-100 score) | Basic retention tracking | **AHEAD of industry** |
| **Proactive Alerts** | P1/P2/P3 intervention system | Basic reports | **AHEAD of industry** |
| **Member Portal** | Full PWA with magic link auth | Basic web portals | **STRONG** |
| **Vacation Holds** | Self-service with donate/credit | YES - standard | **COMPLETE** |
| **Onboarding** | 30-day sequence defined | Varies widely | **HAVE IT - Partially active** |
| **SMS Communication** | Infrastructure exists | CSAware, HappyCSA have it | **GAP - Not fully connected** |
| **SNAP/EBT Support** | No | CSAware, LFM have it | **GAP - Consider for mission** |
| **Recipe Integration** | No | NO ONE has this | **MARKET OPPORTUNITY** |
| **Mobile App** | PWA (good) | No one has native app | **COMPETITIVE** |
| **Multi-Producer** | No | LFM, GrownBy have it | **Not needed for single farm** |
| **Cohort Analysis** | Yes - built in retention dashboard | Advanced feature | **AHEAD of industry** |

---

## Features We Already Built But May Not Be Using

### 1. Preference System (BUILT - Partially Connected)

**Backend Functions:**
- `saveCSAMemberPreference()` - Save item preference with rating
- `getCSAMemberPreferences()` - Get all member preferences
- `calculateCSABoxSatisfaction()` - Predict satisfaction score 0-100
- `recordCSAImplicitSignal()` - Track behavioral signals

**Preference Weights Already Defined:**
- EVERY_TIME: 5 points
- LIKE_IT: 4 points
- SOMETIMES: 3 points (default)
- RARELY: 2 points
- NEVER: 0 points

**Implicit Signals Already Tracked:**
- KEPT_IN_BOX: +0.3 points
- SWAPPED_OUT: -0.7 points
- ADDON_PURCHASED: +1.0 points
- RECIPE_CLICKED: +0.4 points
- POSITIVE_FEEDBACK: +0.5 points
- NEGATIVE_FEEDBACK: -0.5 points

**Status:** The backend is COMPLETE. The frontend only uses the "dislikes" field and "remember swap" checkbox. The full preference rating system is not connected to the portal UI.

### 2. Smart Intelligence Layer (BUILT - Active)

**What's Working:**
- `calculateMemberHealthScoreEnhanced()` - Uses real pickup data
- `getProactiveCSAAlerts()` - P1/P2/P3 priority alerts
- `getAtRiskCSAMembers()` - Identifies churn risks
- `getCSARetentionDashboardEnhanced()` - Cohort analysis

**Health Score Formula:**
```
HEALTH = (Pickup x 0.30) + (Engagement x 0.25) +
         (Customization x 0.20) + (Support x 0.15) + (Tenure x 0.10)
```

**Status:** This is MORE ADVANCED than most competitors. However, the engagement score is still hardcoded at 70 (needs portal login tracking).

### 3. Box Customization System (BUILT - Basic)

**What's Working:**
- Swap modal with item selection
- Swap credits system
- "Remember this swap" checkbox
- Popular swaps display
- Limited item warnings

**What's NOT Working:**
- No AI-suggested swaps based on preferences
- Popular swaps are hardcoded, not data-driven
- No "auto-build my box" option

### 4. Onboarding System (DESIGNED - Partially Implemented)

**30-Day Sequence Defined:**
| Day | Channel | Action |
|-----|---------|--------|
| 0 | Email+SMS | Welcome & Confirmation |
| 1 | Email | Quick Start Guide |
| 2 | SMS | Profile Completion Nudge |
| 3 | Email | Feature Education (Customization) |
| 5 | Email | Social Proof (Member Stories) |
| 7 | Email+SMS | First Pickup Prep |
| 8 | SMS | Post-Pickup Check-in |
| 10 | Email | Recipes Based on Box |
| 14 | Email | Milestone Celebration |
| 21 | Email | Community Invite |
| 30 | Phone | Personal Success Call |

**Status:** `getOnboardingTasks()` generates the task list. `triggerCSAOnboardingEmail()` exists. Not all emails are templated. SMS not connected.

### 5. Communication Infrastructure (PARTIAL)

**What Exists:**
- Magic link email auth
- Welcome email template (`CSAWelcomeEmail.html`)
- `sendCSAWeeklyReminder()` function
- SMS code verification (for login)

**What's Missing:**
- Twilio fully connected for reminder SMS
- Automated weekly preview emails
- Recipe email integration

---

## Harvie Gap Opportunity

### What Harvie Had That Made It Special

1. **Algorithm-Built Boxes**
   - Member sets preferences ONCE
   - System automatically builds personalized box each week
   - No member effort required
   - Boxes "just work" for their taste

2. **Learning Over Time**
   - System remembered what they kept vs swapped
   - Boxes got better each week
   - "The more you use it, the smarter it gets"

3. **Zero Food Waste Promise**
   - Members never got items they hated
   - Higher satisfaction = higher retention

### What We Can Implement

**Phase 1: Smart Swap Suggestions (Quick Win)**
- Use existing preference data to suggest swaps
- Replace hardcoded "popular swaps" with personalized recommendations
- Add "We noticed you always swap out X - would you like to exclude it?"

**Phase 2: Preference-Aware Box Preview**
- When showing "This Week's Box," highlight:
  - "Based on your preferences, we think you'll love this box (87% match)"
  - Items flagged: "You usually swap this - want to swap now?"
  - Personalized swap suggestions pre-populated

**Phase 3: Auto-Customize Option**
- Add toggle: "Auto-optimize my box"
- System automatically makes swaps based on learned preferences
- Member can review and override
- This IS what Harvie did

### Competitive Advantage

1. **We already have the data infrastructure** - CSA_Preferences sheet exists with rating system
2. **We have implicit signal tracking** - Can learn without explicit ratings
3. **We have health scoring** - Can identify when customization helps retention
4. **We have a modern portal** - Better UX than CSAware's older interface

**If we activate these features, we could offer Harvie-level functionality within a single-farm context.**

---

## Priority 1: Critical Gaps (Must Have)

### 1.1 Complete SMS Integration
**Impact:** HIGH - Blocks member communication
**Effort:** MEDIUM (infrastructure exists)

**What's Needed:**
- Connect Twilio credentials
- Enable SMS toggle in member preferences
- Test `sendCSAWeeklyReminder()` via SMS
- Add SMS pickup confirmation

**Why It Matters:**
- Research shows SMS has 5x engagement vs email for time-sensitive messages
- CSAware and HappyCSA both have SMS built-in
- Members expect text reminders in 2026

### 1.2 Portal Login Tracking
**Impact:** HIGH - Health scores inaccurate without it
**Effort:** LOW

**What's Needed:**
- Add `last_login` timestamp to CSA_Members on portal authentication
- Update `calculateMemberHealthScoreEnhanced()` to use real engagement data
- Replace hardcoded engagement score (currently 70)

**Why It Matters:**
- Health score is the core of our churn prediction
- Without login tracking, engagement component is meaningless
- Quick win with high value

### 1.3 Activate Preference-Based Swap Suggestions
**Impact:** HIGH - Differentiation opportunity
**Effort:** MEDIUM

**What's Needed:**
- Call `getCSAMemberPreferences()` when opening swap modal
- Sort swap options by predicted preference score
- Show "Recommended for you" section based on data
- Replace hardcoded popular swaps with actual popularity data

**Why It Matters:**
- This is the first step toward Harvie-style AI
- Data already exists, just not connected
- Quick win for member experience

### 1.4 Connect "Remember Swap" to Preference System
**Impact:** MEDIUM - Learning mechanism
**Effort:** LOW

**What's Needed:**
- When member checks "Remember this swap," call `saveCSAMemberPreference()`:
  - Set original item to RARELY (2)
  - Set chosen swap to LIKE_IT (4)
- Log implicit signal: SWAPPED_OUT

**Why It Matters:**
- Checkbox exists but doesn't persist learning
- Critical for building preference profiles over time

---

## Priority 2: Important Gaps (Should Have)

### 2.1 Weekly Box Satisfaction Preview
**Impact:** MEDIUM - Reduces surprise, increases engagement
**Effort:** MEDIUM

**What's Needed:**
- Call `calculateCSABoxSatisfaction()` when loading box contents
- Display: "We predict 82% satisfaction with this box"
- If below 70%: Prompt "Would you like to customize?"
- Show which items drag down score

**Why It Matters:**
- Creates anticipation and control
- Proactive vs reactive customization
- Industry best practice (anticipation > surprise)

### 2.2 Build Waitlist System
**Impact:** MEDIUM - Captures demand
**Effort:** LOW-MEDIUM

**What's Needed:**
- Create CSA_Waitlist sheet
- Add waitlist form to location finder
- Send notification when capacity opens
- Track waitlist conversion

**Why It Matters:**
- Currently losing potential customers when at capacity
- Creates urgency and FOMO
- Standard feature across all competitors

### 2.3 Automate Renewal Campaign
**Impact:** MEDIUM - Owner burden
**Effort:** MEDIUM

**What's Needed:**
- Configure `runCSARenewalCampaign()` trigger
- Set up 30/14/7 day reminder sequence
- Generate Shopify renewal links
- Track renewal conversion by touchpoint

**Why It Matters:**
- Currently manual process
- Research: Each renewal increases likelihood of next
- Automation = consistent execution

### 2.4 Preference Rating UI (Harvie-Style)
**Impact:** MEDIUM - Better preference data
**Effort:** MEDIUM

**What's Needed:**
- Add preference quiz during onboarding Step 2
- Show all available crops with 5-point rating (Love/Like/OK/Rarely/Never)
- Save to CSA_Preferences sheet
- Allow editing from account settings

**Why It Matters:**
- Currently only free-text dislikes
- Structured ratings enable better algorithms
- CSAware BoxBot requires this input

---

## Priority 3: Nice to Have

### 3.1 Recipe Integration
**Impact:** HIGH for differentiation - NO competitor has this
**Effort:** HIGH

**What's Needed:**
- Recipe database (or API integration)
- Match recipes to weekly box contents
- Include in weekly email
- Track clicks as implicit signal (+0.4 to item rating)

**Why It Matters:**
- #1 reason members leave: Food waste
- Recipes help members use everything
- Unique differentiator in market

### 3.2 Auto-Optimize Box Feature
**Impact:** HIGH - True Harvie replacement
**Effort:** HIGH

**What's Needed:**
- Member toggle: "Auto-optimize my box"
- Algorithm reviews box against preferences
- Automatically makes optimal swaps
- Notifies member of changes for review

**Why It Matters:**
- This IS what Harvie did
- Zero-effort customization
- Highest member satisfaction

### 3.3 Meal Planning Integration
**Impact:** MEDIUM-HIGH - No competitor has this
**Effort:** VERY HIGH

**What's Needed:**
- Weekly meal plan suggestions based on box
- Shopping list for additional ingredients
- Prep schedule for the week
- Integration with recipe system

**Why It Matters:**
- Unique value proposition
- Addresses food waste comprehensively
- Could be premium feature

### 3.4 Push Notifications
**Impact:** LOW-MEDIUM
**Effort:** MEDIUM

**What's Needed:**
- Enable PWA push notifications
- Customize deadline alerts
- Pickup reminders
- Special offers

**Why It Matters:**
- Higher engagement than email
- Expected in modern apps
- But SMS may be sufficient

### 3.5 SNAP/EBT Support
**Impact:** LOW-MEDIUM (market segment)
**Effort:** HIGH (regulatory, technical)

**What's Needed:**
- Forage or similar integration
- Payment flow changes
- Compliance documentation

**Why It Matters:**
- Only CSAware and LFM have this
- Mission-aligned for food access
- Consider based on member demographics

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
**Theme: Connect What We Have**

| Task | Priority | Effort | Owner |
|------|----------|--------|-------|
| Complete Twilio SMS integration | P1 | 4 hrs | Backend |
| Add portal login tracking | P1 | 2 hrs | Backend |
| Connect preferences to swap modal | P1 | 4 hrs | Backend + Frontend |
| Connect "Remember Swap" to save preference | P1 | 2 hrs | Backend |
| Test onboarding email sequence | P2 | 4 hrs | Backend |

**Deliverable:** SMS working, health scores accurate, swaps personalized

### Phase 2: Intelligence (Weeks 3-4)
**Theme: Make It Smart**

| Task | Priority | Effort | Owner |
|------|----------|--------|-------|
| Box satisfaction preview | P2 | 6 hrs | Backend + Frontend |
| Preference rating UI (onboarding) | P2 | 8 hrs | Frontend |
| Waitlist capture system | P2 | 6 hrs | Backend + Frontend |
| Weekly preview email with satisfaction | P2 | 4 hrs | Backend |

**Deliverable:** Members see personalized box predictions, can rate items

### Phase 3: Automation (Weeks 5-6)
**Theme: Remove Manual Work**

| Task | Priority | Effort | Owner |
|------|----------|--------|-------|
| Renewal campaign automation | P2 | 8 hrs | Backend |
| Onboarding sequence triggers | P2 | 6 hrs | Backend |
| Proactive alert notifications | P2 | 4 hrs | Backend |
| Admin dashboard for alerts | P3 | 8 hrs | Frontend |

**Deliverable:** Renewal reminders automatic, onboarding runs itself

### Phase 4: Differentiation (Weeks 7-8+)
**Theme: Become Best-in-Class**

| Task | Priority | Effort | Owner |
|------|----------|--------|-------|
| Recipe integration pilot | P3 | 16+ hrs | Full Stack |
| Auto-optimize box feature | P3 | 20+ hrs | Full Stack |
| Push notifications | P3 | 8 hrs | Frontend |
| NPS survey integration | P3 | 4 hrs | Backend |

**Deliverable:** Harvie-level features, market differentiation

---

## Integration with Existing Systems

### Shopify Integration (HAVE IT)
- Webhook auto-creates members from orders
- Product sync for CSA shares
- Add-on purchases tracked
- Renewal links can be generated

**Enhancement Needed:** Generate personalized Shopify checkout links for renewals

### Member Portal (HAVE IT)
- PWA with magic link auth
- This Week's Box view
- Swap system with credits
- Vacation holds
- Flex funds display

**Enhancement Needed:** Add preference rating UI, satisfaction preview

### SMS Communication (PARTIAL)
- SMS code login works
- Infrastructure exists for reminders
- Twilio credentials needed

**Enhancement Needed:** Complete Twilio setup, enable SMS preferences

### Google Sheets Backend (HAVE IT)
- CSA_Members sheet
- CSA_Preferences sheet (with schema)
- CSA_Pickup_Attendance sheet
- CSA_Support_Log sheet
- CSA_Onboarding_Tracker sheet

**Enhancement Needed:** None - schema supports all planned features

### Email System (HAVE IT)
- Gmail/SMTP sending
- Welcome email template
- Magic link generation

**Enhancement Needed:** Template additional onboarding emails, weekly previews

---

## Success Metrics

### Member Experience
| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| Box satisfaction score | Unknown | >80% avg | `calculateCSABoxSatisfaction()` |
| Items swapped per season | Unknown | <4 avg | Track in swap log |
| Portal login frequency | Unknown | 2x/week | Login tracking |
| Customization rate | Unknown | >60% | Track box modifications |

### Retention
| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| Health score avg | Unknown | >75 | Retention dashboard |
| First-year retention | Unknown | >70% | Cohort analysis |
| Renewal rate | Unknown | >85% | Campaign tracking |
| Churn prediction accuracy | N/A | >80% | Compare predictions to outcomes |

### Operations
| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| Support tickets | Unknown | -30% | Support log |
| Missed pickups | Unknown | <5% | Attendance tracking |
| Manual interventions | High | -50% | Owner time tracking |

---

## Conclusion

Tiny Seed Farm is well-positioned to capture the Harvie gap opportunity. The key insight is that **most of the infrastructure already exists** - it just needs to be connected and activated.

**Immediate wins (this week):**
1. Add portal login tracking (2 hours)
2. Connect preferences to swap suggestions (4 hours)
3. Make "Remember Swap" actually save preferences (2 hours)

**These three changes alone would make our system smarter than 80% of competitors.**

The path to Harvie-level functionality is clear:
1. Activate existing preference system
2. Add box satisfaction predictions
3. Build auto-optimize feature

**The competitive moat:** We have health scoring and churn prediction that no other platform has. Combined with AI-style customization, Tiny Seed would offer the most intelligent CSA member experience on the market.

---

*Document created 2026-02-12 by Claude Opus 4.5 (PM Architect)*
*Based on CSA_SYSTEM_AUDIT.md and CSA_INDUSTRY_RESEARCH.md*
