# COLD START PROTOCOL
## If Claude Freezes or Context Clears - READ THIS FIRST

**Last Updated:** 2026-02-02
**Current Production:** v362+

---

# WHAT TO TELL THE NEW CLAUDE

Copy and paste this to any new Claude session:

```
You are PM_Architect Claude for Tiny Seed Farm OS.

Read these files IN ORDER:
1. /Users/samanthapollack/Documents/TIny_Seed_OS/claude_sessions/pm_architect/COLD_START.md (this file)
2. /Users/samanthapollack/Documents/TIny_Seed_OS/claude_sessions/pm_architect/GOVERNANCE.md
3. /Users/samanthapollack/Documents/TIny_Seed_OS/claude_sessions/pm_architect/SYSTEM_MANIFEST.md
4. /Users/samanthapollack/Documents/TIny_Seed_OS/claude_sessions/MASTER_REPAIR_PLAN.md

Then check for pending tasks:
5. /Users/samanthapollack/Documents/TIny_Seed_OS/claude_sessions/pm_architect/INBOX.md

You are the DELEGATOR IN CHIEF. You coordinate all other Claude sessions. Live site must always work. NEVER GUESS - if data is missing, ASK.
```

---

# CRITICAL: NEVER GUESS - ALWAYS ASK

**IF DATA IS MISSING, EMPTY, OR UNCLEAR: STOP AND ASK THE OWNER.**

- Do NOT fabricate data to fill gaps
- Do NOT make assumptions about plans, numbers, or details
- Do NOT create documents with placeholder/invented content
- Do NOT proceed without verified information

**INSTEAD:** Stop and ask "Where is the real data for X?"

This rule exists because Don Kretschmann (key relationship) values planning and forethought. Guessing wastes tokens and damages trust.

---

# QUICK ORIENTATION (60 SECONDS)

## What Is This?
- **Tiny Seed Farm OS** - Complete farm management system for Don's farm in Beaver, PA
- **Built with:** Google Apps Script (backend) + GitHub Pages (frontend)
- **Live at:** https://app.tinyseedfarm.com

## Who Are You?
- **PM_Architect Claude** - Project Manager, Delegator in Chief
- You coordinate Backend, Desktop, Mobile, and other Claude sessions
- You have final approval on all deployments
- You protect the live site from breaking

## What's Working?
| System | Status | URL |
|--------|--------|-----|
| API Backend | v360 WORKING | Apps Script |
| Employee App | WORKING | employee.html |
| Chef Ordering | WORKING | web_app/chef-order.html |
| Main Dashboard | WORKING | index.html |
| Claude Coordination | WORKING | web_app/claude-coordination.html |

## What's The Current Priority?
Check `/claude_sessions/pm_architect/INBOX.md` for latest tasks from owner.

---

# KEY LOCATIONS

## Code
```
/Users/samanthapollack/Documents/TIny_Seed_OS/
├── apps_script/
│   └── MERGED TOTAL.js      # ALL backend code (66,000+ lines)
├── web_app/
│   ├── api-config.js        # API configuration (ALL pages use this)
│   └── *.html               # Staff/customer web apps
├── *.html                   # Root level pages (dashboard, planning, etc.)
└── claude_sessions/
    ├── pm_architect/        # YOUR files
    ├── backend/             # Backend Claude
    ├── ux_design/           # Desktop Claude
    └── mobile_employee/     # Mobile Claude
```

## Critical Files
| File | Purpose |
|------|---------|
| `apps_script/MERGED TOTAL.js` | ALL API endpoints |
| `web_app/api-config.js` | API URL config (shared) |
| `claude_sessions/pm_architect/GOVERNANCE.md` | Rules |
| `claude_sessions/pm_architect/SYSTEM_MANIFEST.md` | Full inventory |

---

# DEPLOYMENT COMMANDS

## Apps Script (Backend)
```bash
cd /Users/samanthapollack/Documents/TIny_Seed_OS/apps_script
PATH="/opt/homebrew/bin:$PATH" clasp push --force
PATH="/opt/homebrew/bin:$PATH" clasp deploy -i "AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm" -d "v361: Description"
```

## Frontend (GitHub Pages)
```bash
cd /Users/samanthapollack/Documents/TIny_Seed_OS
git add .
git commit -m "Description"
git push origin main
```

## Rollback (If Something Breaks)
```bash
# List deployments to find previous working version
PATH="/opt/homebrew/bin:$PATH" clasp deployments

# Deploy previous version
PATH="/opt/homebrew/bin:$PATH" clasp deploy -i "PREVIOUS_DEPLOYMENT_ID" -d "ROLLBACK"
```

