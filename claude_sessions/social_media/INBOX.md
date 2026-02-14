## REGISTRATION INSTRUCTIONS

**Do these steps NOW, in order:**

1. Use the Read tool to read: `/Users/samanthapollack/Documents/TIny_Seed_OS/CLAUDE.md`
2. Use the Read tool to read: `/Users/samanthapollack/Documents/TIny_Seed_OS/claude_sessions/pm_architect/SYSTEM_MANIFEST.md`
3. Use the Read tool to read your instructions: `/Users/samanthapollack/Documents/TIny_Seed_OS/claude_sessions/social_media/INSTRUCTIONS.md`
4. Use the Edit tool to append to your OUTBOX confirming registration

---

# INBOX: Social Media Claude
## From: PM_Architect

**Updated:** 2026-01-29 @ 1:30 PM
**NEW PRIORITY TASK:** Connect Marketing Dashboard to Real Social Accounts
**NEW CAPABILITY:** Browser Control Enabled - Use `claude --chrome`

---

## 🚀 CRITICAL UPDATE: YOU HAVE BROWSER CONTROL

### How to Start with Browser Control

**Instead of running `claude`, run:**
```bash
claude --chrome
```

This gives you the ability to:
- Navigate to websites directly
- Click buttons, fill forms, read pages
- Complete OAuth flows with user approval
- Copy API keys and credentials from dashboards
- Take screenshots for documentation

### USE THIS FOR META DEVELOPER ONBOARDING

When setting up the Meta Business API:
1. Navigate directly to `developers.facebook.com`
2. Walk through the app creation process yourself
3. Click through permissions setup
4. Read and extract the API credentials
5. Configure OAuth redirect URLs

**You no longer need to give step-by-step instructions to the user.**
**You can DO IT YOURSELF with their approval at key steps.**

---

## 🚨 NEW PRIORITY: MARKETING DASHBOARD - REAL ACCOUNT CONNECTION

### Background
The OS has a Marketing Dashboard at `web_app/marketing.html` that needs to be connected to Todd's REAL social media accounts so we can actually start using it.

### Your Mission

#### Task 1: Research Current Marketing Dashboard
1. Read `web_app/marketing.html` to understand what's built
2. Read `apps_script/MarketModule.js` if it exists
3. Document what the dashboard CAN do vs what's not connected

#### Task 2: Social Account Integration Options

Research and document the best way to connect these accounts:
- **Instagram** (@tinyseedfarm or similar)
- **Facebook** (Tiny Seed Farm page)
- **TikTok** (if they have one)
- **Twitter/X** (if they have one)

**Options to evaluate:**
1. **Ayrshare** - Multi-platform API (may already have API key pending)
2. **Meta Business Suite API** - For Instagram/Facebook
3. **Direct platform APIs** - Individual connections
4. **Buffer/Hootsuite APIs** - Third-party management

#### NEW: Browser-Assisted Onboarding

Since you have `--chrome` browser control, you can:

**For Meta/Facebook/Instagram:**
1. Navigate to `developers.facebook.com`
2. Help user create a Meta App
3. Configure Instagram Basic Display API or Graph API
4. Set up OAuth redirect URLs pointing to our Apps Script
5. Extract App ID and App Secret
6. Test the connection

**For TikTok:**
1. Navigate to `developers.tiktok.com`
2. Walk through app registration
3. Configure permissions for posting and analytics

**REMEMBER:** Ask user for approval before:
- Logging in with their credentials
- Submitting any forms
- Creating apps or changing settings

#### Task 3: Implementation Plan

Create `/claude_sessions/social_media/MARKETING_DASHBOARD_INTEGRATION.md`:
- Which platforms Todd actually uses
- Best integration approach (Ayrshare vs direct APIs)
- What API keys/credentials are needed from Todd
- Step-by-step implementation plan
- What features will work once connected:
  - Post scheduling
  - Analytics viewing
  - Content calendar
  - Performance metrics

#### Task 4: Credential Checklist for Todd

Create a simple checklist of EXACTLY what Todd needs to provide:
```
□ Instagram Business Account username
□ Facebook Page admin access
□ [etc.]
```

#### Deliverable

Update your OUTBOX with:
1. Current dashboard capabilities assessment
2. Recommended integration approach
3. Credential checklist for Todd
4. Implementation timeline estimate

---

### WHY THIS MATTERS
Todd wants to use the marketing dashboard for REAL work, not just look at demo data. This enables actual social media management through the OS.

---

### PREVIOUS TASKS (Lower Priority Now)
The direct mail tasks below are still valid but this dashboard integration is now the priority.

---

**URGENT UPDATE:** 2026-01-16 - OVERNIGHT DIRECTIVE (Previous)

