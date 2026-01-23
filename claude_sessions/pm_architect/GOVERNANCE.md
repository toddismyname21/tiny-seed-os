# GOVERNANCE: Checks & Balances for Tiny Seed OS
## PM_Architect - Delegator in Chief
## Created: 2026-01-23

---

# THE IRON RULES

## IRON RULE #1: LIVE SITE MUST ALWAYS FUNCTION

No matter what we're building, fixing, or breaking behind the scenes - the production website at `app.tinyseedfarm.com` must continue to work for:
- Don (owner)
- Employees clocking in/out
- Chefs placing orders
- Customers using the portal

---

## IRON RULE #2: NEVER GUESS - ALWAYS ASK

**IF DATA IS MISSING, EMPTY, OR UNCLEAR: STOP AND ASK.**

DO NOT:
- Fabricate data to fill gaps
- Make assumptions about plans, numbers, or details
- Create documents with placeholder/invented content
- Proceed without verified information

DO:
- Stop immediately when data is missing
- Ask the owner: "Where is the real data for X?"
- Wait for real data before creating any document
- State clearly: "I don't have this information"

**WHY THIS MATTERS:**
- Don Kretschmann values planning and forethought
- Fabricated documents waste tokens and damage trust
- Wrong information is worse than no information
- Asking shows respect; guessing shows carelessness

**EXAMPLES:**

BAD: "Planning API returned empty, so I'll guess what crops go where"
GOOD: "Planning API returned empty. Where is your actual 2026 field plan?"

BAD: "I don't know the lease amount so I'll estimate $200/acre"
GOOD: "I don't have the lease amount. What is it, or where can I find it?"

BAD: Creating a document with "TBD" or made-up values
GOOD: "I need X, Y, Z data before I can create this document"

---

# CHECKS AND BALANCES SYSTEM

## 1. PM_Architect Authority

**I (PM_Architect) am the final authority on:**
- All Apps Script deployments (clasp push/deploy)
- Any changes to shared files (api-config.js, auth-guard.js, login.html)
- Any changes that affect production functionality
- Rollback decisions

**No Claude deploys without:**
1. Reporting changes in OUTBOX.md
2. PM review and approval
3. Post-deployment verification

## 2. Deployment Gates

### GATE 1: Pre-Deployment Review
Before ANY deployment:
- [ ] Changes documented in OUTBOX.md
- [ ] No breaking changes to existing functionality
- [ ] API endpoints tested with curl
- [ ] HTML pages tested in browser
- [ ] Rollback plan identified

### GATE 2: Deployment Verification
After deployment:
- [ ] Critical endpoints still working (healthCheck, login, clockIn, clockOut)
- [ ] No console errors on main pages
- [ ] Owner notification if significant changes

### GATE 3: Rollback Ready
Always maintain:
- Previous deployment ID documented
- Rollback command ready
- Previous working version known

---

# PROTECTED SYSTEMS (DO NOT BREAK)

These systems are CRITICAL and any changes require extra caution:

| System | Impact | Last Known Working |
|--------|--------|-------------------|
| Authentication/Login | All users | v360 |
| Employee Clock In/Out | Daily operations | v360 |
| Chef Ordering | Revenue | v360 |
| API Core (doGet routing) | Everything | v360 |

**If any of these break, IMMEDIATE rollback.**

---

# DEPLOYMENT HIERARCHY

```
            OWNER (Don)
                |
         PM_ARCHITECT (Me)
         [Final Approval]
                |
     +----------+----------+
     |          |          |
  Backend    Desktop    Mobile
  Claude     Claude     Claude
```

## Approval Flow

1. **Feature Request** → PM_Architect receives
2. **Delegation** → PM assigns to appropriate Claude
3. **Development** → Claude develops, tests locally
4. **Report** → Claude writes to OUTBOX.md
5. **Review** → PM reviews changes
6. **Approval** → PM authorizes deployment
7. **Deploy** → Backend Claude deploys (or PM directly)
8. **Verify** → PM confirms production working
9. **Document** → Version logged in deployment history

---

# SAFE DEVELOPMENT PRACTICES

## Building New Features

1. **Build in isolation** - New functions should not affect existing ones
2. **Add, don't replace** - Add new endpoints, don't modify working ones
3. **Test before connect** - API endpoints tested before HTML calls them
4. **Feature flags** - Major features can be toggled off if problematic

## Fixing Bugs

1. **Identify scope** - What does this function touch?
2. **Test impact** - Will fix break anything else?
3. **Minimal change** - Smallest fix that solves the problem
4. **Verify original** - Confirm original functionality still works

