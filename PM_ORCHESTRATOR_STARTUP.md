# PM ORCHESTRATOR STARTUP GUIDE
## Emergency Recovery & Session Restart

**Owner:** Todd Wilson
**Last Updated:** 2026-02-11
**Purpose:** Restore full PM Orchestrator functionality if terminal freezes or session ends

---

## QUICK START (Copy & Paste)

### Step 1: Open Terminal and Navigate
```bash
cd /Users/samanthapollack/Documents/TIny_Seed_OS
```

### Step 2: Start Claude Code
```bash
claude
```

### Step 3: Paste This Initialization Prompt
```
You are the SUPREME ORCHESTRATOR (PM_Architect) for Tiny Seed Farm OS.

READ THESE FILES IMMEDIATELY:
1. /Users/samanthapollack/Documents/TIny_Seed_OS/CLAUDE.md
2. /Users/samanthapollack/Documents/TIny_Seed_OS/AGENTIC_TEAM_CONFIGURATION.md
3. /Users/samanthapollack/Documents/TIny_Seed_OS/CHANGE_LOG.md (last 200 lines)

YOU HAVE FULL ACCESS TO:
- All files on this computer
- The internet (web search, API calls)
- Git repository (push/pull)
- Google Apps Script (clasp push/deploy)
- Shopify Admin API
- All social media APIs configured in the system

YOU ARE AUTHORIZED TO:
- Execute bash commands
- Modify any file in the codebase
- Deploy to production (Apps Script, GitHub Pages)
- Spawn parallel agent teams
- Act on behalf of the owner (Todd Wilson) for routine operations

CONFIDENCE THRESHOLDS:
- 95%+: Execute autonomously, notify after
- 85-95%: Execute and notify immediately
- 70-85%: Propose action, await approval
- <70%: Escalate with options

HIGH-RISK ACTIONS (always ask first):
- Shopify live updates
- External emails/social posts
- Deleting production data
- Financial transactions

Follow the Sovereign Production Blueprint v5.1.
Update CHANGE_LOG.md and governor files after significant work.

Confirm you're ready and show me the current system status.
```

---

## KEY SYSTEM INFORMATION

### API Endpoint
```
https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec
```

### Deployment ID
```
AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm
```

### Google Sheet ID
```
128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc
```

### GitHub Repository
```
https://github.com/toddismyname21/tiny-seed-os
```

### Shopify Store
```
tiny-seed-farmers-market.myshopify.com
```

---

## CRITICAL FILES

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Core rules and constraints |
| `AGENTIC_TEAM_CONFIGURATION.md` | Team architecture & protocols |
| `CHANGE_LOG.md` | What changed recently |
| `apps_script/MERGED TOTAL.js` | Main backend (120K+ lines) |
| `web_app/api-config.js` | API URL configuration |
| `claude_sessions/pm_architect/SYSTEM_MANIFEST.md` | Full system inventory |

---

## DEPLOYMENT COMMANDS

### Deploy Apps Script
```bash
cd /Users/samanthapollack/Documents/TIny_Seed_OS/apps_script
clasp push
clasp deploy -i AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm -d "Description"
```

### Push to GitHub
```bash
cd /Users/samanthapollack/Documents/TIny_Seed_OS
git add .
git commit -m "Description"
git push origin main
```

---

## OWNER INFORMATION

- **Name:** Todd Wilson
- **Email:** todd@tinyseedfarmpgh.com
- **Phone:** 717-725-5177
- **Farm Address:** 257 Zeigler Rd, Rochester, PA 15074

---

## INSTAGRAM ACCOUNTS (Connected)

1. **Tiny Seed Farm** (index 0) - Main farm account
2. **Tiny Seed Fleurs** (index 1) - Flower account
3. **Tiny Seed Fungi** (index 2) - Mushroom account

---

## RECENT FEATURES BUILT (2026-02-11)

1. **Smart Farm Intelligence System** - 8 phases, 12+ API endpoints
   - Yield predictions, variety rankings, bed recommendations
   - Succession gap analysis, risk scoring, revenue optimization
   - Intelligence dashboard

2. **Marketing Command Center**
   - Instagram multi-account posting
   - Farm Pics library with delete
   - Post type selection (Feed/Story/Reel)

3. **Planning.html**
   - All fields always editable
   - Variety dropdown with ALL varieties + Add New option

---

## IF THINGS GO WRONG

### Rollback Apps Script
```bash
# Find previous version number in deployment history
clasp deployments
# Rollback to specific version
clasp deploy -i AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm -v VERSION_NUMBER -d "Rollback"
```

### Rollback Git
```bash
# Undo last commit
git revert HEAD
git push origin main
```

### Check System Status
```bash
curl -sL "https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec?action=getIntelligenceDashboard"
```

---

## AGENT SPAWNING TEMPLATE

When you need parallel teams:
```
Launch these agents in parallel:
- Team 1: [task description]
- Team 2: [task description]
- Team 3: [task description]

Use subagent_type: "general-purpose" for implementation
Use subagent_type: "Explore" for research
```

---

## REMEMBER

1. **Read CLAUDE.md first** - Contains all rules
2. **Check CHANGE_LOG.md** - Know what changed recently
3. **Use parallel agents** - Don't block on tasks
4. **Stay available** - User should never wait
5. **Update logs after work** - CHANGE_LOG, governor files, OUTBOX
6. **Ask for high-risk actions** - Shopify, external comms, deletes

---

*This document ensures continuity of the PM Orchestrator role across sessions.*
