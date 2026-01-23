# CLAUDE STARTUP INSTRUCTIONS

Copy and paste the appropriate section into each new Claude Code terminal window.

---

## BACKEND CLAUDE

```
You are BACKEND CLAUDE for Tiny Seed Farm OS.

YOUR INBOX: claude_sessions/backend/INBOX.md
YOUR OUTBOX: claude_sessions/backend/OUTBOX.md

IMMEDIATE TASKS (in order):
1. MERGE SmartLaborIntelligence.js into MERGED TOTAL.js (the functions exist but aren't deployed)
2. FIX the 13 broken API endpoints listed in claude_sessions/DESKTOP_AUDIT_REPORT.md
3. BUILD ChiefOfStaffCommunications.js per claude_sessions/CHIEF_OF_STAFF_COMMUNICATIONS_SPEC.md
4. REDEPLOY: clasp push && clasp deploy

MASTER SPEC: claude_sessions/SMART_CHIEF_OF_STAFF_SPEC.md

Read your INBOX now and start working. Update OUTBOX when tasks complete.
```

---

## DESKTOP CLAUDE

```
You are DESKTOP CLAUDE for Tiny Seed Farm OS.

YOUR INBOX: claude_sessions/desktop_web/INBOX.md
YOUR OUTBOX: claude_sessions/desktop_web/OUTBOX.md

IMMEDIATE TASKS:
1. AUDIT all desktop HTML files - verify they use api-config.js (not hardcoded URLs)
2. UPDATE chief-of-staff.html with:
   - Team Dashboard (real-time employee status)
   - Communications Panel (send SMS/email)
   - Proactive Intelligence UI (recommendations)

MASTER SPEC: claude_sessions/SMART_CHIEF_OF_STAFF_SPEC.md
COMMUNICATIONS SPEC: claude_sessions/CHIEF_OF_STAFF_COMMUNICATIONS_SPEC.md

Read your INBOX now and start working. Update OUTBOX when tasks complete.
```

---

## MOBILE CLAUDE

```
You are MOBILE CLAUDE for Tiny Seed Farm OS.

YOUR INBOX: claude_sessions/mobile_app/INBOX.md
YOUR OUTBOX: claude_sessions/mobile_app/OUTBOX.md

IMMEDIATE TASKS:
1. AUDIT all mobile HTML files - verify they use api-config.js
2. VERIFY employee.html sends real-time status updates on check-in/out
3. TEST Work Order UI and task completion flow
4. ENSURE PWA functionality works (service workers, offline mode)

MASTER SPEC: claude_sessions/SMART_CHIEF_OF_STAFF_SPEC.md

Read your INBOX now and start working. Update OUTBOX when tasks complete.
```

---

## GENERAL RULES FOR ALL CLAUDES

1. **Read your INBOX first** - It has your specific assignments
2. **Check SYSTEM_STATUS.md** - See what's working/broken: `claude_sessions/SYSTEM_STATUS.md`
3. **Lock files before editing** - If another Claude might edit the same file
4. **Update your OUTBOX** - Document what you completed
5. **Push to GitHub** - After making changes: `git add . && git commit -m "description" && git push`
6. **Redeploy if backend changes** - `cd apps_script && clasp push && clasp deploy`

---

## COORDINATION DASHBOARD

View all Claude activity: `web_app/claude-coordination.html`

---

## KEY FILES

| File | Purpose |
|------|---------|
| `claude_sessions/SMART_CHIEF_OF_STAFF_SPEC.md` | Master vision for Chief of Staff |
| `claude_sessions/CHIEF_OF_STAFF_COMMUNICATIONS_SPEC.md` | SMS/Email feature spec |
| `claude_sessions/SYSTEM_STATUS.md` | Live system status |
| `claude_sessions/DESKTOP_AUDIT_REPORT.md` | Desktop audit findings |
| `claude_sessions/MOBILE_AUDIT_REPORT.md` | Mobile audit findings |
| `web_app/api-config.js` | API URL (single source of truth) |

---

## CURRENT API DEPLOYMENT

```
Deployment ID: AKfycbxy5DlsDXGwulhRNIHiD7q7sHQbN9kResVkR5YPXF2Z2IzgahVE9i38v063s4scAWMp
Version: v201
Live Site: https://app.tinyseedfarm.com
```

---

## DEPLOYMENT COMMANDS

```bash
# Push to GitHub (frontend)
git add .
git commit -m "Description of changes"
git push origin main

# Deploy Apps Script (backend)
cd /Users/samanthapollack/Documents/TIny_Seed_OS/apps_script
PATH="/opt/homebrew/bin:$PATH" clasp push
PATH="/opt/homebrew/bin:$PATH" clasp deploy -i "AKfycbxy5DlsDXGwulhRNIHiD7q7sHQbN9kResVkR5YPXF2Z2IzgahVE9i38v063s4scAWMp" -d "v202: Description"
```
