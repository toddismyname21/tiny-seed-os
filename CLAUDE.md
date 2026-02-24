# CLAUDE.md — Tiny Seed Farm OS

These rules are loaded at session start. They are NON-NEGOTIABLE.

---

## Core Rules (PM_ARCHITECT Accountability)

1. **No background agents during active user interaction** — work WITH the user directly
2. **Verify before claiming done** — never trust "done" without evidence
3. **System health check at session start** — know the state before working
4. **Be honest about broken things** — never say "100% functional" without proof
5. **Know the system before user asks** — proactively identify issues
6. **Respond immediately** — don't let agents run 6+ minutes while user waits

---

## STEP 0: READ CONTEXT SNAPSHOT

Read `/tmp/TINYSEED_CONTEXT_SNAPSHOT.md` (backup: `CONTEXT_SNAPSHOT.md`) for session continuity.
Contains: recent commits, CHANGE_LOG entries, current status, key system info.

---

## STEP 0B: LOAD PM RULES

Read `.pm_rules.json` for enforceable rules.

### Critical Rules
| ID | Rule |
|----|------|
| NO_DUPLICATE_FILES | Search for existing similar files before creating ANY file |
| READ_BEFORE_EDIT | Must read a file before editing it |
| NO_HALLUCINATION | Never make up information — verify or ask |
| VERIFY_BEFORE_DONE | Test/verify changes before claiming done |
| CHECK_MANIFEST | Check SYSTEM_MANIFEST.md before building new features |
| UPDATE_CHANGELOG | Update CHANGE_LOG.md after modifications |
| DEPLOY_BOTH | Frontend changes need backend check, and vice versa |

### Pre-Flight Scripts
```bash
./scripts/pm-preflight.sh create <filename>    # Before creating files
./scripts/pm-preflight.sh deploy               # Before deploying
./scripts/pm-preflight.sh delete <target>      # Before deleting (CONFIRM WITH USER)
./scripts/pm-context-snapshot.sh               # Generate fresh context
```

---

## STEP 1: IDENTIFY YOUR ROLE

| Role | Scope | Files You Can Touch |
|------|-------|---------------------|
| **PM_Architect** | Coordination, architecture | Documentation, coordination files |
| **Backend_Claude** | Apps Script ONLY | `/apps_script/*.js` ONLY |
| **Desktop_Claude** | Desktop HTML | Root `.html`, `web_app/` admin files |
| **Mobile_Claude** | Mobile apps | Mobile `.html`, PWA manifests |
| **UX_Design_Claude** | Design system | CSS, design documentation |
| **Sales_Claude** | Sales features | Sales-related files only |
| **Security_Claude** | Auth, permissions | Auth files only |

Agent role definitions: `.claude/agents/*.md`

---

## STEP 2: CHECK CONFIGURATION

Before declaring anything "missing": check `tinypm/.env` and `claude_sessions/SYSTEM_STATUS.md`.

---

## STEP 3: CHECK MANIFEST BEFORE BUILDING

Read `claude_sessions/pm_architect/SYSTEM_MANIFEST.md` before creating ANY new file or function.
Contains every Apps Script file, HTML file, API endpoint, and their statuses.

---

## STEP 4: CHECK FOR DUPLICATES

Before adding ANY function, search for similar existing functions.

**Known duplicate systems — DO NOT CREATE ANOTHER:**
| System | Locations |
|--------|-----------|
| Morning Brief | 4 versions exist |
| Approval System | 2 versions exist |
| Email Processing | 3 versions exist |

---

## STEP 4B: SEARCH BEFORE CREATING HTML FILES

Run `Glob **/*[keyword]*.html` before creating ANY new `.html` file.

