# MANDATORY: READ BEFORE ANY WORK

## STOP. DO NOT PROCEED UNTIL YOU COMPLETE THESE STEPS.

This file is automatically read by Claude Code at the start of every session. These rules are NON-NEGOTIABLE.

---

## STEP 1: IDENTIFY YOUR ROLE

You MUST identify which Claude role you are operating as:

| Role | Scope | Files You Can Touch |
|------|-------|---------------------|
| **PM_Architect** | Coordination, architecture | Documentation, coordination files |
| **Backend_Claude** | Apps Script ONLY | `/apps_script/*.js` ONLY |
| **Desktop_Claude** | Desktop HTML | Root `.html`, `web_app/` admin files |
| **Mobile_Claude** | Mobile apps | Mobile `.html`, PWA manifests |
| **UX_Design_Claude** | Design system | CSS, design documentation |
| **Sales_Claude** | Sales features | Sales-related files only |
| **Security_Claude** | Auth, permissions | Auth files only |

**If unclear, ASK THE USER which role you should operate as.**

---

## STEP 2: CHECK CONFIGURATION STATUS (TinyPM)

**MANDATORY FOR TINYPM WORK:** Before declaring ANYTHING as "missing" or "blocking":

```bash
# Check what's actually configured
cat /Users/samanthapollack/Documents/TIny_Seed_OS/tinypm/.env | grep -v "^#" | grep "="

# Read the system status file
cat /Users/samanthapollack/Documents/TIny_Seed_OS/tinypm/SYSTEM_STATUS.md
```

**NEVER assume OAuth, Supabase, or API keys are missing without checking .env first!**
This caused hours of wasted work on 2026-01-31 when OAuth was already configured.

---

## STEP 3: CHECK THE MANIFEST BEFORE BUILDING ANYTHING

**MANDATORY:** Before creating ANY new file or function, check if it already exists.

Read: `claude_sessions/pm_architect/SYSTEM_MANIFEST.md`

This file contains:
- Every Apps Script file and its purpose
- Every HTML file and its status
- Every API endpoint
- What's working vs what's broken
- What's already built but disconnected

**IF YOU BUILD SOMETHING THAT ALREADY EXISTS, YOU ARE CREATING FRAGMENTATION.**

---

## STEP 4: CHECK FOR DUPLICATES

Before adding ANY function, search for similar functions:

```
Grep for: function name, similar keywords, related functionality
```

**Known duplicate systems that MUST NOT be duplicated further:**

| System | Locations | Action |
|--------|-----------|--------|
| Morning Brief | 4 versions exist | DO NOT CREATE ANOTHER |
| Approval System | 2 versions exist | DO NOT CREATE ANOTHER |
| Email Processing | 3 versions exist | DO NOT CREATE ANOTHER |

---

## STEP 5: LOG YOUR CHANGES

After completing ANY work, you MUST:

1. **Update CHANGE_LOG.md** in the root directory with:
   - Date
   - Your Claude role
   - Files created/modified
   - Functions added/changed
   - Why you made the change

2. **Update your session's OUTBOX.md** with a full report

---

## FORBIDDEN ACTIONS

### NEVER DO THESE THINGS:

1. **NEVER** create a new file without checking SYSTEM_MANIFEST.md first
2. **NEVER** add demo/sample data fallbacks (show errors instead)
3. **NEVER** hardcode API URLs (use api-config.js)
4. **NEVER** touch files outside your role's scope
5. **NEVER** deploy without updating CHANGE_LOG.md
6. **NEVER** skip the duplicate check
7. **NEVER** create a new Morning Brief function (4 already exist)
8. **NEVER** create a new Approval system (2 already exist)
9. **NEVER** run `clasp deploy` without the `-i` flag (creates NEW deployment)
10. **NEVER** use any API URL other than the one in api-config.js
11. **NEVER** remove HTML elements without also removing/updating the JavaScript that references them
12. **NEVER** change the frontend without checking/updating the associated backend (Apps Script)

---

## CRITICAL: FRONTEND + BACKEND SYNC RULE

**When you change the face, you MUST check the associated script.**

| If you change... | You MUST also check... |
|------------------|------------------------|
| HTML elements | Frontend JavaScript that references them |
| Frontend features | Apps Script functions that serve them |
| API response format | Frontend code that consumes it |
| Apps Script endpoints | Frontend code that calls them |

**Full audit scheduled: 2026-02-03**

---

## CRITICAL: HTML + JAVASCRIPT SYNC RULE

**When you remove HTML, you MUST also update the JavaScript.**

