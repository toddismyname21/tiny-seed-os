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

## STEP 4B: MANDATORY SEARCH BEFORE CREATING HTML FILES

**BEFORE creating ANY new .html file, you MUST run these searches:**

```bash
# Search for existing files with similar names
Glob **/*[feature-keyword]*.html

# Example: Before creating "seo_dashboard.html"
Glob **/*seo*.html
Glob **/*dashboard*.html
```

**EXISTING DASHBOARDS - DO NOT DUPLICATE:**

| Dashboard | Location | Purpose |
|-----------|----------|---------|
| SEO Dashboard | `web_app/seo_dashboard.html` | SEO tracking & automation |
| Chief of Staff | `apps_script/ChiefOfStaffDashboard.html` | AI assistant interface |
| Field Management | `apps_script/FieldManagementDashboard.html` | Field operations |
| Financial Dashboard (Apps) | `apps_script/FinancialDashboard.html` | Financial reports |
| Financial Dashboard (Web) | `web_app/financial-dashboard.html` | Financial reports |
| Irrigation Dashboard | `apps_script/IrrigationDashboard.html` | Irrigation control |
| Reports Dashboard | `apps_script/ReportsDashboard.html` | USDA/Organic reports |
| Routing Dashboard | `apps_script/IntelligentRoutingDashboard.html` | Delivery routing |
| Manager Dashboard | `web_app/manager-dashboard.html` | Manager view |
| PM Dashboard | `web_app/pm-dashboard.html` | Project management |
| QuickBooks Dashboard | `web_app/quickbooks-dashboard.html` | Accounting integration |
| Remote Dashboard | `web_app/remote-dashboard.html` | Remote access |
| TinyPM Dashboard | `tinypm/web_dashboard.html` | TinyPM interface |

**If you find an existing file that matches your intent: ENHANCE IT. Do not create a new one.**

**VIOLATION LOG:**
- 2026-02-04: Created duplicate `apps_script/SEODashboard.html` when `web_app/seo_dashboard.html` already existed. Deleted after user caught it. THIS MUST NOT HAPPEN AGAIN.

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
13. **NEVER** create a new HTML file without first running `Glob **/*[keyword]*.html` to check for existing files
14. **NEVER** create a new dashboard - SEO, Financial, Reports, Field, Irrigation dashboards ALL EXIST (see Step 4B)

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

## CRITICAL: EXTERNAL WEBSITE CHANGES (Shopify, etc.)

### THE GOLDEN RULE: NEVER PUBLISH WITHOUT HUMAN APPROVAL

**This section exists because on 2026-02-04, wrong information was published to the live Shopify store including fake owner names, wrong addresses, and made-up content. THIS MUST NEVER HAPPEN AGAIN.**