**EXISTING DASHBOARDS — DO NOT DUPLICATE:**
| Dashboard | Location |
|-----------|----------|
| SEO Dashboard | `web_app/seo_dashboard.html` |
| Chief of Staff | `apps_script/ChiefOfStaffDashboard.html` |
| Field Management | `apps_script/FieldManagementDashboard.html` |
| Financial Dashboard (Apps) | `apps_script/FinancialDashboard.html` |
| Financial Dashboard (Web) | `web_app/financial-dashboard.html` |
| Irrigation Dashboard | `apps_script/IrrigationDashboard.html` |
| Reports Dashboard | `apps_script/ReportsDashboard.html` |
| Routing Dashboard | `apps_script/IntelligentRoutingDashboard.html` |
| Manager Dashboard | `web_app/manager-dashboard.html` |
| PM Dashboard | `web_app/pm-dashboard.html` |
| QuickBooks Dashboard | `web_app/quickbooks-dashboard.html` |
| Remote Dashboard | `web_app/remote-dashboard.html` |
| TinyPM Dashboard | `tinypm/web_dashboard.html` |

---

## STEP 4C: PRE-FLIGHT CHECK

```bash
./scripts/pre-flight-check.sh <filename> <action> [agent]
# Exit 0 = proceed, 1 = caution, 2 = BLOCKED
```

Checks: duplicate detection, role boundary, high-risk actions, recent changes.

---

## STEP 4D: UX PREFLIGHT AUDIT (MANDATORY FOR ALL UI WORK)

**BEFORE creating or modifying ANY HTML/CSS/UI file, run the dynamic UX audit:**

```bash
# Run automated checks on your file:
./scripts/ux-preflight-audit.sh <filename.html>

# Run on all HTML files:
./scripts/ux-preflight-audit.sh --all

# View current rules and thresholds:
./scripts/ux-preflight-audit.sh --stats
./scripts/ux-preflight-audit.sh --thresholds

# Add a new rule (instructions):
./scripts/ux-preflight-audit.sh --add-rule
```

### Dynamic Rule Engine
Rules live in `config/ux_audit_rules.json` — NOT hardcoded in the script. To evolve the system:
- **Add rules:** Append to the `rules` array in the JSON
- **Update thresholds:** Change values in the `thresholds` object
- **Deprecate rules:** Set `"active": false` on outdated rules
- **Track evolution:** Add entries to `evolution_log`

### Quick Reference (from 14+ research documents):
- **Nav items:** 3-5 mobile, 5-7 desktop, 5 tabs max
- **Touch targets:** 44px min standard, 60px field mode, 72px gloved
- **Colors:** Use CSS variables only, no hardcoded hex. Primary green = `#22c55e`
- **Progressive disclosure:** Hide 80%, show 20%. Never show everything at once
- **Speed:** <100ms interactions, <3s page load, skeleton screens not spinners
- **Mobile:** Bottom tab bar (4 max), single column, 16px+ input font
- **Content:** Plain English labels, helpful error messages, encouraging empty states
- **Accessibility:** 4.5:1 contrast, ARIA labels, focus indicators, keyboard navigation

**Full reference: `docs/UX_PREFLIGHT_CHECKLIST.md`**
**Rules engine: `config/ux_audit_rules.json`**

---

## STEP 5: LOG YOUR CHANGES

After completing ANY work:
1. Update `CHANGE_LOG.md` (date, role, files, why)
2. Update your session's `OUTBOX.md`

See `docs/system/GOVERNOR_PROTOCOL.md` for optional Governor system logging.

---

## STEP 7: VERIFICATION BEFORE "DONE"

**No agent may declare "done" without passing verification gates.**

Mantra: Research → Check → Test → Audit → Confirm.

| Task Type | Required Verification |
|-----------|----------------------|
| Bug fix | Test execution + output captured |
| UI change | Screenshot or DOM verification |
| API change | curl response captured |
| Deployment | Live endpoint verification |
| File creation | File exists + parses correctly |

**DEPLOYED ≠ DONE.** The USER must verify functionality works.

Use `STATUS_ABSTAIN` when you cannot determine working status — never guess.

---

## FORBIDDEN ACTIONS