---

## OVERNIGHT MISSION (Owner is sleeping - WORK AUTONOMOUSLY)

### PRIMARY ASSIGNMENT: USPS DIRECT MAIL MARKETING SYSTEM

Owner wants to develop a direct mail marketing strategy with an algorithm to find high-value addresses.

#### Task 1: Direct Mail Research

**Research USPS direct mail options:**
- Every Door Direct Mail (EDDM)
- Targeted mailing lists
- Postcard vs letter costs
- Bulk mail discounts
- Design requirements

Create `/claude_sessions/social_media/DIRECT_MAIL_RESEARCH.md`:
- USPS program options
- Cost per piece at different volumes
- Timeline from design to delivery
- Best practices for response rates

#### Task 2: High-Value Address Algorithm

**Owner's vision:** "Algorithm to generate high value addresses for direct mail marketing"

**Target demographics:**
- New developments (new construction neighborhoods)
- New home buyers
- Affluent zip codes
- Areas near farmers markets
- Food-conscious neighborhoods

Create `/claude_sessions/social_media/ADDRESS_TARGETING_ALGORITHM.md`:

**Research data sources:**
- Zillow/Realtor APIs for new sales
- USPS new mover lists
- Census data for demographics
- Property tax records
- Neighborhood income data

**Define scoring algorithm:**
```
High-Value Address Score =
  (Income_Factor × 0.3) +
  (Distance_to_Farm × 0.2) +
  (New_Homeowner × 0.25) +
  (Food_Interest_Indicators × 0.25)
```

Document how to identify and prioritize addresses.

#### Task 3: "Won't You Be My Neighbor" Landing Page

**Owner wants a dedicated landing page for direct mail recipients.**

Create `/claude_sessions/social_media/NEIGHBOR_LANDING_PAGE_SPEC.md`:

**Page concept:**
- Warm, welcoming design
- "You're invited to join our farm community"
- Introduction to Tiny Seed Farm
- CSA signup / newsletter signup
- Farm location and contact
- Special offer for direct mail recipients (trackable)

**Include:**
- Wireframe/mockup
- Copy suggestions
- Call-to-action design
- How to track direct mail conversions

#### Task 4: Campaign Planner

Create `/claude_sessions/social_media/DIRECT_MAIL_CAMPAIGN_PLAN.md`:

**First campaign plan:**
- Target: 500-1000 households
- Timing: When to send (pre-season?)
- Message: What to say
- Offer: What incentive
- Budget: Estimated costs
- Expected response rate
- ROI calculation

#### Deliverable: MORNING DIRECT MAIL BRIEF

Create `/claude_sessions/social_media/MORNING_DIRECT_MAIL_BRIEF.md`:
- Research summary
- Targeting strategy
- Landing page concept
- Recommended first campaign
- Cost estimates

---

### SECONDARY ASSIGNMENT (If blocked on primary)

If you can't access USPS info or hit permissions:

**Social Media Content Calendar**
- Design content calendar for 2026
- Post frequency recommendations
- Content themes by season
- Platform-specific strategies

---

### AYRSHARE STATUS

API key still needs to be stored by owner. Note this in your OUTBOX but don't let it block you - focus on direct mail.

---

### CHECK-IN PROTOCOL

Write to your OUTBOX when:
1. USPS research complete
2. Targeting algorithm designed
3. Landing page spec ready
4. Campaign plan drafted

**PM_Architect will check your OUTBOX.**

---

*Social Media Claude - Build a direct mail system that brings neighbors to the farm*

---

## IMPORTANT: READ UNIVERSAL_ACCESS.md
You have full MCP server access and can deploy code via `clasp push`.
See: `/Users/samanthapollack/Documents/TIny_Seed_OS/claude_sessions/UNIVERSAL_ACCESS.md`

---

## 🌐 BROWSER CONTROL QUICK REFERENCE

**To start this session with browser control:**
```bash
cd /Users/samanthapollack/Documents/TIny_Seed_OS
claude --chrome
```

**Browser capabilities:**
| Action | Command/Capability |
|--------|-------------------|
| Open URL | Navigate directly |
| Click | Click buttons, links, tabs |
| Type | Fill forms, search boxes |
| Read | Extract text, find elements |
| Screenshot | Document current state |
| Scroll | Navigate long pages |

**Best practices:**
- Always confirm with user before login actions
- Take screenshots to document progress
- Ask before submitting forms with real data
- Use browser control to SPEED UP onboarding, not bypass user consent

---

*Social Media Claude - Now with browser superpowers*

---

# 🚨 NEW PRIORITY TASKS - MCC CREATE TAB RESEARCH - 2026-02-14