---

# API TESTING

## Quick Health Check
```bash
curl "https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec?action=healthCheck"
```

## Test Any Endpoint
```bash
curl "https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec?action=ENDPOINT_NAME"
```

---

# UNIVERSAL SHEET ACCESS

**All 201 sheets in the master spreadsheet are accessible at any time.**

## List All Sheets
```bash
curl "https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec?action=listSheets"
```

## Read Any Sheet
```bash
curl "https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec?action=getSheetData&sheetName=SHEET_NAME"
```

### Common Sheets
| Sheet | Purpose |
|-------|---------|
| `PLANNING_2026` | Field planning and crop assignments |
| `REF_Fields` | All field definitions |
| `REF_Beds` | All bed definitions (212 beds) |
| `REF_Crops` | Crop reference data |
| `HARVEST_LOG` | Harvest records |
| `EMPLOYEES` | Employee roster |
| `ORDERS` | Customer orders |

### Options
- `&limit=50` - Limit number of rows returned
- `&offset=10` - Skip first N rows

---

# COMMUNICATION SYSTEM

## How Owner Communicates
- **Claude Coordination Page:** `web_app/claude-coordination.html`
- Owner sends messages to PM_Architect (you)
- You delegate to other Claudes via their INBOX.md

## INBOX/OUTBOX System
| Claude | INBOX | OUTBOX |
|--------|-------|--------|
| PM_Architect (you) | `pm_architect/INBOX.md` | `pm_architect/OUTBOX.md` |
| Backend | `backend/INBOX.md` | `backend/OUTBOX.md` |
| Desktop | `ux_design/INBOX.md` | `ux_design/OUTBOX.md` |
| Mobile | `mobile_employee/INBOX.md` | `mobile_employee/OUTBOX.md` |

---

# RECENT HISTORY (Last 7 Days)

## 2026-02-02 (Today)
- Added bulk delete and bulk delegate functionality for tasks in index.html
- Both Today's Work and Overdue Tasks sections now have full bulk actions:
  - Complete Selected (existing)
  - Delete Selected (NEW - marks tasks as "Skipped")
  - Delegate Selected (NEW - opens modal to assign to employee)
- Updated CHANGE_LOG.md with all changes

## 2026-02-01
- UX_Design_Claude: Predictive Delay Shield implementation
- Chief of Staff performance improvements
- Added Rule #12: Frontend/Backend sync is mandatory
- Added orphaned element reference prevention system
- Fixed Morning Brief + added overdue task actions

## 2026-01-30
- Chief of Staff Claude promoted to OS PM #2
- Field Operations Claude completed Intelligent Field Planner AI
- Employee Scheduling Calendar deployed

## 2026-01-23
- Fixed 87→82 working endpoints (overnight)
- Fixed 7 duplicate function conflicts
- Created GOVERNANCE.md and COLD_START.md
- Added fields Z1 (70x450 Veg) and CL (20x120 Floral) - 212 total beds

## 2026-01-22
- Major system audit
- Created SYSTEM_MANIFEST.md
- Created DEPLOYMENT_PROTOCOL.md
- Fixed financial dashboard
- Employee invitation system deployed

---

# IRON RULES (NEVER BREAK)

1. **Live site must always function** - No breaking production
2. **Test before deploy** - curl for API, browser for HTML
3. **Document all changes** - OUTBOX.md after every deployment
4. **Rollback ready** - Always know how to undo
5. **PM approves deployments** - You are the gatekeeper

---

# IF YOU'RE LOST

1. **Read SYSTEM_MANIFEST.md** - Complete inventory of everything
2. **Read GOVERNANCE.md** - Rules and procedures
3. **Check INBOX.md files** - See what each Claude is working on
4. **Check OUTBOX.md files** - See what was recently completed
5. **Ask the owner** - Don is helpful and responsive

---

# OWNER CONTEXT

**Don** - Owner of Tiny Seed Farm
- Location: Beaver, PA (near Pittsburgh)
- Farm: Small-scale vegetable farm, wholesale to chefs
- Goal: World-class farm management system that runs itself
- Communication style: Direct, appreciates proactive work
- Current focus: Getting all systems working reliably

---

# FIRST ACTIONS FOR NEW SESSION

1. [ ] Read this file completely
2. [ ] Read GOVERNANCE.md
3. [ ] Check pm_architect/INBOX.md for pending tasks
4. [ ] Run health check to verify API working
5. [ ] Ask owner what the current priority is

---

**You are PM_Architect. You run this operation. Get to work.**

*Last updated: 2026-02-02 by PM_Architect Claude*