1. **NEVER** create a new file without checking SYSTEM_MANIFEST.md first
2. **NEVER** add demo/sample data fallbacks (show errors instead)
3. **NEVER** hardcode API URLs (use `api-config.js`)
4. **NEVER** touch files outside your role's scope
5. **NEVER** deploy without updating CHANGE_LOG.md
6. **NEVER** skip the duplicate check
7. **NEVER** create a new Morning Brief function (4 exist)
8. **NEVER** create a new Approval system (2 exist)
9. **NEVER** run `clasp deploy` without the `-i` flag
10. **NEVER** use any API URL other than the one in `api-config.js`
11. **NEVER** remove HTML elements without updating the JavaScript that references them
12. **NEVER** change frontend without checking the associated backend
13. **NEVER** create a new HTML file without searching for existing files first
14. **NEVER** create a new dashboard (SEO, Financial, Reports, Field, Irrigation ALL EXIST)

---

## FRONTEND + BACKEND SYNC

| If you change... | You MUST also check... |
|------------------|------------------------|
| HTML elements | Frontend JavaScript that references them |
| Frontend features | Apps Script functions that serve them |
| API response format | Frontend code that consumes it |
| Apps Script endpoints | Frontend code that calls them |

Validate with: `./scripts/validate-element-refs.sh <file>`

---

## EXTERNAL WEBSITE CHANGES (Shopify, etc.)

**NEVER PUBLISH WITHOUT HUMAN APPROVAL.** Full rules: `docs/system/EXTERNAL_SITE_RULES.md`

---

## API URL & DEPLOYMENT

### The One True API URL
```
Deployment ID: AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm
Full URL: https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec
```

### Usage
```html
<script src="web_app/api-config.js"></script>
<script>const API_URL = TINY_SEED_API.MAIN_API;</script>
```

### Deployment
```bash
clasp push
clasp deploy -i AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm -d "Description"
```
NEVER run bare `clasp deploy` (creates NEW deployment, breaks everything).

Validate: `./scripts/validate-api-urls.sh`

---

## KEY URLS

| Resource | URL |
|----------|-----|
| API Endpoint | `https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec` |
| Google Sheet | `128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc` |
| GitHub Pages | `https://toddismyname21.github.io/tiny-seed-os/` |

---

## QUICK REFERENCE FILES

| File | Purpose |
|------|---------|
| `CLAUDE.md` | This file — mandatory rules |
| `CHANGE_LOG.md` | Central change tracking |
| `claude_sessions/pm_architect/SYSTEM_MANIFEST.md` | Complete system inventory |
| `claude_sessions/pm_architect/CLAUDE_ROLES.md` | Role definitions |
| `claude_sessions/pm_architect/DEPLOYMENT_PROTOCOL.md` | How to deploy |
| `claude_sessions/CLAUDE_INTEGRATION_STANDARDS.md` | Coding standards |
| `.claude/agents/*.md` | Agent role definitions (6 agents) |
| `docs/system/EXTERNAL_SITE_RULES.md` | Shopify/external site rules |
| `docs/system/SESSION_CONTEXT.md` | Owner info, CSA stops, key files |
| `docs/system/SALES_PARSER.md` | Sales parser documentation |
| `docs/system/CHIEF_OF_STAFF_CONTEXT.md` | Chief of Staff backend context |
| `docs/system/GOVERNOR_PROTOCOL.md` | Governor system tracking |
| `docs/audits/CLAUDE_MD_VERIFICATION_AUDIT.md` | CLAUDE.md accuracy audit |

---

## VERIFICATION TOOLS

| Tool | Purpose |
|------|---------|
| `scripts/pre-flight-check.sh` | Pre-commit verification for new files |
| `scripts/ux-preflight-audit.sh` | Dynamic UX audit (reads rules from JSON) |
| `config/ux_audit_rules.json` | UX rules engine (33 rules, 42 thresholds) |
| `docs/UX_PREFLIGHT_CHECKLIST.md` | Human-readable UX reference checklist |
| `scripts/validate-element-refs.sh` | HTML/JS reference validation |
| `scripts/validate-api-urls.sh` | API URL consistency check |
| `scripts/governor_helpers.js` | Governor helper functions |