Based on industry best practices from [n8n](https://blog.n8n.io/best-practices-for-deploying-ai-agents-in-production/), [Galileo AI](https://galileo.ai/blog/production-readiness-checklist-ai-agent-reliability), [MIT Sloan](https://sloanreview.mit.edu/article/agentic-ai-security-essentials/), and [AWS](https://aws.amazon.com/blogs/machine-learning/implement-human-in-the-loop-confirmation-with-amazon-bedrock-agents/).

---

### BEFORE ANY EXTERNAL WEBSITE CHANGE

#### Step 1: VERIFY YOU HAVE REAL INFORMATION
- [ ] Do I have CONFIRMED facts from the user? (not assumptions)
- [ ] If I'm missing information, have I ASKED the user?
- [ ] Am I using ANY placeholder text, fake names, or made-up details? **IF YES, STOP.**

**NEVER make up:**
- Names of people
- Addresses or locations
- Prices or dates
- Business history or stories
- Any factual claims

**If you don't know it, ASK. Do not guess. Do not hallucinate.**

#### Step 2: SHOW THE USER WHAT WILL CHANGE
Before pushing ANY content to an external website:
1. Show the EXACT content that will be published
2. Highlight what's NEW vs what's being REPLACED
3. Wait for explicit approval ("go ahead", "deploy it", "yes")

**Approval phrases that ARE permission:**
- "Yes"
- "Do it"
- "Go ahead"
- "Deploy"
- "Looks good, publish it"

**Phrases that are NOT permission:**
- "Sounds good" (needs explicit action word)
- "Ok" (ambiguous)
- "I think so" (uncertain)
- No response (silence is NOT consent)

#### Step 3: PRE-PUBLISH CHECKLIST
Before executing the publish command:

```
[ ] Content has been shown to user
[ ] User gave EXPLICIT approval
[ ] No placeholder/made-up content exists
[ ] All facts have been verified with user
[ ] I know how to ROLLBACK if needed
[ ] Old content has been saved/logged
```

---

### DURING PUBLISH

1. **Log the old content** - Save what was there before
2. **Execute the change** - Push the new content
3. **Verify immediately** - Fetch the live page to confirm

---

### AFTER PUBLISH

#### Mandatory Verification:
1. Fetch the live URL
2. Confirm the new content appears
3. Report any caching issues to user
4. If something is wrong, offer immediate rollback

#### If User Reports a Problem:
1. **STOP all other work**
2. Investigate immediately
3. Rollback if needed
4. Fix and re-verify

---

### CONTENT QUALITY RULES

#### NEVER publish content that:
- Contains unverified facts
- Uses placeholder text like "[INSERT NAME]" or "TBD"
- Makes claims about the business you haven't confirmed
- Includes personal/sensitive information without approval
- Has spelling or grammar errors (proofread first)

#### ALWAYS:
- Use simple, clear language
- Keep paragraphs short (3-5 sentences max)
- Mobile-friendly formatting
- Include clear calls-to-action
- Match the brand voice

---

### SHOPIFY-SPECIFIC RULES

#### Page Updates:
```javascript
// CORRECT WORKFLOW:
1. Fetch current page content
2. Show user what exists
3. Show user what will change
4. Get explicit approval
5. Update page
6. Verify update worked
7. Report cache timing to user

// WRONG:
- Updating without showing user first
- Assuming facts not provided
- Not verifying after publish
```

#### Product Changes:
- NEVER archive/delete products without explicit approval
- ALWAYS confirm product IDs before bulk operations
- Test with ONE item before batch operations

#### Known Shopify Cache Behavior:
- Pages cache for 2-5 minutes
- Add `?v=X` to URL to bypass cache for verification
- Inform user about cache delay

---

### EMERGENCY ROLLBACK PROCEDURE

If something goes wrong:
1. Have the old content saved (you logged it, right?)
2. Immediately offer to restore
3. Execute rollback on user approval
4. Verify restoration worked

---

### VIOLATION LOG

Track all external website mistakes here:

| Date | Issue | Root Cause | Prevention |
|------|-------|------------|------------|
| 2026-02-04 | Wrong owner names (Matt & Samantha instead of Todd) | Content was never verified with user | Added mandatory approval step |
| 2026-02-04 | Made-up trauma story published | AI hallucinated personal details | Added "no made-up content" rule |
| 2026-02-04 | Wrong farm location (Glenshaw instead of Rochester) | Old cached content, unverified | Added verification checklist |

---

### THE BOTTOM LINE

**Treat external websites like production databases:**
- Read before write
- Verify before commit
- Backup before change
- Test after deploy
- Human approval REQUIRED

**If in doubt, ASK. Never guess. Never hallucinate. Never assume.**

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

### Owner Contact Info
- **Name:** Todd Wilson
- **Email:** todd@tinyseedfarmpgh.com
- **Phone:** 717-725-5177
- **Business Address:** 257 Zeigler Rd, Rochester, PA 15074 (NEW)
- **Previous Address:** 4312 Middle Rd, Allison Park, PA 15101
- **Google Place ID:** ChIJtdEVcwuSNIgRojepG9lq66U
- **Service Area:** Pittsburgh metro, wide delivery area with neighborhood concentrations

### CSA Stop Locations (Current)
| Location | Pickup Type |
|----------|-------------|
| Rochester | Kretschmann Family Organic Farm |
| Allison Park | St. Paul's |
| Allison Park | Simon's Produce Stand |
| Sewickley | Saturday Farmer's Market |
| Oakmont | Today's Organic Market |
| Mt. Lebanon | CSA Customer Porch |
| Squirrel Hill | CSA Customer Porch |
| North Side | Mayfly Market |
| Lawrenceville | Tuesday Farmer's Market |
| Highland Park | Bryant St. Market |
| Bloomfield | Saturday Farmer's Market |
| Zelienople | CSA Customer Porch |
| North Park | CSA Customer Porch |
| Fox Chapel | CSA Customer Porch |
| Cranberry | CSA Customer Porch |

**Note:** New locations added with 15+ members at a location.