A pre-commit hook will BLOCK commits with orphaned references. Run this to check:

```bash
./scripts/validate-element-refs.sh index.html
```

### Example of the Bug This Prevents:

```html
<!-- REMOVED this HTML element -->
<!-- <div id="briefTemp">Loading...</div> -->

<script>
// But LEFT this JavaScript - CRASH!
document.getElementById('briefTemp').textContent = 'Hello';
</script>
```

**This caused a site-breaking bug on 2026-02-01. The pre-commit hook now blocks this.**

---

## CRITICAL: API URL & DEPLOYMENT RULES

### THE ONE TRUE API URL
```
Deployment ID: AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm
Full URL: https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec
```

### HOW TO USE API URLs IN HTML FILES
```html
<!-- CORRECT: Import api-config.js -->
<script src="web_app/api-config.js"></script>
<script>
    const API_URL = TINY_SEED_API.MAIN_API;
</script>

<!-- WRONG: Hardcoded URL - NEVER DO THIS -->
<script>
    const API_URL = 'https://script.google.com/macros/s/AKfycb.../exec';
</script>
```

### HOW TO DEPLOY APPS SCRIPT
```bash
# CORRECT: Update existing deployment
clasp push
clasp deploy -i AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm -d "Description"

# WRONG: Creates NEW deployment (breaks everything)
clasp deploy
```

### VALIDATION
Run before committing: `./scripts/validate-api-urls.sh`
Pre-commit hook is installed to block commits with wrong URLs.

---

## ENFORCEMENT CHECKLIST

Before starting work, confirm:

- [ ] I know which Claude role I am
- [ ] I have read SYSTEM_MANIFEST.md
- [ ] I have checked for existing similar functionality
- [ ] I understand what files I can and cannot touch

Before deploying, confirm:

- [ ] I updated CHANGE_LOG.md
- [ ] I updated my OUTBOX.md
- [ ] I did not create duplicates
- [ ] I did not add demo data fallbacks

---

## CRITICAL CONTEXT

### Chief of Staff Backend EXISTS But Is NOT Connected

12 backend modules are ALREADY BUILT in `/apps_script/`:
- ChiefOfStaff_Voice.js
- ChiefOfStaff_Memory.js
- ChiefOfStaff_Autonomy.js
- ChiefOfStaff_ProactiveIntel.js
- ChiefOfStaff_StyleMimicry.js
- ChiefOfStaff_Calendar.js
- ChiefOfStaff_Predictive.js
- ChiefOfStaff_SMS.js
- ChiefOfStaff_FileOrg.js
- ChiefOfStaff_Integrations.js
- ChiefOfStaff_MultiAgent.js
- EmailWorkflowEngine.js

**DO NOT REBUILD THESE. Connect them to the frontend instead.**

---

## KEY URLS

| Resource | URL |
|----------|-----|
| API Endpoint | `https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec` |
| Google Sheet | `128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc` |
| GitHub Pages | `https://toddismyname21.github.io/tiny-seed-os/` |

---

## IF YOU VIOLATE THESE RULES

The owner has explicitly stated they will stop all building until enforcement is in place. Violations cause:
- Wasted time and money
- System fragmentation
- Duplicate functionality
- Information falling through cracks

**FOLLOW THE RULES. NO EXCEPTIONS.**

---

## QUICK REFERENCE FILES

| File | Purpose |
|------|---------|
| `CLAUDE.md` | This file - mandatory rules |
| `CHANGE_LOG.md` | Central change tracking |
| `claude_sessions/pm_architect/SYSTEM_MANIFEST.md` | Complete system inventory |
| `claude_sessions/pm_architect/CLAUDE_ROLES.md` | Role definitions |
| `claude_sessions/pm_architect/DEPLOYMENT_PROTOCOL.md` | How to deploy |
| `claude_sessions/CLAUDE_INTEGRATION_STANDARDS.md` | Coding standards |

---

**This file was created to enforce system coherence after significant fragmentation was discovered. Respect it.**

---

## SESSION CONTEXT (For Reference)

### Primary API Endpoint
```
https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec
```

### Key Files
- `apps_script/MERGED TOTAL.js` - Main backend (50,000+ lines, 230+ endpoints)
- `web_app/api-config.js` - API configuration (USE THIS)
- `web_app/auth-guard.js` - Authentication

### Shopify Store
- Store: `tiny-seed-farmers-market.myshopify.com`
- Owner: Todd Wilson (todd@tinyseedfarmpgh.com)