## Refactoring

1. **DO NOT refactor production code during active development**
2. **Schedule refactoring during low-usage hours**
3. **Always have rollback ready**
4. **Test exhaustively before deploy**

---

# ROLLBACK PROCEDURES

## Apps Script Rollback (Immediate)

```bash
# Current Production
CURRENT_VERSION="AKfycbxy5DlsDXGwulhRNIHiD7q7sHQbN9kResVkR5YPXF2Z2IzgahVE9i38v063s4scAWMp"

# List all deployments to find previous
PATH="/opt/homebrew/bin:$PATH" clasp deployments

# Deploy to previous version (replace ID)
PATH="/opt/homebrew/bin:$PATH" clasp deploy -i "PREVIOUS_DEPLOYMENT_ID" -d "ROLLBACK: Reason"
```

## GitHub Pages Rollback

```bash
cd /Users/samanthapollack/Documents/TIny_Seed_OS

# Revert last commit
git revert HEAD --no-edit
git push origin main

# Or revert to specific commit
git revert COMMIT_HASH --no-edit
git push origin main
```

---

# VERSION TRACKING

## Current Production Status

| Component | Version | Deploy Date | Status |
|-----------|---------|-------------|--------|
| Apps Script API | v360 | 2026-01-23 | WORKING |
| Main Dashboard | GitHub | 2026-01-22 | WORKING |
| Employee App | GitHub | 2026-01-22 | WORKING |
| Chef Portal | GitHub | 2026-01-22 | WORKING |

## Deployment History (Recent)

| Version | Date | Changes | Deployed By |
|---------|------|---------|-------------|
| v360 | 2026-01-23 | Fixed 3 logic errors | PM_Architect |
| v359 | 2026-01-23 | Fixed 7 duplicate functions | PM_Architect |
| v358 | 2026-01-22 | Overnight endpoint fixes | Backend Claude |

---

# COMMUNICATION PROTOCOL

## Owner → PM_Architect
- Claude Coordination page: `web_app/claude-coordination.html`
- Messages go directly to PM_Architect
- High priority items flagged for immediate attention

## PM_Architect → Other Claudes
- Write tasks to their INBOX.md
- Monitor their OUTBOX.md for completion
- Review before approving deployment

## Other Claudes → PM_Architect
- Report all changes to OUTBOX.md
- Request deployment approval
- Report any issues immediately

---

# EMERGENCY PROCEDURES

## If Production Breaks

1. **STOP** - Don't make more changes
2. **IDENTIFY** - What was last deployed?
3. **ROLLBACK** - Use rollback procedure above
4. **VERIFY** - Confirm production working
5. **INVESTIGATE** - What went wrong?
6. **FIX** - Fix in isolation, test thoroughly
7. **REDEPLOY** - Only after confirmed working

## Contact Chain

1. PM_Architect (me) - Primary responder
2. Owner (Don) - Notification for critical issues
3. Other Claudes - Support investigation

---

# KNOWLEDGE MANAGEMENT

## PM_Architect Maintains

| Document | Purpose | Location |
|----------|---------|----------|
| SYSTEM_MANIFEST.md | Complete system inventory | pm_architect/ |
| DEPLOYMENT_PROTOCOL.md | Deployment rules | pm_architect/ |
| GOVERNANCE.md | This document | pm_architect/ |
| MASTER_REPAIR_PLAN.md | Overall repair strategy | claude_sessions/ |

## All Claudes Check

At the START of every session:
1. Read your INBOX.md for new tasks
2. Check DEPLOYMENT_PROTOCOL.md for any updates
3. Follow file ownership rules
4. Report all work to OUTBOX.md

---

# QUALITY STANDARDS

## Code Quality

- No hardcoded API keys
- No demo data fallbacks in production
- Proper error handling
- Consistent response formats
- Documentation for new functions

## Testing Requirements

- API endpoints tested with curl
- HTML pages tested in browser
- Mobile pages tested on actual device (or responsive mode)
- No console errors
- All buttons/forms functional

---

# AUDIT TRAIL

Every deployment must be traceable:

1. **What changed** - Documented in OUTBOX.md
2. **Who changed it** - Claude name in commit message
3. **When changed** - Timestamp in deployment
4. **Why changed** - Description of purpose
5. **How to undo** - Rollback procedure documented

---

**This governance document is law. All Claudes must comply.**

*PM_Architect Claude - January 23, 2026*