**From:** PM_Architect
**Priority:** HIGH
**Context:** Marketing Command Center UX research to support Desktop_Claude implementation

---

## Task 1: Research Social Media Tagging UX Best Practices

**User Request:** "HOW CAN WE TAG FOLKS WITH THIS SYSTEM?"
Backend_Claude is researching API capabilities. You research the UX/UI side.

**Research Questions:**

1. **Tag Input UI Patterns**
   - How do Later, Buffer, Hootsuite handle tag input?
   - Autocomplete from followers list?
   - @ symbol trigger?
   - Inline vs separate field?

2. **Location Tagging UX**
   - Map picker vs search box?
   - Recent locations?
   - Save favorite locations?

3. **Platform Differences**
   - Which platforms support which tag types?
   - How to show platform-specific options?

**Deliverables:**
Write to your OUTBOX.md:
- UX recommendations for tag input
- Mockup descriptions or wireframe concepts
- Best practices from competitor analysis

---

## Task 2: Research "Generate 3 Options" UX (Priority 2.1)

**Context:** From MCC_CREATE_TAB_REMAINING_TASKS.md:
"Current: Quick Post generates 1 caption. Industry standard is 3+ options."

**Research Questions:**

1. **How do competitors display multiple options?**
   - Cards side-by-side?
   - Carousel/swipe?
   - List with radio buttons?

2. **Selection interaction**
   - "Use This" button?
   - Click to select?
   - Drag to caption field?

3. **Mobile considerations**
   - Swipe between options?
   - Stack vertically?

**Deliverables:**
Write to your OUTBOX.md:
- Recommended UI pattern with justification
- Mobile adaptation strategy
- Implementation notes for Desktop_Claude

---

## Task 3: Research Trending Audio Integration

**Context:** TikTok and Reels engagement improves with trending audio.

**Research Questions:**

1. What APIs provide trending audio data?
2. How do tools like Later/Planoly show trending sounds?
3. Legal considerations for suggesting audio?

**Deliverables:**
Write to your OUTBOX.md:
- API availability findings
- UX pattern recommendations
- Implementation feasibility assessment

---

## Reference Documents

- `docs/MCC_CREATE_TAB_REMAINING_TASKS.md` - Full task list with priorities
- `docs/audits/CREATE_TAB_VERIFIED_TRUTH.md` - Verified feature inventory

---

# UPDATE FROM PM_ARCHITECT - 2026-02-14 EVENING

**Priority:** READ THIS FIRST - task changes below

---

## TASK 2 IS DONE - DO NOT WORK ON IT

**"Generate 3 Options" UX (Task 2 from earlier today) has been IMPLEMENTED and pushed live.**

PM_Architect built it in commit `8a8fdb4`:
- 3 caption variants (Concise, Detailed, Personal) displayed as selectable cards
- "Use This" and "Copy" buttons on each card
- Stacked vertically (works on mobile)
- "Try Again" button also added

**You do NOT need to research this anymore. Skip Task 2 entirely.**

---

## UPDATED PRIORITY ORDER

### Priority 1: Social Media Tagging UX Research (Task 1 - still needed)
Backend_Claude completed API research (`claude_sessions/backend/SOCIAL_MEDIA_TAGGING_API_RESEARCH.md`). Their findings:
- Instagram: @mentions YES, photo tags YES, collaborators YES (max 3), location YES
- Facebook: @mentions Pages only, photo tags RESTRICTED, location YES
- TikTok: @mentions text only, no photo tags

**We need YOUR UX research to design the frontend for this.** How should the tag input work in the MCC CREATE tab? This is the next feature to build after current push stabilizes.

### Priority 2: Long-Lived Token Conversion (URGENT - from your own OUTBOX)
Your OUTBOX says current Meta tokens expire in ~60 days. This needs to happen before they expire or posting breaks. Research and document the exact steps to:
1. Exchange short-lived tokens for long-lived tokens (60 day -> never-expire page tokens)
2. Set up automatic refresh trigger in Apps Script
3. Which of the 3 accounts need this (tinyseedfarm, tinyseedfleurs, tinyseedfungi)

### Priority 3: Trending Audio Research (Task 3 - still needed, lower priority)
No rush on this one. Complete when Tasks 1 and 2 are done.

---

## DELIVERABLES

Write all findings to your OUTBOX.md. Tag each section clearly so PM_Architect can find it:
1. `## TAGGING UX RESEARCH` - for Task 1
2. `## TOKEN CONVERSION PLAN` - for Priority 2
3. `## TRENDING AUDIO RESEARCH` - for Task 3 (if time)

---

*PM_Architect - 2026-02-14 evening*
